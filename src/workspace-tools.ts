import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import type { SDKCustomTool, SDKJsonValue } from "@cursor/sdk"

export type LocalSandboxOptions = {
  enabled: boolean
}

const WORKSPACE_TOOL_MAX_OUTPUT_CHARS = 20_000
const WORKSPACE_TOOL_MAX_ENTRIES = 300
const WORKSPACE_TOOL_SHELL_TIMEOUT_MS = 30_000
const GREP_FALLBACK_MAX_FILE_BYTES = 1_000_000

export function createWorkspaceCustomTools(
  cwd: string,
  sandboxOptions?: LocalSandboxOptions
): Record<string, SDKCustomTool> {
  const root = path.resolve(cwd)

  return {
    workspace_project_snapshot: {
      description:
        "Collect a concise project overview from the configured workspace: root listing, package.json, README, key config files, and src tree. Use this first for project analysis tasks.",
      inputSchema: {
        type: "object",
        properties: {
          maxBytesPerFile: {
            type: "number",
            description: "Maximum bytes per text file. Defaults to 12000.",
          },
          maxSrcEntries: {
            type: "number",
            description: "Maximum src entries. Defaults to 300.",
          },
        },
        additionalProperties: false,
      },
      execute: (args) =>
        createWorkspaceProjectSnapshot(root, {
          maxBytesPerFile: boundedNumberArg(args, "maxBytesPerFile", 12_000, 1, 80_000),
          maxSrcEntries: boundedNumberArg(
            args,
            "maxSrcEntries",
            WORKSPACE_TOOL_MAX_ENTRIES,
            1,
            2000
          ),
        }),
    },
    workspace_read_file: {
      description:
        "Read a UTF-8 text file from the configured workspace. Use this when built-in Read fails.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative or absolute file path." },
          maxBytes: {
            type: "number",
            description: "Maximum bytes to return. Defaults to 20000.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
      execute: (args) => {
        const filePath = resolveWorkspacePath(root, requiredStringArg(args, "path"))
        const maxBytes = boundedNumberArg(
          args,
          "maxBytes",
          WORKSPACE_TOOL_MAX_OUTPUT_CHARS,
          1,
          200_000
        )
        const stat = statSync(filePath)

        if (!stat.isFile()) {
          throw new Error(`Path is not a file: ${formatWorkspacePath(root, filePath)}`)
        }

        const buffer = readFileSync(filePath)
        const truncated = buffer.length > maxBytes
        return {
          path: formatWorkspacePath(root, filePath),
          bytes: buffer.length,
          truncated,
          content: buffer.subarray(0, maxBytes).toString("utf8"),
        }
      },
    },
    workspace_list_files: {
      description:
        "List files and directories inside the configured workspace. Use this when built-in Glob fails.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative or absolute directory path. Defaults to workspace root.",
          },
          recursive: {
            type: "boolean",
            description: "Whether to recursively list descendants. Defaults to false.",
          },
          maxEntries: {
            type: "number",
            description: "Maximum entries to return. Defaults to 300.",
          },
        },
        additionalProperties: false,
      },
      execute: (args) => {
        const targetPath = resolveWorkspacePath(
          root,
          optionalStringArg(args, "path") || "."
        )
        const maxEntries = boundedNumberArg(
          args,
          "maxEntries",
          WORKSPACE_TOOL_MAX_ENTRIES,
          1,
          2000
        )
        const recursive = booleanArg(args, "recursive", false)
        const entries = listWorkspaceEntries(root, targetPath, recursive, maxEntries)
        return {
          path: formatWorkspacePath(root, targetPath),
          recursive,
          count: entries.length,
          truncated: entries.length >= maxEntries,
          entries,
        }
      },
    },
    workspace_grep: {
      description:
        "Search text in the configured workspace using ripgrep. Use this when built-in Grep fails.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Regular expression to search for." },
          path: {
            type: "string",
            description: "Relative or absolute file/directory path. Defaults to workspace root.",
          },
          glob: {
            type: "string",
            description: "Optional ripgrep glob, for example **/*.ts.",
          },
          ignoreCase: { type: "boolean", description: "Case-insensitive search." },
          maxMatches: {
            type: "number",
            description: "Maximum matching lines to return. Defaults to 100.",
          },
        },
        required: ["pattern"],
        additionalProperties: false,
      },
      execute: (args) => {
        const pattern = requiredStringArg(args, "pattern")
        const targetPath = resolveWorkspacePath(
          root,
          optionalStringArg(args, "path") || "."
        )
        const maxMatches = boundedNumberArg(args, "maxMatches", 100, 1, 1000)
        const results = grepWorkspace({
          glob: optionalStringArg(args, "glob"),
          ignoreCase: booleanArg(args, "ignoreCase", false),
          maxMatches,
          pattern,
          root,
          targetPath,
        })

        return {
          path: formatWorkspacePath(root, targetPath),
          pattern,
          count: results.length,
          truncated: results.length >= maxMatches,
          matches: results,
        }
      },
    },
    workspace_shell: {
      description:
        "Run a shell command in the configured workspace. Use this when built-in Shell returns no output.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: "Shell command to run." },
          workingDirectory: {
            type: "string",
            description: "Relative or absolute working directory. Defaults to workspace root.",
          },
          timeoutMs: {
            type: "number",
            description: "Timeout in milliseconds. Defaults to 30000.",
          },
          maxOutputBytes: {
            type: "number",
            description: "Maximum stdout/stderr bytes to return. Defaults to 20000.",
          },
        },
        required: ["command"],
        additionalProperties: false,
      },
      execute: (args) => {
        if (sandboxOptions?.enabled) {
          throw new Error(
            "workspace_shell is disabled while sandbox mode is enabled. Restart with --no-sandbox or use workspace_read_file/workspace_list_files/workspace_grep."
          )
        }

        const command = requiredStringArg(args, "command")
        const workingDirectory = resolveWorkspacePath(
          root,
          optionalStringArg(args, "workingDirectory") || "."
        )
        const timeoutMs = boundedNumberArg(
          args,
          "timeoutMs",
          WORKSPACE_TOOL_SHELL_TIMEOUT_MS,
          100,
          120_000
        )
        const maxOutputBytes = boundedNumberArg(
          args,
          "maxOutputBytes",
          WORKSPACE_TOOL_MAX_OUTPUT_CHARS,
          1,
          200_000
        )

        return runWorkspaceShell(root, workingDirectory, command, timeoutMs, maxOutputBytes)
      },
    },
  }
}

