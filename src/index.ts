#!/usr/bin/env bun
import path from "node:path"
import { CliRenderEvents, type CliRenderer, createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import React from "react"

import {
  CodingAgentSession,
  DEFAULT_CONTEXT_COMPACTION_OPTIONS,
  formatDuration,
  type AgentEvent,
  type ContextCompactionOptions,
  type LocalSandboxOptions,
} from "./agent.js"
import { App } from "./tui/App.js"

type CliOptions = {
  context: ContextCompactionOptions
  cwd: string
  force: boolean
  help: boolean
  model: string
  prompt: string
  sandboxOptions?: LocalSandboxOptions
}

const DEFAULT_MODEL = process.env.CURSOR_MODEL ?? "composer-2"

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  setProcessWorkspaceCwd(options.cwd)

  const apiKey = process.env.CURSOR_API_KEY ?? ""

  if (options.prompt) {
    if (!apiKey) {
      throw new Error("Set CURSOR_API_KEY before running one-shot prompts.")
    }

    await runPlainPrompt(apiKey, options, options.prompt)
    return
  }

  if (!process.stdin.isTTY) {
    const prompt = (await readStdin()).trim()
    if (!prompt) {
      throw new Error("No prompt provided on stdin.")
    }

    if (!apiKey) {
      throw new Error("Set CURSOR_API_KEY before running one-shot prompts.")
    }

    await runPlainPrompt(apiKey, options, prompt)
    return
  }

  if (!process.stdout.isTTY) {
    throw new Error("Interactive mode requires a TTY stdout.")
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    maxFps: 30,
    screenMode: "alternate-screen",
  })
  const root = createRoot(renderer)

  try {
    root.render(
      React.createElement(App, {
        apiKey,
        context: options.context,
        cwd: options.cwd,
        force: options.force,
        initialModel: { id: options.model },
        sandboxOptions: options.sandboxOptions,
      })
    )
    await waitUntilDestroyed(renderer)
  } finally {
    root.unmount()

    if (!renderer.isDestroyed) {
      renderer.destroy()
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  let context = readContextOptionsFromEnv()
  const promptParts: string[] = []
  let cwd = process.cwd()
  let force = false
  let help = false
  let model = DEFAULT_MODEL
  let sandboxOptions = readSandboxOptionsFromEnv()

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--") {
      promptParts.push(...argv.slice(index + 1))
      break
    }

    if (arg === "--help" || arg === "-h") {
      help = true
      continue
    }

    if (arg === "--force") {
      force = true
      continue
    }

    if (arg === "--no-sandbox") {
      sandboxOptions = { enabled: false }
      continue
    }

    if (arg === "--sandbox") {
      sandboxOptions = readSandboxOption(readOptionValue(argv, index, arg), arg)
      index += 1
      continue
    }

    if (arg.startsWith("--sandbox=")) {
      sandboxOptions = readSandboxOption(arg.slice("--sandbox=".length), "--sandbox")
      continue
    }

    if (arg === "--no-auto-compact") {
      context = { ...context, enabled: false }
      continue
    }

    if (arg === "--context-max-chars") {
      context = {
        ...context,
        maxHistoryChars: readPositiveIntegerOption(argv, index, arg),
      }
      index += 1
      continue
    }

    if (arg.startsWith("--context-max-chars=")) {
      context = {
        ...context,
        maxHistoryChars: readPositiveIntegerValue(
          arg.slice("--context-max-chars=".length),
          arg
        ),
      }
      continue
    }

    if (arg === "--context-retain-chars") {
      context = {
        ...context,
        retainRecentChars: readPositiveIntegerOption(argv, index, arg),
      }
      index += 1
      continue
    }

    if (arg.startsWith("--context-retain-chars=")) {
      context = {
        ...context,
        retainRecentChars: readPositiveIntegerValue(
          arg.slice("--context-retain-chars=".length),
          arg
        ),
      }
      continue
    }

    if (arg === "--context-summary-chars") {
      context = {
        ...context,
        summaryMaxChars: readPositiveIntegerOption(argv, index, arg),
      }
      index += 1
      continue
    }

    if (arg.startsWith("--context-summary-chars=")) {
      context = {
        ...context,
        summaryMaxChars: readPositiveIntegerValue(
          arg.slice("--context-summary-chars=".length),
          arg
        ),
      }
      continue
    }

    if (arg === "--cwd" || arg === "-C") {
      cwd = readOptionValue(argv, index, arg)
      index += 1
      continue
    }

    if (arg.startsWith("--cwd=")) {
      cwd = arg.slice("--cwd=".length)
      continue
    }

    if (arg === "--model" || arg === "-m") {
      model = readOptionValue(argv, index, arg)
      index += 1
      continue
    }

    if (arg.startsWith("--model=")) {
      model = arg.slice("--model=".length)
      continue
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`)
    }

    promptParts.push(arg, ...argv.slice(index + 1))
    break
  }

  return {
    context,
    cwd: path.resolve(cwd),
    force,
    help,
    model,
    prompt: promptParts.join(" ").trim(),
    sandboxOptions,
  }
}

function readOptionValue(argv: string[], index: number, option: string) {
  const value = argv[index + 1]
  if (!value || value.startsWith("-")) {
    throw new Error(`Expected a value after ${option}.`)
  }
  return value
}

function readPositiveIntegerOption(argv: string[], index: number, option: string) {
  return readPositiveIntegerValue(readOptionValue(argv, index, option), option)
}

function readPositiveIntegerValue(value: string, option: string) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer for ${option}.`)
  }

  return parsed
}

