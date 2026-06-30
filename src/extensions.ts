import { execFileSync } from "node:child_process"
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import type { McpServerConfig } from "@cursor/sdk"
import {
  appendPermissionAuditLog,
  evaluateShellPermission,
  readShellPermissionRules,
  type LocalSandboxOptions,
} from "./permissions.js"

export type ExtensionRuntime = {
  hooks: HookDefinition[]
  instructions: string
  mcpPolicies: McpToolPolicy[]
  mcpServers: Record<string, McpServerConfig>
  sources: ExtensionSource[]
  warnings: string[]
}

export type ExtensionSource = {
  kind: "agents" | "skill" | "plugin" | "mcp" | "hook"
  label: string
  path?: string
}

export type ExtensionInventory = {
  configPath: string
  hooks: ExtensionInventoryItem[]
  mcpServers: ExtensionInventoryItem[]
  plugins: ExtensionInventoryItem[]
  skills: ExtensionInventoryItem[]
  warnings: string[]
}

export type ExtensionInventoryItem = {
  description?: string
  displayName?: string
  enabled: boolean
  label: string
  path?: string
  policySummary?: string
  source?: string
}

export type HookDefinition = {
  command?: string
  event: HookEvent
  matcher?: string
  source: string
  statusMessage?: string
  timeoutMs: number
  windowsCommand?: string
}

export type HookEvent = "PostRun" | "PreRun" | "UserPromptSubmit"

export type McpToolPolicyMode = "allow" | "deny" | "prompt"

export type McpToolPolicy = {
  allow: string[]
  defaultMode?: McpToolPolicyMode
  deny: string[]
  prompt: string[]
  server: string
  serverDenied: boolean
}

type SkillDefinition = {
  description: string
  name: string
  path: string
}

type ExtensionConfig = {
  disabledHooks?: unknown
  disabledMcpServers?: unknown
  disabledPlugins?: unknown
  disabledSkills?: unknown
  hooks?: unknown
  mcpPolicies?: unknown
  mcpServers?: unknown
  plugins?: unknown
}

const MAX_AGENTS_BYTES = 32 * 1024
const MAX_SKILL_BYTES = 24 * 1024
const MAX_SKILL_LIST_BYTES = 8 * 1024
const DEFAULT_HOOK_TIMEOUT_MS = 60_000

export function loadExtensionRuntime(cwd: string, prompt: string): ExtensionRuntime {
  const root = findGitRoot(cwd) ?? path.resolve(cwd)
  const warnings: string[] = []
  const sources: ExtensionSource[] = []
  const config = loadExtensionConfig(root, warnings)
  const disabled = normalizeExtensionDisabled(config)
  const projectInstructions = loadProjectInstructions(cwd, sources, warnings)
  const skills = discoverSkills(cwd, sources, warnings, disabled.skills)
  const activeSkills = selectActiveSkills(skills, prompt)
  const pluginRuntime = loadPlugins(root, config, sources, warnings, disabled.plugins)
  const mcpServers = {
    ...pluginRuntime.mcpServers,
    ...normalizeMcpServers(config.mcpServers, warnings),
  }
  const mcpPolicies = normalizeMcpPolicies(config.mcpPolicies, warnings)
  for (const name of disabled.mcpServers) {
    delete mcpServers[name]
  }
  for (const policy of mcpPolicies) {
    if (policy.serverDenied) {
      delete mcpServers[policy.server]
      warnings.push(`MCP server ${policy.server} disabled by mcpPolicies.`)
      continue
    }
    if (mcpPolicyRequiresPrompt(policy) && mcpServers[policy.server]) {
      warnings.push(
        `MCP policy for ${policy.server} uses prompt; SDK tool-call approvals are enforced through runtime instructions.`
      )
    }
  }
  for (const name of Object.keys(mcpServers)) {
    sources.push({ kind: "mcp", label: name })
  }

  const hooks = [
    ...pluginRuntime.hooks,
    ...normalizeHooks(config.hooks, "project extension config", warnings),
  ].filter((hook) => !isHookDisabled(hook, disabled.hooks))
  for (const hook of hooks) {
    sources.push({ kind: "hook", label: hook.event, path: hook.source })
  }

  return {
    hooks,
    instructions: renderRuntimeInstructions({
      activeSkills,
      mcpPolicies: mcpPolicies.filter((policy) => mcpServers[policy.server]),
      projectInstructions,
      skills,
      warnings,
    }),
    mcpPolicies,
    mcpServers,
    sources,
    warnings,
  }
}

