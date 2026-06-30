import { spawn, type ChildProcessByStdio } from "node:child_process"
import type { Readable, Writable } from "node:stream"

import {
  appendPermissionAuditLog,
  evaluateShellPermission,
  readShellPermissionRules,
  type LocalSandboxOptions,
} from "./permissions.js"

const TERMINAL_MAX_LINES = 800
const TERMINAL_PROMPT_LINES = 80
const TERMINAL_MAX_INPUT_CHARS = 8192

export type TerminalRunStatus = "exited" | "running" | "stopped"

export type TerminalLine = {
  id: number
  stream: "stderr" | "stdin" | "stdout" | "system"
  text: string
  timestamp: number
}

export type TerminalRun = {
  child?: ChildProcessByStdio<Writable, Readable, Readable>
  command: string
  cwd: string
  exitCode?: number | null
  id: string
  lines: TerminalLine[]
  nextLineId: number
  sessionId: string
  startedAt: number
  status: TerminalRunStatus
  updatedAt: number
}

export type PublicTerminalRun = {
  command: string
  cwd: string
  exitCode: number | null
  id: string
  lineCount: number
  sessionId: string
  startedAt: number
  status: TerminalRunStatus
  updatedAt: number
}

export class TerminalManager {
  private readonly runs = new Map<string, TerminalRun>()

  constructor(private readonly createId: () => string) {}

  getRun(terminalId: string) {
    return this.runs.get(terminalId) ?? null
  }

  publicRun(run: TerminalRun): PublicTerminalRun {
    return {
      command: run.command,
      cwd: run.cwd,
      exitCode: run.exitCode ?? null,
      id: run.id,
      lineCount: run.lines.length,
      sessionId: run.sessionId,
      startedAt: run.startedAt,
      status: run.status,
      updatedAt: run.updatedAt,
    }
  }

  runsForSession(sessionId: string) {
    return Array.from(this.runs.values())
      .filter((run) => run.sessionId === sessionId)
      .sort((left, right) => right.startedAt - left.startedAt)
  }

  start({
    command,
    cwd,
    permissions,
    sessionId,
  }: {
    command: string
    cwd: string
    permissions?: LocalSandboxOptions
    sessionId: string
  }) {
    const trimmed = command.trim()
    if (!trimmed) {
      throw new Error("终端命令不能为空。")
    }

    const permission = evaluateShellPermission({
      command: trimmed,
      cwd,
      permissions,
      rules: readShellPermissionRules(cwd),
      source: "terminal",
      workspaceRoot: cwd,
    })
    appendPermissionAuditLog(cwd, {
      command: trimmed,
      cwd,
      decision: permission.decision,
      event: "terminal",
      permissionMode: permission.permissionMode,
      reason: permission.reason,
      risk: permission.risk,
      source: "terminal",
    })
    if (!permission.allowed) {
      throw new Error(permission.message)
    }

    const now = Date.now()
    const terminal: TerminalRun = {
      command: trimmed,
      cwd,
      id: this.createId(),
      lines: [],
      nextLineId: 1,
      sessionId,
      startedAt: now,
      status: "running",
      updatedAt: now,
    }
    this.runs.set(terminal.id, terminal)
    appendTerminalLine(terminal, "system", `$ ${trimmed}`)

    const { command: shell, args } = terminalShellCommand(trimmed)
    const child = spawn(shell, args, {
      cwd,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    })
    terminal.child = child

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => appendTerminalChunk(terminal, "stdout", chunk))
    child.stderr.on("data", (chunk) => appendTerminalChunk(terminal, "stderr", chunk))
    child.on("error", (error) => {
      appendTerminalLine(terminal, "system", `启动失败：${getErrorMessage(error)}`)
      terminal.status = "exited"
      terminal.updatedAt = Date.now()
    })
    child.on("close", (code, signal) => {
      terminal.exitCode = code
      terminal.status = terminal.status === "stopped" ? "stopped" : "exited"
      appendTerminalLine(
        terminal,
        "system",
        signal
          ? `进程结束：signal ${signal}`
          : `进程结束：exit ${code ?? "unknown"}`
      )
      terminal.child = undefined
      terminal.updatedAt = Date.now()
    })