function readContextOptionsFromEnv(): ContextCompactionOptions {
  return {
    ...DEFAULT_CONTEXT_COMPACTION_OPTIONS,
    enabled: readBooleanEnv("CURSOR_AUTO_COMPACT", true),
    maxHistoryChars: readPositiveIntegerEnv(
      "CURSOR_CONTEXT_MAX_CHARS",
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.maxHistoryChars
    ),
    retainRecentChars: readPositiveIntegerEnv(
      "CURSOR_CONTEXT_RETAIN_CHARS",
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.retainRecentChars
    ),
    summaryMaxChars: readPositiveIntegerEnv(
      "CURSOR_CONTEXT_SUMMARY_CHARS",
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.summaryMaxChars
    ),
    maxCompactionInputChars: readPositiveIntegerEnv(
      "CURSOR_CONTEXT_COMPACTION_INPUT_CHARS",
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.maxCompactionInputChars
    ),
  }
}

function readSandboxOptionsFromEnv(): LocalSandboxOptions | undefined {
  const enabled = readOptionalBooleanEnv("CURSOR_SANDBOX")
  return enabled === undefined ? undefined : { enabled }
}

function readSandboxOption(value: string, option: string): LocalSandboxOptions {
  const normalized = value.trim().toLowerCase()

  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return { enabled: true }
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return { enabled: false }
  }

  throw new Error(`Expected enabled or disabled for ${option}.`)
}

function readOptionalBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name]

  if (!value) {
    return undefined
  }

  return !["0", "false", "no", "off", "disabled"].includes(value.toLowerCase())
}

function readBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name]

  if (!value) {
    return fallback
  }

  return !["0", "false", "no", "off"].includes(value.toLowerCase())
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = process.env[name]

  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function setProcessWorkspaceCwd(cwd: string) {
  try {
    process.chdir(cwd)
  } catch (error) {
    throw new Error(
      `Cannot enter workspace directory: ${cwd}. ${getErrorMessage(error)}`
    )
  }
}