export function getExtensionInventory(cwd: string): ExtensionInventory {
  const root = findGitRoot(cwd) ?? path.resolve(cwd)
  const warnings: string[] = []
  const config = loadExtensionConfig(root, warnings)
  const disabled = normalizeExtensionDisabled(config)
  const allSkills = discoverSkills(cwd, [], warnings, new Set())
  const plugins = discoverPluginDefinitions(root, config, warnings)
  const enabledPlugins = plugins.filter((plugin) => !disabled.plugins.has(plugin.id))
  const pluginRuntime = loadPlugins(root, config, [], warnings, disabled.plugins)
  const mcpServers = {
    ...pluginRuntime.mcpServers,
    ...normalizeMcpServers(config.mcpServers, warnings),
  }
  const mcpPolicies = normalizeMcpPolicies(config.mcpPolicies, warnings)
  const policyByServer = new Map(mcpPolicies.map((policy) => [policy.server, policy]))
  const hooks = [
    ...pluginRuntime.hooks,
    ...normalizeHooks(config.hooks, "project extension config", warnings),
  ]

  return {
    configPath: path.join(root, ".coding-agent", "extensions.json"),
    hooks: hooks.map((hook) => ({
      description: hook.event,
      displayName: hook.event,
      enabled: !isHookDisabled(hook, disabled.hooks),
      label: hookIdentity(hook),
      path: hook.source,
      source: hookCommandForCurrentPlatform(hook),
    })),
    mcpServers: Object.keys(mcpServers)
      .sort((left, right) => left.localeCompare(right))
      .map((name) => ({
        enabled:
          !disabled.mcpServers.has(name) && !policyByServer.get(name)?.serverDenied,
        label: name,
        policySummary: renderMcpPolicySummary(policyByServer.get(name)),
        source: enabledPlugins.some((plugin) => plugin.mcpServers.includes(name))
          ? "plugin"
          : "config",
      })),
    plugins: plugins.map((plugin) => ({
      description: plugin.description,
      enabled: !disabled.plugins.has(plugin.id),
      label: plugin.id,
      path: plugin.manifestFile,
      source: renderPluginInventorySource(plugin),
    })),
    skills: allSkills.map((skill) => ({
      description: skill.description,
      enabled: !disabled.skills.has(skill.name),
      label: skill.name,
      path: skill.path,
    })),
    warnings,
  }
}

export function runHooks(
  hooks: HookDefinition[],
  event: HookEvent,
  payload: Record<string, unknown>,
  cwd: string,
  onStatus?: (message: string) => void,
  sandboxOptions?: LocalSandboxOptions
) {
  const matching = hooks.filter(
    (hook) => hook.event === event && hookCommandForCurrentPlatform(hook)
  )
  for (const hook of matching) {
    if (hook.statusMessage) {
      onStatus?.(hook.statusMessage)
    }
    const command = hookCommandForCurrentPlatform(hook)
    if (!command) {
      continue
    }
    const permission = evaluateShellPermission({
      command,
      cwd,
      permissions: sandboxOptions,
      rules: readShellPermissionRules(cwd),
      source: `hook:${event}`,
      workspaceRoot: cwd,
    })
    appendPermissionAuditLog(cwd, {
      command,
      cwd,
      decision: permission.decision,
      event: `hook:${event}`,
      permissionMode: permission.permissionMode,
      reason: permission.reason,
      risk: permission.risk,
      source: hook.source,
    })
    if (!permission.allowed) {
      throw new Error(permission.message)
    }
    runHookCommand(hook, payload, cwd)
  }
}