    return terminal
  }

  writeInput(terminalId: string, input: string) {
    const terminal = this.runs.get(terminalId)
    if (!terminal) {
      throw new Error("终端任务不存在。")
    }

    if (terminal.status !== "running" || !terminal.child) {
      throw new Error("终端任务未在运行。")
    }

    if (input.length === 0) {
      throw new Error("终端输入不能为空。")
    }

    if (input.length > TERMINAL_MAX_INPUT_CHARS) {
      throw new Error(`终端输入不能超过 ${TERMINAL_MAX_INPUT_CHARS} 个字符。`)
    }

    if (terminal.child.stdin.destroyed || terminal.child.stdin.writableEnded) {
      throw new Error("终端输入流已关闭。")
    }

    terminal.child.stdin.write(input)
    appendTerminalInput(terminal, input)
    return terminal
  }

  stopRun(terminalId: string) {
    const terminal = this.runs.get(terminalId)
    if (!terminal) {
      throw new Error("终端任务不存在。")
    }

    if (terminal.status !== "running" || !terminal.child) {
      return terminal
    }

    terminal.status = "stopped"
    terminal.updatedAt = Date.now()
    appendTerminalLine(terminal, "system", "已请求停止进程。")
    terminal.child.kill("SIGTERM")
    return terminal
  }

  stopSession(sessionId: string) {
    for (const terminal of this.runsForSession(sessionId)) {
      if (terminal.status === "running") {
        this.stopRun(terminal.id)
      }
    }
  }

  stopAll() {
    for (const terminal of this.runs.values()) {
      if (terminal.status === "running") {
        terminal.child?.kill("SIGTERM")
      }
    }
  }

  buildPromptContext(sessionId: string) {
    const runs = this.runsForSession(sessionId).slice(0, 3).reverse()
    const lines = runs.flatMap((run) =>
      run.lines
        .filter((line) => line.stream !== "stdin")
        .map((line) => ({
          command: run.command,
          line,
          status: run.status,
        }))
    )
    const recent = lines.slice(-TERMINAL_PROMPT_LINES)
    if (recent.length === 0) {
      return ""
    }

    return [
      "Recent terminal output for this session:",
      ...recent.map(({ command, line, status }) =>
        `[${status}][${command}][${line.stream}] ${line.text}`
      ),
      "Use terminal output as diagnostic context; verify against source files before editing.",
    ].join("\n")
  }
}

function terminalShellCommand(command: string) {
  if (process.platform === "win32") {
    return { command: "cmd.exe", args: ["/d", "/s", "/c", command] }
  }

  return { command: process.env.SHELL || "sh", args: ["-lc", command] }
}

function appendTerminalChunk(
  terminal: TerminalRun,
  stream: TerminalLine["stream"],
  chunk: unknown
) {
  const text = String(chunk).replace(/\r\n?/g, "\n")
  const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n")
  for (const line of lines) {
    appendTerminalLine(terminal, stream, line)
  }
}

function appendTerminalInput(terminal: TerminalRun, input: string) {
  const normalized = input.replace(/\r\n?/g, "\n")
  const display = normalized.endsWith("\n")
    ? normalized.slice(0, -1)
    : normalized
  const lines = display.split("\n")
  for (const line of lines.length ? lines : [""]) {
    appendTerminalLine(terminal, "stdin", line)
  }
}

function appendTerminalLine(
  terminal: TerminalRun,
  stream: TerminalLine["stream"],
  text: string
) {
  terminal.lines.push({
    id: terminal.nextLineId,
    stream,
    text,
    timestamp: Date.now(),
  })
  terminal.nextLineId += 1
  terminal.updatedAt = Date.now()

  if (terminal.lines.length > TERMINAL_MAX_LINES) {
    terminal.lines.splice(0, terminal.lines.length - TERMINAL_MAX_LINES)
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
