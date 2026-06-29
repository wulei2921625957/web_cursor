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

export type ExtensionRuntime = {
  hooks: HookDefinition[]
  instructions: string
  mcpServers: Record<string, McpServerConfig>
  sources: ExtensionSource[]
  warnings: string[]
}

export type ExtensionSource = {
  kind: "agents" | "skill" | "plugin" | "mcp" | "hook"
  label: string
  path?: string
}

export type HookDefinition = {
  command: string
  event: HookEvent
  matcher?: string
  source: string
  statusMessage?: string
  timeoutMs: number
}

export type HookEvent = "PostRun" | "PreRun" | "UserPromptSubmit"

type SkillDefinition = {
  description: string
  name: string
  path: string
}

type ExtensionConfig = {
  hooks?: unknown
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
  const projectInstructions = loadProjectInstructions(cwd, sources, warnings)
  const skills = discoverSkills(cwd, sources, warnings)
  const activeSkills = selectActiveSkills(skills, prompt)
  const pluginRuntime = loadPlugins(root, config, sources, warnings)
  const mcpServers = {
    ...pluginRuntime.mcpServers,
    ...normalizeMcpServers(config.mcpServers, warnings),
  }
  for (const name of Object.keys(mcpServers)) {
    sources.push({ kind: "mcp", label: name })
  }

  const hooks = [
    ...pluginRuntime.hooks,
    ...normalizeHooks(config.hooks, "project extension config", warnings),
  ]
  for (const hook of hooks) {
    sources.push({ kind: "hook", label: hook.event, path: hook.source })
  }

  return {
    hooks,
    instructions: renderRuntimeInstructions({
      activeSkills,
      projectInstructions,
      skills,
      warnings,
    }),
    mcpServers,
    sources,
    warnings,
  }
}

export function runHooks(
  hooks: HookDefinition[],
  event: HookEvent,
  payload: Record<string, unknown>,
  cwd: string,
  onStatus?: (message: string) => void
) {
  const matching = hooks.filter((hook) => hook.event === event)
  for (const hook of matching) {
    if (hook.statusMessage) {
      onStatus?.(hook.statusMessage)
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
  warnings: string[]
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
        sources.push({ kind: "skill", label: skill.name, path: skill.path })
      }
    }
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name))
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
  return skills.filter((skill) => requested.has(skill.name))
}

function loadPlugins(
  root: string,
  config: ExtensionConfig,
  sources: ExtensionSource[],
  warnings: string[]
) {
  const pluginDirs = [
    ...normalizeStringList(config.plugins),
    ...listDirectories(path.join(root, ".coding-agent", "plugins")),
  ]
  const hooks: HookDefinition[] = []
  const mcpServers: Record<string, McpServerConfig> = {}

  for (const rawDir of pluginDirs) {
    const dir = path.resolve(root, rawDir)
    const manifestFile = path.join(dir, "plugin.json")
    if (!isReadableFile(manifestFile)) {
      continue
    }

    try {
      const manifest = JSON.parse(readFileSync(manifestFile, "utf8")) as Record<
        string,
        unknown
      >
      const id =
        typeof manifest.id === "string" && manifest.id.trim()
          ? manifest.id.trim()
          : path.basename(dir)
      sources.push({ kind: "plugin", label: id, path: manifestFile })
      Object.assign(mcpServers, normalizeMcpServers(manifest.mcpServers, warnings))
      hooks.push(...normalizeHooks(manifest.hooks, `plugin ${id}`, warnings))
    } catch (error) {
      warnings.push(`Failed to load plugin ${manifestFile}: ${getErrorMessage(error)}`)
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
  if (!command) {
    warnings.push(`Ignoring ${event} hook without command from ${source}.`)
    return []
  }

  return [
    {
      command,
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
  if (process.platform === "win32") {
    execFileSync("cmd.exe", ["/d", "/s", "/c", hook.command], {
      cwd,
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: hook.timeoutMs,
    })
    return
  }

  execFileSync("sh", ["-lc", hook.command], {
    cwd,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: hook.timeoutMs,
  })
}

function renderRuntimeInstructions({
  activeSkills,
  projectInstructions,
  skills,
  warnings,
}: {
  activeSkills: SkillDefinition[]
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

  if (warnings.length > 0) {
    parts.push("Extension warnings:", warnings.join("\n"))
  }

  return parts.join("\n\n")
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
