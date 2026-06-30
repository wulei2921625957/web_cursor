import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

export type PermissionMode = "auto" | "full_access" | "read_only"

export type LocalSandboxOptions = {
  enabled: boolean
  permissionMode: PermissionMode
}

export type CommandRisk = "high" | "low" | "medium"

export type PermissionDecision = "allow" | "deny" | "approval_required"

export type ShellPermissionRuleAction = "allow" | "deny" | "prompt"

export type ShellPermissionRule = {
  action: ShellPermissionRuleAction
  prefix: string
  reason?: string
}

export type ShellPermissionResult = {
  allowed: boolean
  decision: PermissionDecision
  message: string
  permissionMode: PermissionMode
  reason: string
  risk: CommandRisk
}

export type ShellApprovalRequest = {
  command: string
  cwd: string
  permission: ShellPermissionResult
  source: string
  workspaceRoot: string
}

export type ShellApprovalResult = {
  approved: boolean
  message?: string
  scope?: "once" | "session"
}

export type ShellApprovalHandler = (
  request: ShellApprovalRequest
) => Promise<ShellApprovalResult>

export type PermissionAuditEvent = {
  command?: string
  cwd: string
  decision: PermissionDecision
  event: string
  permissionMode: PermissionMode
  reason: string
  risk: CommandRisk
  source: string
  timestamp?: string
}

const AUDIT_DIR = ".coding-agent"
const AUDIT_FILE = "audit.log"

const HIGH_RISK_PATTERNS: Array<[RegExp, string]> = [
  [/\brm\s+(?:-[^\n;&|]*[rf]|-[^\n;&|]*r[^\n;&|]*f|-[^\n;&|]*f[^\n;&|]*r)\b/, "recursive force remove"],
  [/\bgit\s+reset\s+--hard\b/, "hard git reset"],
  [/\bgit\s+clean\s+-[^\n;&|]*[dfx]/, "git clean removes untracked files"],
  [/\bsudo\b/, "sudo command"],
  [/\b(?:chmod|chown)\s+-R\b/, "recursive ownership or mode change"],
  [/\b(?:curl|wget)\b[\s\S]*(?:\|\s*(?:sh|bash|zsh)|\b(?:sh|bash|zsh)\s+-c\b)/, "downloaded script execution"],
  [/\bdd\s+.*\bof=/, "raw disk write"],
  [/\b(?:mkfs|diskutil|shutdown|reboot)\b/, "system-level command"],
]

const MEDIUM_RISK_PATTERNS: Array<[RegExp, string]> = [
  [/\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|remove|update|upgrade)\b/, "dependency mutation"],
  [/\b(?:brew|apt|apt-get|pip|pipx|gem|cargo)\s+(?:install|remove|update|upgrade|add)\b/, "environment mutation"],
  [/\b(?:node|python|python3|ruby|perl)\s+-e\b/, "inline script execution"],
  [/\b(?:sed|perl)\s+-i\b/, "in-place file edit"],
  [/(?:^|[\s;&|])(?:>|>>)\s*\S+/, "shell redirection writes output"],
  [/\btee\s+\S+/, "tee writes output"],
  [/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve)\b/, "long-running development server"],
]

const LOW_RISK_PATTERNS: RegExp[] = [
  /^\s*(?:pwd|ls|dir)\b/,
  /^\s*(?:rg|grep|find|cat|head|tail)\b/,
  /^\s*sed\s+-n\b/,
  /^\s*git\s+(?:status|diff|log|show|branch|rev-parse|ls-files|grep)\b/,
  /^\s*(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:test|typecheck|lint|check)\b/,
  /^\s*(?:npm|pnpm|yarn|bun)\s+run\s+(?:test|typecheck|lint|check)\b/,
  /^\s*npx\s+tsc\b/,
]

export function normalizePermissionMode(
  value: unknown,
  fallback: PermissionMode = "auto"
): PermissionMode {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")

  if (normalized === "read_only" || normalized === "readonly") return "read_only"
  if (normalized === "auto") return "auto"
  if (normalized === "full_access" || normalized === "fullaccess" || normalized === "full") {
    return "full_access"
  }

  return fallback
}

export function permissionModeLabel(mode: PermissionMode) {
  if (mode === "read_only") return "只读"
  if (mode === "full_access") return "完全访问"
  return "自动"
}