function resolveWorkspacePath(root: string, inputPath: string) {
  const trimmed = inputPath.trim()
  if (!trimmed) {
    throw new Error("Path cannot be empty.")
  }

  const resolved = path.resolve(path.isAbsolute(trimmed) ? trimmed : path.join(root, trimmed))
  const relative = path.relative(root, resolved)

  if (relative === "") {
    return resolved
  }

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside workspace: ${inputPath}`)
  }

  return resolved
}

function formatWorkspacePath(root: string, resolvedPath: string) {
  const relative = path.relative(root, resolvedPath)
  return relative ? toPortablePath(relative) : "."
}

function createWorkspaceProjectSnapshot(
  root: string,
  options: { maxBytesPerFile: number; maxSrcEntries: number }
) {
  const rootEntries = listWorkspaceEntries(
    root,
    root,
    false,
    WORKSPACE_TOOL_MAX_ENTRIES
  )
  const srcPath = path.join(root, "src")
  const srcStat = safeStat(srcPath)
  const srcEntries =
    srcStat?.isDirectory() ?? false
      ? listWorkspaceEntries(root, srcPath, true, options.maxSrcEntries)
      : []
  const candidateFiles = [
    "package.json",
    "README.md",
    "vite.config.ts",
    "vite.config.js",
    "webpack.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "src/main.ts",
    "src/main.js",
    "src/App.vue",
    "src/router/index.ts",
    "src/router/index.js",
  ]
  const files = candidateFiles
    .map((filePath) =>
      readWorkspaceSnapshotFile(root, filePath, options.maxBytesPerFile)
    )
    .filter(
      (
        file
      ): file is {
        path: string
        bytes: number
        truncated: boolean
        content: string
      } => Boolean(file)
    )

  return {
    root: ".",
    rootEntries,
    srcEntries,
    files,
  }
}

function readWorkspaceSnapshotFile(root: string, filePath: string, maxBytes: number) {
  const resolvedPath = resolveWorkspacePath(root, filePath)
  const stat = safeStat(resolvedPath)

  if (!stat?.isFile()) {
    return null
  }

  const buffer = readFileSync(resolvedPath)
  return {
    path: formatWorkspacePath(root, resolvedPath),
    bytes: buffer.length,
    truncated: buffer.length > maxBytes,
    content: buffer.subarray(0, maxBytes).toString("utf8"),
  }
}

function safeStat(filePath: string) {
  try {
    return statSync(filePath)
  } catch {
    return null
  }
}

function requiredStringArg(args: Record<string, SDKJsonValue>, name: string) {
  const value = args[name]

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Expected non-empty string argument "${name}".`)
  }

  return value
}