function loadProjectInstructions(
  cwd: string,
  sources: ExtensionSource[],
  warnings: string[]
) {
  const files = discoverAgentInstructionFiles(cwd)
  const parts: string[] = []
  let remainingBytes = MAX_AGENTS_BYTES

  for (const file of files) {
    if (remainingBytes <= 0) {
      break
    }

    try {
      const content = readFileSync(file)
      const slice = content.subarray(0, remainingBytes)
      remainingBytes -= slice.length
      sources.push({ kind: "agents", label: path.basename(file), path: file })
      parts.push(
        `Source: ${path.relative(cwd, file) || path.basename(file)}`,
        slice.toString("utf8").trim()
      )
    } catch (error) {
      warnings.push(`Failed to read ${file}: ${getErrorMessage(error)}`)
    }
  }

  return parts.filter(Boolean).join("\n\n")
}

function discoverAgentInstructionFiles(cwd: string) {
  const root = findGitRoot(cwd) ?? path.resolve(cwd)
  const dirs = directoriesFromRoot(root, path.resolve(cwd))
  const files: string[] = []

  for (const dir of dirs) {
    const overrideFile = path.join(dir, "AGENTS.override.md")
    const agentsFile = path.join(dir, "AGENTS.md")
    if (isReadableFile(overrideFile)) {
      files.push(overrideFile)
    } else if (isReadableFile(agentsFile)) {
      files.push(agentsFile)
    }
  }

  return files
}