export function createSandboxOptionsForPermissionMode(
  mode: PermissionMode,
  sandboxEnabled?: boolean
): LocalSandboxOptions {
  return {
    enabled: sandboxEnabled ?? mode !== "full_access",
    permissionMode: mode,
  }
}

export function sdkSandboxOptions(options: LocalSandboxOptions | undefined) {
  return options ? { enabled: options.enabled } : undefined
}

export function sdkAutoReviewEnabled(options: LocalSandboxOptions | undefined) {
  return options?.permissionMode === "auto"
}

export function sdkCustomToolsEnabled(options: LocalSandboxOptions | undefined) {
  return !options?.enabled && !sdkAutoReviewEnabled(options)
}

export function permissionInstructions(options: LocalSandboxOptions | undefined) {
  const mode = options?.permissionMode ?? "auto"
  const sdkSandbox = options?.enabled ? "enabled" : "disabled"
  const lines = [
    "Permission mode:",
    `- Current mode: ${mode} (${permissionModeLabel(mode)}).`,
    `- Cursor SDK sandbox: ${sdkSandbox}.`,
    "- This app enforces permissions for workspace_* tools when they are exposed, plus lifecycle hooks. SDK built-in tools are constrained by the SDK sandbox and SDK Auto-review when available.",
  ]

  if (mode === "read_only") {
    lines.push(
      "- Do not modify files, run shell commands, install packages, start servers, or execute hooks that mutate state.",
      "- Use read/search tools only and report what would need to change."
    )
  } else if (mode === "auto") {
    lines.push(
      "- Low-risk read and validation shell commands are allowed.",
      "- Medium or high-risk workspace_shell commands require user approval in the UI.",
      "- SDK built-in local tool calls use Cursor SDK Auto-review when the connected backend supports it.",
      "- Prefer narrow commands in the active workspace."
    )
  } else {
    lines.push(
      "- Full Access allows workspace shell and hooks through this app, but dangerous commands are still audited.",
      "- Preserve unrelated user work and avoid destructive commands unless explicitly requested."
    )
  }

  return lines.join("\n")
}

export function evaluateShellPermission({
  command,
  cwd,
  permissions,
  rules,
  source,
  workspaceRoot,
}: {
  command: string
  cwd: string
  permissions?: LocalSandboxOptions
  rules?: ShellPermissionRule[]
  source: string
  workspaceRoot: string
}): ShellPermissionResult {
  const mode = permissions?.permissionMode ?? "auto"
  const classification = classifyShellCommand(command)
  const insideWorkspace = isInsidePath(workspaceRoot, cwd)
  const rule = findShellPermissionRule(command, rules)

  if (!insideWorkspace) {
    return permissionResult({
      decision: "deny",
      mode,
      reason: "working directory is outside the active workspace",
      risk: "high",
      source,
    })
  }

  if (rule?.action === "deny") {
    return permissionResult({
      decision: "deny",
      mode,
      reason: rule.reason || `permission rule denies prefix "${rule.prefix}"`,
      risk: classification.risk,
      source,
    })
  }

  if (mode === "read_only") {
    return permissionResult({
      decision: "deny",
      mode,
      reason: "read-only mode blocks shell commands",
      risk: classification.risk,
      source,
    })
  }

  if (rule?.action === "prompt") {
    return permissionResult({
      decision: "approval_required",
      mode,
      reason: rule.reason || `permission rule requires approval for prefix "${rule.prefix}"`,
      risk: classification.risk,
      source,
    })
  }

  if (mode === "full_access") {
    return permissionResult({
      decision: "allow",
      mode,
      reason:
        rule?.action === "allow"
          ? rule.reason || `permission rule allows prefix "${rule.prefix}"`
          : classification.reason,
      risk: classification.risk,
      source,
    })
  }

  if (rule?.action === "allow" || classification.risk === "low") {
    return permissionResult({
      decision: "allow",
      mode,
      reason:
        rule?.action === "allow"
          ? rule.reason || `permission rule allows prefix "${rule.prefix}"`
          : classification.reason,
      risk: classification.risk,
      source,
    })
  }

  return permissionResult({
    decision: "approval_required",
    mode,
    reason: classification.reason,
    risk: classification.risk,
    source,
  })
}