function optionalStringArg(args: Record<string, SDKJsonValue>, name: string) {
  const value = args[name]

  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== "string") {
    throw new Error(`Expected string argument "${name}".`)
  }

  return value
}

function booleanArg(
  args: Record<string, SDKJsonValue>,
  name: string,
  fallback: boolean
) {
  const value = args[name]

  if (value === undefined || value === null) {
    return fallback
  }

  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean argument "${name}".`)
  }

  return value
}

function boundedNumberArg(
  args: Record<string, SDKJsonValue>,
  name: string,
  fallback: number,
  min: number,
  max: number
) {
  const value = args[name]

  if (value === undefined || value === null) {
    return fallback
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected number argument "${name}".`)
  }

  return Math.max(min, Math.min(max, Math.floor(value)))
}

function listWorkspaceEntries(
  root: string,
  targetPath: string,
  recursive: boolean,
  maxEntries: number
) {
  const targetStat = statSync(targetPath)

  if (!targetStat.isDirectory()) {
    return [formatWorkspacePath(root, targetPath)]
  }

  const entries: string[] = []
  const visit = (directory: string) => {
    if (entries.length >= maxEntries) {
      return
    }

    const children = readdirSync(directory, { withFileTypes: true }).sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })

    for (const child of children) {
      if (entries.length >= maxEntries) {
        return
      }

      if (shouldSkipWorkspaceEntry(child.name)) {
        continue
      }

      const childPath = path.join(directory, child.name)
      const label = `${formatWorkspacePath(root, childPath)}${child.isDirectory() ? "/" : ""}`
      entries.push(label)

      if (recursive && child.isDirectory()) {
        visit(childPath)
      }
    }
  }

  visit(targetPath)
  return entries
}

function shouldSkipWorkspaceEntry(name: string) {
  return (
    name === ".git" ||
    name === "node_modules" ||
    name === "dist" ||
    name === "build" ||
    name === ".next" ||
    name === ".nuxt"
  )
}

function grepWorkspace({
  glob,
  ignoreCase,
  maxMatches,
  pattern,
  root,
  targetPath,
}: {
  glob?: string
  ignoreCase: boolean
  maxMatches: number
  pattern: string
  root: string
  targetPath: string
}) {
  const args = [
    "--line-number",
    "--no-heading",
    "--color",
    "never",
    "--glob",
    "!node_modules/**",
    "--glob",
    "!.git/**",
    "--glob",
    "!dist/**",
  ]

  if (ignoreCase) {
    args.push("--ignore-case")
  }

  if (glob) {
    args.push("--glob", glob)
  }

  args.push(pattern, targetPath)

  try {
    const output = execFileSync("rg", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: WORKSPACE_TOOL_SHELL_TIMEOUT_MS,
      maxBuffer: 2_000_000,
    })

    return output
      .split("\n")
      .filter(Boolean)
      .slice(0, maxMatches)
      .map((line) => {
        const relativePrefix = `${root}${path.sep}`
        return line.startsWith(relativePrefix) ? line.slice(relativePrefix.length) : line
      })
  } catch (error) {
    const status = (error as { status?: number }).status

    if (status === 1) {
      return []
    }

    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return grepWorkspaceFallback({
        glob,
        ignoreCase,
        maxMatches,
        pattern,
        root,
        targetPath,
      })
    }

    throw new Error(`ripgrep failed: ${getChildProcessErrorOutput(error)}`)
  }
}