function discoverSkills(
  cwd: string,
  sources: ExtensionSource[],
  warnings: string[],
  disabledSkills: Set<string>
) {
  const roots = discoverSkillRoots(cwd)
  const skills: SkillDefinition[] = []
  const seen = new Set<string>()

  for (const root of roots) {
    for (const skillDir of listDirectories(root)) {
      const skillFile = path.join(skillDir, "SKILL.md")
      if (!isReadableFile(skillFile) || seen.has(skillFile)) {
        continue
      }
      seen.add(skillFile)
      const skill = parseSkill(skillFile, warnings)
      if (skill) {
        skills.push(skill)
        if (!disabledSkills.has(skill.name)) {
          sources.push({ kind: "skill", label: skill.name, path: skill.path })
        }
      }
    }
  }

  return skills
    .filter((skill) => !disabledSkills.has(skill.name))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function discoverSkillRoots(cwd: string) {
  const root = findGitRoot(cwd) ?? path.resolve(cwd)
  const dirs = directoriesFromRoot(root, path.resolve(cwd))
  return [
    ...dirs.map((dir) => path.join(dir, ".agents", "skills")),
    path.join(os.homedir(), ".agents", "skills"),
  ]
}

function parseSkill(skillFile: string, warnings: string[]): SkillDefinition | null {
  try {
    const text = readFileSync(skillFile, "utf8")
    const metadata = parseFrontmatter(text)
    const name = metadata.name || path.basename(path.dirname(skillFile))
    const description = metadata.description || ""
    return { description, name, path: skillFile }
  } catch (error) {
    warnings.push(`Failed to parse skill ${skillFile}: ${getErrorMessage(error)}`)
    return null
  }
}

function selectActiveSkills(skills: SkillDefinition[], prompt: string) {
  const requested = new Set(
    Array.from(prompt.matchAll(/\$([A-Za-z0-9_-]+)/g), (match) => match[1])
  )
  return skills.filter(
    (skill) => requested.has(skill.name) || implicitSkillMatch(skill, prompt)
  )
}

function implicitSkillMatch(skill: SkillDefinition, prompt: string) {
  const normalizedPrompt = normalizeSkillText(prompt)
  if (!normalizedPrompt) {
    return false
  }

  const name = normalizeSkillText(skill.name)
  if (name && normalizedPrompt.includes(name)) {
    return true
  }

  const terms = new Set(
    normalizeSkillText(`${skill.name} ${skill.description}`)
      .split(/\s+/)
      .filter((term) => term.length >= 5)
  )
  let matches = 0
  for (const term of terms) {
    if (normalizedPrompt.includes(term)) {
      matches += 1
    }
    if (matches >= 2) {
      return true
    }
  }
  return false
}

function normalizeSkillText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

type PluginDefinition = {
  dependencies: string[]
  description: string
  id: string
  manifestFile: string
  mcpServers: string[]
  version: string
}

function discoverPluginDefinitions(
  root: string,
  config: ExtensionConfig,
  warnings: string[]
) {
  const pluginDirs = [
    ...normalizeStringList(config.plugins),
    ...listDirectories(path.join(root, ".coding-agent", "plugins")),
  ]
  const plugins: PluginDefinition[] = []
  const seen = new Set<string>()

  for (const rawDir of pluginDirs) {
    const dir = path.resolve(root, rawDir)
    const manifestFile = findPluginManifest(dir)
    if (!manifestFile || seen.has(manifestFile)) {
      continue
    }
    seen.add(manifestFile)

    try {
      const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<
        string,
        unknown
      >
      const id =
        typeof manifest.id === "string" && manifest.id.trim()
          ? manifest.id.trim()
          : path.basename(dir)
      const description =
        typeof manifest.description === "string" ? manifest.description.trim() : ""
      const version = typeof manifest.version === "string" ? manifest.version.trim() : ""
      plugins.push({
        dependencies: normalizePluginDependencies(manifest.dependencies),
        description,
        id,
        manifestFile,
        mcpServers: Object.keys(normalizeMcpServers(manifest.mcpServers, warnings)),
        version,
      })
    } catch (error) {
      warnings.push(`Failed to load plugin ${manifestFile}: ${getErrorMessage(error)}`)
    }
  }

  return plugins.sort((left, right) => left.id.localeCompare(right.id))
}

function normalizePluginDependencies(value: unknown) {
  if (Array.isArray(value)) {
    return sortUnique(value.map((item) => String(item || "")))
  }
  if (!value || typeof value !== "object") {
    return []
  }

  return sortUnique(
    Object.entries(value).map(([name, version]) => {
      const trimmed = name.trim()
      return typeof version === "string" && version.trim()
        ? `${trimmed}@${version.trim()}`
        : trimmed
    })
  )
}

function renderPluginInventorySource(plugin: PluginDefinition) {
  return [
    plugin.version ? `v${plugin.version}` : "",
    plugin.mcpServers.length > 0 ? `MCP ${plugin.mcpServers.length}` : "",
    plugin.dependencies.length > 0
      ? `deps ${plugin.dependencies.slice(0, 3).join(", ")}${
          plugin.dependencies.length > 3 ? ", ..." : ""
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" · ")
}

function findPluginManifest(pluginDir: string) {
  const candidates = [
    path.join(pluginDir, "plugin.json"),
    path.join(pluginDir, ".codex-plugin", "plugin.json"),
  ]
  return candidates.find(isReadableFile) ?? ""
}

function loadPlugins(
  root: string,
  config: ExtensionConfig,
  sources: ExtensionSource[],
  warnings: string[],
  disabledPlugins: Set<string>
) {
  const plugins = discoverPluginDefinitions(root, config, warnings)
  const hooks: HookDefinition[] = []
  const mcpServers: Record<string, McpServerConfig> = {}

  for (const plugin of plugins) {
    if (disabledPlugins.has(plugin.id)) {
      continue
    }

    try {
      const manifest = JSON.parse(readFileSync(plugin.manifestFile, "utf8")) as Record<
        string,
        unknown
      >
      sources.push({ kind: "plugin", label: plugin.id, path: plugin.manifestFile })
      Object.assign(mcpServers, normalizeMcpServers(manifest.mcpServers, warnings))
      hooks.push(...normalizeHooks(manifest.hooks, `plugin ${plugin.id}`, warnings))
    } catch (error) {
      warnings.push(`Failed to load plugin ${plugin.manifestFile}: ${getErrorMessage(error)}`)
    }
  }

  return { hooks, mcpServers }
}

function loadExtensionConfig(root: string, warnings: string[]): ExtensionConfig {
  const candidates = [
    path.join(root, "coding-agent.extensions.json"),
    path.join(root, ".coding-agent", "extensions.json"),
  ]
  for (const file of candidates) {
    if (!isReadableFile(file)) {
      continue
    }
    try {
      return JSON.parse(readFileSync(file, "utf8")) as ExtensionConfig
    } catch (error) {
      warnings.push(`Failed to load ${file}: ${getErrorMessage(error)}`)
    }
  }
  return {}
}

function normalizeMcpServers(value: unknown, warnings: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, McpServerConfig>
  }

  const servers: Record<string, McpServerConfig> = {}
  for (const [name, config] of Object.entries(value)) {
    if (!name || !config || typeof config !== "object" || Array.isArray(config)) {
      warnings.push(`Ignoring invalid MCP server entry ${name || "(empty)"}.`)
      continue
    }
    servers[name] = config as McpServerConfig
  }
  return servers
}

function normalizeExtensionDisabled(config: ExtensionConfig) {
  return {
    hooks: new Set(normalizeStringList(config.disabledHooks)),
    mcpServers: new Set(normalizeStringList(config.disabledMcpServers)),
    plugins: new Set(normalizeStringList(config.disabledPlugins)),
    skills: new Set(normalizeStringList(config.disabledSkills)),
  }
}

function isHookDisabled(hook: HookDefinition, disabledHooks: Set<string>) {
  return disabledHooks.has(hookIdentity(hook)) || disabledHooks.has(hook.event)
}

function hookIdentity(hook: HookDefinition) {
  return [
    hook.event,
    hook.source,
    hook.command ?? "",
    hook.windowsCommand ?? "",
  ].join("|")
}

function normalizeMcpPolicies(value: unknown, warnings: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [] as McpToolPolicy[]
  }

  const policies: McpToolPolicy[] = []
  for (const [server, rawPolicy] of Object.entries(value)) {
    if (!server.trim()) {
      warnings.push("Ignoring MCP policy with empty server name.")
      continue
    }

    const policy = normalizeMcpPolicy(server.trim(), rawPolicy, warnings)
    if (policy) {
      policies.push(policy)
    }
  }
  return policies.sort((left, right) => left.server.localeCompare(right.server))
}

function normalizeMcpPolicy(
  server: string,
  rawPolicy: unknown,
  warnings: string[]
): McpToolPolicy | null {
  if (rawPolicy === "deny") {
    return emptyMcpPolicy(server, true)
  }
  if (rawPolicy === "allow" || rawPolicy === "prompt") {
    return { ...emptyMcpPolicy(server, false), defaultMode: rawPolicy }
  }
  if (!rawPolicy || typeof rawPolicy !== "object" || Array.isArray(rawPolicy)) {
    warnings.push(`Ignoring invalid MCP policy for ${server}.`)
    return null
  }

  const record = rawPolicy as Record<string, unknown>
  const mode = normalizeMcpPolicyMode(record.mode)
  if (mode === "deny") {
    return emptyMcpPolicy(server, true)
  }

  const policy = {
    ...emptyMcpPolicy(server, false),
    defaultMode:
      normalizeMcpPolicyMode(record.defaultMode) ??
      normalizeMcpPolicyMode(record.default),
  }

  addToolsToMcpPolicy(policy, "allow", record.allow)
  addToolsToMcpPolicy(policy, "deny", record.deny)
  addToolsToMcpPolicy(policy, "prompt", record.prompt)
  addMcpToolsMapToPolicy(policy, record.tools, warnings)

  if (!policy.defaultMode && policy.allow.length > 0) {
    policy.defaultMode = "deny"
  } else if (!policy.defaultMode && mode) {
    policy.defaultMode = mode
  }

  policy.allow = sortUnique(policy.allow)
  policy.deny = sortUnique(policy.deny)
  policy.prompt = sortUnique(policy.prompt)
  return policy
}

function emptyMcpPolicy(server: string, serverDenied: boolean): McpToolPolicy {
  return {
    allow: [],
    deny: [],
    prompt: [],
    server,
    serverDenied,
  }
}

function addToolsToMcpPolicy(
  policy: McpToolPolicy,
  mode: McpToolPolicyMode,
  value: unknown
) {
  policy[mode].push(...normalizeStringList(value))
}

function addMcpToolsMapToPolicy(
  policy: McpToolPolicy,
  value: unknown,
  warnings: string[]
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return
  }

  for (const [tool, rawMode] of Object.entries(value)) {
    const name = tool.trim()
    const mode = normalizeMcpPolicyMode(rawMode)
    if (!name || !mode) {
      warnings.push(`Ignoring invalid MCP tool policy for ${policy.server}.${tool}.`)
      continue
    }
    policy[mode].push(name)
  }
}

function normalizeMcpPolicyMode(value: unknown): McpToolPolicyMode | undefined {
  return value === "allow" || value === "deny" || value === "prompt"
    ? value
    : undefined
}

function mcpPolicyRequiresPrompt(policy: McpToolPolicy) {
  return policy.defaultMode === "prompt" || policy.prompt.length > 0
}

function renderMcpPolicySummary(policy?: McpToolPolicy) {
  if (!policy) {
    return undefined
  }
  if (policy.serverDenied) {
    return "策略：server deny"
  }

  const parts = [
    policy.allow.length > 0 ? `allow ${policy.allow.length}` : "",
    policy.prompt.length > 0 ? `prompt ${policy.prompt.length}` : "",
    policy.deny.length > 0 ? `deny ${policy.deny.length}` : "",
    policy.defaultMode ? `default ${policy.defaultMode}` : "",
  ].filter(Boolean)
  return parts.length > 0 ? `策略：${parts.join(" / ")}` : undefined
}

function sortUnique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort(
    (left, right) => left.localeCompare(right)
  )
}

function normalizeHooks(
  value: unknown,
  source: string,
  warnings: string[]
): HookDefinition[] {
  if (!value || typeof value !== "object") {
    return []
  }

  const hooksRoot =
    "hooks" in (value as Record<string, unknown>)
      ? (value as Record<string, unknown>).hooks
      : value
  if (!hooksRoot || typeof hooksRoot !== "object" || Array.isArray(hooksRoot)) {
    return []
  }

  const hooks: HookDefinition[] = []
  for (const [eventName, rawEntries] of Object.entries(hooksRoot)) {
    if (!isHookEvent(eventName)) {
      continue
    }
    const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries]
    for (const entry of entries) {
      hooks.push(...normalizeHookEntry(eventName, entry, source, warnings))
    }
  }

  return hooks
}

function normalizeHookEntry(
  event: HookEvent,
  entry: unknown,
  source: string,
  warnings: string[]
) {
  if (!entry || typeof entry !== "object") {
    return []
  }

  const record = entry as Record<string, unknown>
  const nested = Array.isArray(record.hooks) ? record.hooks : null
  if (nested) {
    return nested.flatMap((hook) =>
      normalizeHookCommand(event, hook, source, warnings, record.matcher)
    )
  }
  return normalizeHookCommand(event, record, source, warnings)
}

function normalizeHookCommand(
  event: HookEvent,
  raw: unknown,
  source: string,
  warnings: string[],
  parentMatcher?: unknown
) {
  if (!raw || typeof raw !== "object") {
    return []
  }

  const record = raw as Record<string, unknown>
  const command = typeof record.command === "string" ? record.command.trim() : ""
  const windowsCommand =
    typeof record.windowsCommand === "string" ? record.windowsCommand.trim() : ""
  if (!command && !windowsCommand) {
    warnings.push(
      `Ignoring ${event} hook without command or windowsCommand from ${source}.`
    )
    return []
  }

  return [
    {
      command: command || undefined,
      event,
      matcher:
        typeof record.matcher === "string"
          ? record.matcher
          : typeof parentMatcher === "string"
            ? parentMatcher
            : undefined,
      source,
      statusMessage:
        typeof record.statusMessage === "string" ? record.statusMessage : undefined,
      timeoutMs: normalizeHookTimeout(record.timeout),
      windowsCommand: windowsCommand || undefined,
    },
  ]
}

function normalizeHookTimeout(value: unknown) {
  const seconds = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_HOOK_TIMEOUT_MS
  }
  return Math.min(Math.round(seconds * 1000), 10 * 60 * 1000)
}

function runHookCommand(
  hook: HookDefinition,
  payload: Record<string, unknown>,
  cwd: string
) {
  const input = JSON.stringify(payload)
  const command = hookCommandForCurrentPlatform(hook)
  if (!command) {
    return
  }

  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", command], {
      cwd,
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: hook.timeoutMs,
    })
    return
  }

  execFileSync("sh", ["-lc", command], {
    cwd,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: hook.timeoutMs,
  })
}

function hookCommandForCurrentPlatform(hook: HookDefinition) {
  return process.platform === "win32"
    ? hook.windowsCommand ?? hook.command
    : hook.command
}

function renderRuntimeInstructions({
  activeSkills,
  mcpPolicies,
  projectInstructions,
  skills,
  warnings,
}: {
  activeSkills: SkillDefinition[]
  mcpPolicies: McpToolPolicy[]
  projectInstructions: string
  skills: SkillDefinition[]
  warnings: string[]
}) {
  const parts: string[] = []
  if (projectInstructions.trim()) {
    parts.push("Project instruction files:", projectInstructions.trim())
  }

  const skillList = renderSkillList(skills)
  if (skillList) {
    parts.push(
      "Available skills:",
      skillList,
      "Use a skill when the user explicitly references it with $skill-name or when its description is clearly relevant."
    )
  }

  for (const skill of activeSkills) {
    const text = readSkillBody(skill.path)
    if (text) {
      parts.push(`Active skill $${skill.name}:`, text)
    }
  }

  const mcpPolicyInstructions = renderMcpPolicyInstructions(mcpPolicies)
  if (mcpPolicyInstructions) {
    parts.push(
      "MCP tool policies:",
      mcpPolicyInstructions,
      "Treat denied MCP tools as unavailable. For prompt MCP tools, ask the user for explicit confirmation before using them. Apply default policies to tools not listed by name."
    )
  }

  if (warnings.length > 0) {
    parts.push("Extension warnings:", warnings.join("\n"))
  }

  return parts.join("\n\n")
}

function renderMcpPolicyInstructions(policies: McpToolPolicy[]) {
  const lines: string[] = []
  for (const policy of policies) {
    const parts = [
      policy.allow.length > 0 ? `allow: ${policy.allow.join(", ")}` : "",
      policy.prompt.length > 0 ? `prompt: ${policy.prompt.join(", ")}` : "",
      policy.deny.length > 0 ? `deny: ${policy.deny.join(", ")}` : "",
      policy.defaultMode ? `default: ${policy.defaultMode}` : "",
    ].filter(Boolean)
    if (parts.length > 0) {
      lines.push(`- ${policy.server}: ${parts.join("; ")}`)
    }
  }
  return lines.join("\n")
}

function renderSkillList(skills: SkillDefinition[]) {
  let text = ""
  for (const skill of skills) {
    const line = `- $${skill.name}: ${skill.description || "No description."}\n`
    if (text.length + line.length > MAX_SKILL_LIST_BYTES) {
      return `${text}- ...skill list truncated\n`.trim()
    }
    text += line
  }
  return text.trim()
}

function readSkillBody(skillFile: string) {
  const text = readFileSync(skillFile, "utf8")
  const body = text.replace(/^---\s*[\s\S]*?\s*---\s*/, "").trim()
  return body.length > MAX_SKILL_BYTES
    ? `${body.slice(0, MAX_SKILL_BYTES)}\n\n[skill truncated]`
    : body
}

function parseFrontmatter(text: string) {
  const match = /^---\s*([\s\S]*?)\s*---/.exec(text)
  if (!match) {
    return {} as Record<string, string>
  }

  const values: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const item = /^([A-Za-z0-9_-]+):\s*["']?(.+?)["']?\s*$/.exec(line)
    if (item) {
      values[item[1]] = item[2]
    }
  }
  return values
}

function isHookEvent(value: string): value is HookEvent {
  return value === "PreRun" || value === "PostRun" || value === "UserPromptSubmit"
}

function findGitRoot(cwd: string) {
  try {
    return execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return null
  }
}

function directoriesFromRoot(root: string, cwd: string) {
  const resolvedRoot = path.resolve(root)
  const resolvedCwd = path.resolve(cwd)
  const relative = path.relative(resolvedRoot, resolvedCwd)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return [resolvedCwd]
  }

  const dirs = [resolvedRoot]
  if (!relative) {
    return dirs
  }

  let current = resolvedRoot
  for (const part of relative.split(path.sep)) {
    if (!part) {
      continue
    }
    current = path.join(current, part)
    dirs.push(current)
  }
  return dirs
}

function listDirectories(root: string) {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name))
  } catch {
    return []
  }
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []
}

function isReadableFile(filePath: string) {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