export function readShellPermissionRules(workspaceRoot: string): ShellPermissionRule[] {
  return [
    ...readShellPermissionRulesFile(path.join(os.homedir(), ".coding-agent", "permissions.json")),
    ...readShellPermissionRulesFile(
      path.join(path.resolve(workspaceRoot), ".coding-agent", "permissions.json")
    ),
  ]
}

export function normalizeShellPermissionRules(value: unknown): ShellPermissionRule[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return []
  }

  const record = value as Record<string, unknown>
  const rules: ShellPermissionRule[] = []
  const shellRules = Array.isArray(record.shellRules) ? record.shellRules : []
  for (const item of shellRules) {
    const rule = normalizeShellPermissionRule(item)
    if (rule) rules.push(rule)
  }

  if (record.shell && typeof record.shell === "object" && !Array.isArray(record.shell)) {
    const shell = record.shell as Record<string, unknown>
    for (const action of ["deny", "prompt", "allow"] as const) {
      const prefixes = Array.isArray(shell[action]) ? shell[action] : []
      for (const prefix of prefixes) {
        if (typeof prefix === "string" && prefix.trim()) {
          rules.push({ action, prefix: prefix.trim() })
        }
      }
    }
  }

  return rules
}

function readShellPermissionRulesFile(filePath: string) {
  if (!existsSync(filePath)) {
    return []
  }

  try {
    return normalizeShellPermissionRules(JSON.parse(readFileSync(filePath, "utf8")))
  } catch {
    return []
  }
}

function normalizeShellPermissionRule(value: unknown): ShellPermissionRule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const record = value as Record<string, unknown>
  const action = normalizeShellPermissionRuleAction(record.action)
  const prefix = typeof record.prefix === "string" ? record.prefix.trim() : ""
  if (!action || !prefix) {
    return null
  }

  const reason = typeof record.reason === "string" ? record.reason.trim() : ""
  return reason ? { action, prefix, reason } : { action, prefix }
}

function normalizeShellPermissionRuleAction(
  value: unknown
): ShellPermissionRuleAction | null {
  const action = String(value ?? "")
    .trim()
    .toLowerCase()
  if (action === "allow" || action === "deny" || action === "prompt") {
    return action
  }
  return null
}

function findShellPermissionRule(
  command: string,
  rules: ShellPermissionRule[] | undefined
) {
  const normalized = command.trim().replace(/\s+/g, " ")
  return (rules ?? []).find((rule) => normalized.startsWith(rule.prefix))
}

export function classifyShellCommand(command: string): {
  reason: string
  risk: CommandRisk
} {
  const text = command.trim()
  const normalized = text.replace(/\s+/g, " ")

  if (!normalized) {
    return { reason: "empty command", risk: "high" }
  }

  for (const [pattern, reason] of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalized)) {
      return { reason, risk: "high" }
    }
  }

  for (const [pattern, reason] of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(normalized)) {
      return { reason, risk: "medium" }
    }
  }

  if (LOW_RISK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { reason: "low-risk read or validation command", risk: "low" }
  }

  return { reason: "unclassified shell command", risk: "medium" }
}

export function appendPermissionAuditLog(
  workspaceRoot: string,
  event: PermissionAuditEvent
) {
  const root = path.resolve(workspaceRoot)
  const dir = path.join(root, AUDIT_DIR)
  const file = path.join(dir, AUDIT_FILE)
  mkdirSync(dir, { mode: 0o700, recursive: true })
  const record = {
    ...event,
    cwd: path.resolve(event.cwd),
    timestamp: event.timestamp ?? new Date().toISOString(),
  }
  appendFileSync(file, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 })
}

function permissionResult({
  decision,
  mode,
  reason,
  risk,
  source,
}: {
  decision: PermissionDecision
  mode: PermissionMode
  reason: string
  risk: CommandRisk
  source: string
}): ShellPermissionResult {
  const allowed = decision === "allow"
  const prefix = allowed
    ? "Allowed"
    : decision === "deny"
      ? "Blocked"
      : "Approval required"
  return {
    allowed,
    decision,
    message: `${prefix} by ${mode} permission mode for ${source}: ${reason}.`,
    permissionMode: mode,
    reason,
    risk,
  }
}

function isInsidePath(root: string, target: string) {
  const relative = path.relative(path.resolve(root), path.resolve(target))
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}
