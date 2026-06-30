import { existsSync, readFileSync } from "node:fs"
import * as fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const PROJECT_MEMORY_DIR = ".coding-agent"
const PROJECT_MEMORY_FILE = "project-memory.md"
const PROJECT_MEMORY_SETTINGS_FILE = "memory.json"
const USER_MEMORY_FILE = "user-memory.md"
const PROJECT_MEMORY_MAX_CHARS = 20_000
const USER_MEMORY_MAX_CHARS = 20_000
const MEMORY_SEARCH_CONTEXT_CHARS = 180

export type MemoryScope = "project" | "user"

export type MemoryRecord = {
  enabled: boolean
  memory: string
  path: string
  scope: MemoryScope
}

export type MemorySettings = {
  projectEnabled: boolean
  userEnabled: boolean
}

export type MemorySearchResult = {
  line: number
  path: string
  scope: MemoryScope
  text: string
}

export function projectMemoryFile(workspaceCwd: string) {
  return path.join(path.resolve(workspaceCwd), PROJECT_MEMORY_DIR, PROJECT_MEMORY_FILE)
}

export function projectMemorySettingsFile(workspaceCwd: string) {
  return path.join(
    path.resolve(workspaceCwd),
    PROJECT_MEMORY_DIR,
    PROJECT_MEMORY_SETTINGS_FILE
  )
}

export function userMemoryFile(homeDir = os.homedir()) {
  return path.join(path.resolve(homeDir), PROJECT_MEMORY_DIR, USER_MEMORY_FILE)
}

export function readMemorySettings(workspaceCwd: string): MemorySettings {
  const file = projectMemorySettingsFile(workspaceCwd)
  if (!existsSync(file)) {
    return defaultMemorySettings()
  }

  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
    return {
      projectEnabled:
        typeof parsed.projectEnabled === "boolean" ? parsed.projectEnabled : true,
      userEnabled: typeof parsed.userEnabled === "boolean" ? parsed.userEnabled : true,
    }
  } catch {
    return defaultMemorySettings()
  }
}

export async function writeMemorySettings(
  workspaceCwd: string,
  settings: Partial<MemorySettings>
) {
  const file = projectMemorySettingsFile(workspaceCwd)
  const next = { ...readMemorySettings(workspaceCwd), ...settings }
  await fs.mkdir(path.dirname(file), { mode: 0o700, recursive: true })
  await fs.writeFile(file, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  return next
}

export function readProjectMemory(workspaceCwd: string) {
  const file = projectMemoryFile(workspaceCwd)
  return readMemoryFile(file, PROJECT_MEMORY_MAX_CHARS, "Project memory truncated")
}

export function readUserMemory(homeDir = os.homedir()) {
  const file = userMemoryFile(homeDir)
  return readMemoryFile(file, USER_MEMORY_MAX_CHARS, "User memory truncated")
}

export async function writeProjectMemory(workspaceCwd: string, memory: string) {
  const file = projectMemoryFile(workspaceCwd)
  await writeMemoryFile(file, memory)
  return file
}

export async function writeUserMemory(memory: string, homeDir = os.homedir()) {
  const file = userMemoryFile(homeDir)
  await writeMemoryFile(file, memory)
  return file
}

export async function deleteProjectMemory(workspaceCwd: string) {
  const file = projectMemoryFile(workspaceCwd)
  await fs.rm(file, { force: true })
  return file
}

export async function deleteUserMemory(homeDir = os.homedir()) {
  const file = userMemoryFile(homeDir)
  await fs.rm(file, { force: true })
  return file
}

export function readMemoryRecords(workspaceCwd: string, homeDir = os.homedir()) {
  const settings = readMemorySettings(workspaceCwd)
  return [
    {
      enabled: settings.userEnabled,
      memory: readUserMemory(homeDir),
      path: userMemoryFile(homeDir),
      scope: "user" as const,
    },
    {
      enabled: settings.projectEnabled,
      memory: readProjectMemory(workspaceCwd),
      path: projectMemoryFile(workspaceCwd),
      scope: "project" as const,
    },
  ]
}

export function projectMemoryPromptContext(workspaceCwd: string) {
  if (!readMemorySettings(workspaceCwd).projectEnabled) {
    return ""
  }

  const memory = readProjectMemory(workspaceCwd)
  if (!memory) {
    return ""
  }

  return [
    "Project memory for this workspace:",
    memory,
    "Use project memory as user-editable background context; current prompt and source files take precedence.",
  ].join("\n")
}

export function memoryPromptContext(workspaceCwd: string, homeDir = os.homedir()) {
  const records = readMemoryRecords(workspaceCwd, homeDir).filter((record) =>
    record.enabled && record.memory.trim()
  )
  if (records.length === 0) {
    return ""
  }

  const lines = ["Long-term memory available to this run:"]
  for (const record of records) {
    lines.push(
      record.scope === "user"
        ? "User memory (applies across workspaces):"
        : "Project memory (applies to this workspace):",
      record.memory
    )
  }
  lines.push(
    "Use memory as user-editable background context; current prompt and source files take precedence."
  )
  return lines.join("\n")
}

export function searchMemoryRecords(
  workspaceCwd: string,
  query: string,
  homeDir = os.homedir()
): MemorySearchResult[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return []
  }

  const results: MemorySearchResult[] = []
  for (const record of readMemoryRecords(workspaceCwd, homeDir)) {
    if (!record.memory) continue
    const lines = record.memory.split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const normalizedLine = normalizeSearchText(line)
      const matchIndex = normalizedLine.indexOf(normalizedQuery)
      if (matchIndex < 0) continue
      results.push({
        line: index + 1,
        path: record.path,
        scope: record.scope,
        text: shortenSearchLine(line),
      })
      if (results.length >= 20) {
        return results
      }
    }
  }
  return results
}

function readMemoryFile(file: string, maxChars: number, truncatedLabel: string) {
  if (!existsSync(file)) {
    return ""
  }

  const text = readFileSync(file, "utf8").trim()
  return text.length > maxChars
    ? `${text.slice(0, maxChars).trimEnd()}\n\n[${truncatedLabel}]`
    : text
}

function defaultMemorySettings(): MemorySettings {
  return {
    projectEnabled: true,
    userEnabled: true,
  }
}

async function writeMemoryFile(file: string, memory: string) {
  const text = memory.trim()
  await fs.mkdir(path.dirname(file), { mode: 0o700, recursive: true })
  await fs.writeFile(file, text ? `${text}\n` : "", { encoding: "utf8", mode: 0o600 })
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

function shortenSearchLine(text: string) {
  const trimmed = text.trim()
  if (trimmed.length <= MEMORY_SEARCH_CONTEXT_CHARS) {
    return trimmed
  }
  return `${trimmed.slice(0, MEMORY_SEARCH_CONTEXT_CHARS - 1).trimEnd()}…`
}