function grepWorkspaceFallback({
  glob,
  ignoreCase,
  maxMatches,
  pattern,
  root,
  targetPath,
}: {
  glob?: string
  ignoreCase: boolean
  maxMatches: number
  pattern: string
  root: string
  targetPath: string
}) {
  let matcher: RegExp
  try {
    matcher = new RegExp(pattern, ignoreCase ? "i" : "")
  } catch (error) {
    throw new Error(`Invalid search pattern: ${getErrorMessage(error)}`)
  }

  const globMatcher = glob ? createGlobMatcher(glob) : null
  const files = collectSearchFiles(root, targetPath)
  const matches: string[] = []

  for (const filePath of files) {
    if (matches.length >= maxMatches) {
      break
    }

    const relativePath = formatWorkspacePath(root, filePath)
    if (globMatcher && !globMatcher(relativePath)) {
      continue
    }

    const stat = safeStat(filePath)
    if (!stat?.isFile() || stat.size > GREP_FALLBACK_MAX_FILE_BYTES) {
      continue
    }

    const buffer = readFileSync(filePath)
    if (buffer.includes(0)) {
      continue
    }

    const lines = buffer.toString("utf8").split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      if (matches.length >= maxMatches) {
        break
      }

      if (matcher.test(lines[index])) {
        matches.push(`${relativePath}:${index + 1}:${lines[index]}`)
      }
    }
  }

  return matches
}

function collectSearchFiles(root: string, targetPath: string) {
  const stat = statSync(targetPath)
  if (stat.isFile()) {
    return [targetPath]
  }

  const files: string[] = []
  const visit = (directory: string) => {
    const children = readdirSync(directory, { withFileTypes: true })
    for (const child of children) {
      if (shouldSkipWorkspaceEntry(child.name)) {
        continue
      }

      const childPath = path.join(directory, child.name)
      if (child.isDirectory()) {
        visit(childPath)
      } else if (child.isFile()) {
        files.push(childPath)
      }
    }
  }

  if (isInsideWorkspace(root, targetPath)) {
    visit(targetPath)
  }
  return files
}

function createGlobMatcher(glob: string) {
  const regex = globToRegExp(glob)
  return (filePath: string) => regex.test(toPortablePath(filePath))
}

function globToRegExp(glob: string) {
  const source = toPortablePath(glob.trim())
  let pattern = "^"

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    const afterNext = source[index + 2]

    if (char === "*" && next === "*" && afterNext === "/") {
      pattern += "(?:.*/)?"
      index += 2
      continue
    }

    if (char === "*" && next === "*") {
      pattern += ".*"
      index += 1
      continue
    }

    if (char === "*") {
      pattern += "[^/]*"
      continue
    }

    if (char === "?") {
      pattern += "[^/]"
      continue
    }

    pattern += escapeRegExp(char)
  }

  return new RegExp(`${pattern}$`)
}

function escapeRegExp(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
}

function isInsideWorkspace(root: string, target: string) {
  const relative = path.relative(path.resolve(root), path.resolve(target))
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function runWorkspaceShell(
  root: string,
  workingDirectory: string,
  command: string,
  timeoutMs: number,
  maxOutputBytes: number
) {
  const shell = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "sh"
  const shellArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", command]
      : ["-lc", command]

  try {
    const stdout = execFileSync(shell, shellArgs, {
      cwd: workingDirectory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      maxBuffer: Math.max(maxOutputBytes * 2, 1024),
    })

    return {
      command,
      workingDirectory: formatWorkspacePath(root, workingDirectory),
      exitCode: 0,
      stdout: clampInlineText(stdout, maxOutputBytes),
      stderr: "",
      truncated: stdout.length > maxOutputBytes,
    }
  } catch (error) {
    const stdout = childProcessOutput(error, "stdout")
    const stderr = childProcessOutput(error, "stderr")
    const status = (error as { status?: number }).status

    return {
      command,
      workingDirectory: formatWorkspacePath(root, workingDirectory),
      exitCode: typeof status === "number" ? status : null,
      stdout: clampInlineText(stdout, maxOutputBytes),
      stderr: clampInlineText(stderr || getErrorMessage(error), maxOutputBytes),
      truncated: stdout.length > maxOutputBytes || stderr.length > maxOutputBytes,
    }
  }
}

function toPortablePath(value: string) {
  return value.replace(/\\/g, "/")
}

function getChildProcessErrorOutput(error: unknown) {
  return (
    [childProcessOutput(error, "stderr"), childProcessOutput(error, "stdout")]
      .map((text) => text.trim())
      .filter(Boolean)
      .join("\n") || getErrorMessage(error)
  )
}

function childProcessOutput(error: unknown, key: "stderr" | "stdout") {
  const value = (error as { [key: string]: unknown })[key]

  if (typeof value === "string") {
    return value
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8")
  }

  return ""
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function clampInlineText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxChars - 24)).trimEnd()} [truncated]`
}