async function runPlainPrompt(
  apiKey: string,
  options: CliOptions,
  prompt: string
) {
  const session = new CodingAgentSession({
    apiKey,
    context: options.context,
    cwd: options.cwd,
    force: options.force,
    model: { id: options.model },
    sandboxOptions: options.sandboxOptions,
  })
  let assistantEndedWithNewline = true

  const annotate = (message: string) => {
    if (!assistantEndedWithNewline) {
      process.stderr.write("\n")
    }
    process.stderr.write(`${message}\n`)
    assistantEndedWithNewline = true
  }

  try {
    await session.sendPrompt({
      prompt,
      onEvent: (event) => {
        renderPlainEvent(event, annotate, (text) => {
          process.stdout.write(text)
          assistantEndedWithNewline = text.endsWith("\n")
        })
      },
    })
  } finally {
    await session.dispose()
  }
}

function renderPlainEvent(
  event: AgentEvent,
  annotate: (message: string) => void,
  writeAssistant: (text: string) => void
) {
  switch (event.type) {
    case "assistant_delta":
      writeAssistant(event.text)
      break
    case "thinking": {
      const text = compactText(event.text)
      if (text) {
        annotate(`[thinking] ${text}`)
      }
      break
    }
    case "compaction":
      annotate(`[context] ${event.status} ${event.message}`)
      break
    case "tool":
      annotate(`[tool] ${event.status} ${event.name}`)
      break
    case "status":
      if (event.status !== "FINISHED") {
        const detail = [event.message, event.errorCode && `code=${event.errorCode}`]
          .filter(Boolean)
          .join(" ")
        annotate(`[status] ${event.status}${detail ? ` ${detail}` : ""}`)
      }
      break
    case "task":
      if (event.text || event.status) {
        annotate(`[task] ${compactText([event.status, event.text].filter(Boolean).join(" "))}`)
      }
      break
    case "result": {
      const details = [
        `status=${event.status}`,
        event.durationMs ? `duration=${formatDuration(event.durationMs)}` : undefined,
        event.usage?.inputTokens ? `input=${event.usage.inputTokens}` : undefined,
        event.usage?.outputTokens ? `output=${event.usage.outputTokens}` : undefined,
        event.message ? `error=${event.message}` : undefined,
        event.errorCode ? `code=${event.errorCode}` : undefined,
      ].filter(Boolean)

      annotate(`[done] ${details.join(" ")}`)
      break
    }
    default:
      break
  }
}

function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

async function readStdin() {
  let input = ""
  process.stdin.setEncoding("utf8")

  for await (const chunk of process.stdin) {
    input += chunk
  }

  return input
}

function waitUntilDestroyed(renderer: CliRenderer) {
  if (renderer.isDestroyed) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    renderer.once(CliRenderEvents.DESTROY, () => resolve())
  })
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function printHelp() {
  console.log(`Lightweight coding agent CLI

Usage:
  code-agent [options] "your task"
  code-agent [options]

Options:
  -C, --cwd <path>       Workspace directory for the local agent process. Defaults to cwd.
  -m, --model <id>      Model id. Defaults to CURSOR_MODEL or composer-2.
      --force           Expire a stuck active local run before starting.
      --no-sandbox      Disable Cursor's local shell sandbox for tool calls.
      --sandbox <mode>  Set sandbox mode: enabled or disabled.
      --no-auto-compact Disable automatic conversation compaction.
      --context-max-chars <n>
                        Compact before estimated history exceeds n chars.
      --context-retain-chars <n>
                        Keep this many recent chars outside the summary.
      --context-summary-chars <n>
                        Maximum compressed-memory summary size.
  -h, --help            Show this help.

Interactive commands:
  /local                 使用本地项目执行后续任务。
  /model                 打开模型选择器。
  /set_apiKey            设置 Cursor API Key；加 --save 可在 Windows 保存。

Examples:
  cd ../my-app
  code-agent "Explain the auth flow"
  code-agent --cwd ../my-app "Add a regression test for the parser"
  code-agent
  printf "Review the recent changes" | code-agent
`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Error: ${message}`)
  process.exitCode = 1
})
