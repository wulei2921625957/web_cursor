import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import {
  Agent,
  Cursor,
  type ModelSelection,
  type Run,
  type RunResult,
  type SDKAgent,
  type SDKCustomTool,
  type SDKJsonValue,
  type SDKMessage,
  type SDKModel,
} from "@cursor/sdk"
import {
  SESSION_MEMORY_JSON_SCHEMA,
  SessionMemoryManager,
  contextEntriesToText,
  createFallbackSessionMemorySummary,
  parseSessionMemorySummary,
  type SessionMemoryEntry,
  type SessionMemoryPromptContext,
  type SessionMemorySnapshot,
} from "./session-memory.js"

export type AgentEvent =
  | { type: "assistant_delta"; text: string }
  | { type: "thinking"; text: string }
  | {
      type: "compaction"
      status: "started" | "finished" | "skipped" | "failed"
      reason: string
      message: string
      originalChars?: number
      retainedChars?: number
      summaryChars?: number
    }
  | {
      type: "tool"
      callId?: string
      name: string
      params?: string
      result?: string
      status: string
    }
  | { type: "status"; status: string; message?: string; errorCode?: string }
  | { type: "task"; status?: string; text?: string }
  | {
      type: "result"
      status: string
      durationMs?: number
      usage?: TokenUsage
      message?: string
      errorCode?: string
    }

export type ModelChoice = {
  label: string
  value: ModelSelection
  description?: string
  contextWindowTokens?: number
  contextWindowSource?: ModelContextSource
}

export type TokenUsage = {
  inputTokens?: number
  outputTokens?: number
}

export type ContextUsage = {
  charsPerToken: number
  contextWindowKind: "model" | "local"
  localBudgetChars: number
  localBudgetTokens: number
  maxChars: number
  maxTokens: number
  modelContextSource?: ModelContextSource
  modelMaxTokens?: number
  percentRemaining: number
  percentUsed: number
  remainingChars: number
  remainingTokens: number
  usedChars: number
  usedTokens: number
}

export type ModelContextSource = "catalog" | "description" | "model-id" | "unknown"

export type ExecutionMode = "cloud" | "local"

export type ContextCompactionOptions = {
  enabled: boolean
  maxHistoryChars: number
  retainRecentChars: number
  summaryMaxChars: number
  maxCompactionInputChars: number
}

export type LocalSandboxOptions = {
  enabled: boolean
}

export type CompactContextResult =
  | {
      compacted: true
      reason: string
      originalChars: number
      retainedChars: number
      summaryChars: number
    }
  | { compacted: false; reason: string; message: string }

export type ContextEntry = SessionMemoryEntry

export type CodingAgentSessionSnapshot = {
  contextSummary: string
  executionMode: ExecutionMode
  history: ContextEntry[]
  memory?: SessionMemorySnapshot
  model: ModelSelection
}

type CompactContextOptions = {
  force?: boolean
  onEvent?: (event: AgentEvent) => void
  reason: string
}

type CloudRepository = {
  url: string
  startingRef?: string
}

type CodingAgentSessionOptions = {
  apiKey: string
  cwd: string
  model: ModelSelection
  force: boolean
  executionMode?: ExecutionMode
  initialState?: Partial<CodingAgentSessionSnapshot>
  context?: Partial<ContextCompactionOptions>
  sandboxOptions?: LocalSandboxOptions
}

type SendPromptOptions = {
  prompt: string
  onEvent: (event: AgentEvent) => void
}

export type CancelRunResult =
  | { cancelled: true }
  | { cancelled: false; reason: string }

const AGENT_INSTRUCTIONS = [
  "You are a lightweight coding agent running from a terminal.",
  "Work in the configured workspace.",
  "For project overview or analysis tasks, call workspace_project_snapshot once before reading individual files.",
  "For local workspace access, prefer the custom MCP tools workspace_read_file, workspace_list_files, workspace_grep, and workspace_shell. Use them when built-in Read, Glob, Grep, Shell, or Task tools fail or return no output.",
  "If the workspace_* tools are not directly visible, discover them through the custom-user-tools MCP server before declaring workspace access unavailable.",
  "Call workspace_* tools one at a time; wait for a result before issuing the next custom MCP call.",
  "Do not use Task subagents for basic local file inspection; inspect the current workspace directly with the workspace_* tools.",
  "Help the user inspect, edit, and validate code with small focused changes.",
  "Before changing files, understand the surrounding code and preserve unrelated user work.",
  "Do not claim file reading, search, or shell tools are unavailable unless an actual tool error proves it.",
  "If tool output is delayed or missing, state the concrete error or retry instead of asking the user to run local commands.",
  "When compressed prior context is provided, treat it as carry-forward memory.",
  "Keep progress updates concise and summarize the result clearly.",
].join("\n")

const COMPACTION_INSTRUCTIONS = [
  "You are compacting a coding-agent conversation so a fresh agent can continue later.",
  "Produce concise carry-forward memory, not a narrative.",
  "Preserve concrete file paths, commands, decisions, requirements, test results, unresolved issues, and next steps.",
  "Drop redundant tool chatter and transient status updates.",
  "Return strict JSON only, with no Markdown fences or explanatory prose.",
  "Do not inspect or modify files. Only summarize the transcript provided below.",
].join("\n")

const WORKSPACE_TOOL_MAX_OUTPUT_CHARS = 20_000
const WORKSPACE_TOOL_MAX_ENTRIES = 300
const WORKSPACE_TOOL_SHELL_TIMEOUT_MS = 30_000
const RUN_STREAM_IDLE_TIMEOUT_MS = 120_000

const ESTIMATED_CHARS_PER_TOKEN = 4
const MODEL_CONTEXT_USABLE_RATIO = 0.85

export const DEFAULT_CONTEXT_COMPACTION_OPTIONS: ContextCompactionOptions = {
  enabled: true,
  maxHistoryChars: 120_000,
  retainRecentChars: 24_000,
  summaryMaxChars: 16_000,
  maxCompactionInputChars: 160_000,
}

export class CodingAgentSession {
  private agent: Promise<SDKAgent> | null = null
  private agentKey: string | null = null
  private cloudRepository: CloudRepository | null = null
  private currentRun: Run | null = null
  private apiKey: string
  private readonly context: ContextCompactionOptions
  private readonly cwd: string
  private readonly force: boolean
  private readonly memory: SessionMemoryManager
  private mode: ExecutionMode
  private modelSelection: ModelSelection
  private readonly sandboxOptions?: LocalSandboxOptions

  constructor(options: CodingAgentSessionOptions) {
    this.apiKey = options.apiKey
    this.context = normalizeContextOptions(options.context)
    this.cwd = path.resolve(options.cwd)
    this.force = options.force
    this.memory = new SessionMemoryManager(this.context, options.initialState)
    this.mode = options.initialState?.executionMode ?? options.executionMode ?? "local"
    this.modelSelection = options.initialState?.model ?? options.model
    this.sandboxOptions = options.sandboxOptions
  }

  get model() {
    return this.modelSelection
  }

  get executionMode() {
    return this.mode
  }

  get workspaceCwd() {
    return this.cwd
  }

  get executionTarget() {
    return this.mode === "local"
      ? this.cwd
      : formatCloudRepository(this.cloudRepository ?? detectCloudRepository(this.cwd))
  }

  setModel(model: ModelSelection) {
    this.modelSelection = model
  }

  async setApiKey(apiKey: string) {
    if (this.currentRun) {
      throw new Error("Wait for the current run to finish before changing API key.")
    }

    const trimmed = apiKey.trim()

    if (!trimmed) {
      throw new Error("API key cannot be empty.")
    }

    this.apiKey = trimmed
    process.env.CURSOR_API_KEY = trimmed
    await this.disposeAgent()
  }

  async listModels(): Promise<ModelChoice[]> {
    const models = await Cursor.models.list({ apiKey: this.apiKey })
    const choices = disambiguateGlobalDuplicateLabels(
      dedupeModelChoices(models.flatMap(modelToChoices))
    )

    return choices.length > 0
      ? choices
      : [{ label: this.modelSelection.id, value: this.modelSelection }]
  }

  addExternalSummary(summary: string) {
    this.memory.addExternalSummary(summary)
  }

  snapshot(): CodingAgentSessionSnapshot {
    const memory = this.memory.snapshot()
    return {
      contextSummary: memory.summaryText,
      executionMode: this.mode,
      history: memory.recentEntries.map((entry) => ({ ...entry })),
      memory,
      model: this.modelSelection,
    }
  }

  contextUsage(extraPrompt = ""): ContextUsage {
    return createContextUsage(
      this.estimateContextChars(extraPrompt),
      this.context.maxHistoryChars,
      inferModelContextInfo(this.modelSelection)
    )
  }

  async setExecutionMode(mode: ExecutionMode) {
    if (this.currentRun) {
      throw new Error("Wait for the current run to finish before switching execution mode.")
    }

    if (this.mode === mode) {
      return
    }

    const previousMode = this.mode
    this.mode = mode

    try {
      await this.disposeAgent()
    } catch (error) {
      this.mode = previousMode
      throw error
    }
  }

  async dispose() {
    await this.disposeAgent()
  }

  async refreshAgent() {
    if (this.currentRun) {
      throw new Error("Wait for the current run to finish before refreshing agent.")
    }

    await this.disposeAgent()
  }

  async cancelCurrentRun(): Promise<CancelRunResult> {
    const run = this.currentRun

    if (!run) {
      return { cancelled: false, reason: "No active run to cancel." }
    }

    if (!run.supports("cancel")) {
      return {
        cancelled: false,
        reason: run.unsupportedReason("cancel") ?? "This run cannot be cancelled.",
      }
    }

    try {
      await run.cancel()
    } catch (error) {
      if (!isRunCancellationError(error)) {
        throw error
      }
    }
    return { cancelled: true }
  }

  async sendPrompt({ prompt, onEvent }: SendPromptOptions) {
    await this.compactContextIfNeeded(prompt, onEvent)

    const result = await this.tryRunPrompt(prompt, onEvent)

    if (result.ok) {
      return
    }

    if (
      result.canRetryAfterCompaction &&
      isLikelyContextLimitError(result.error) &&
      this.canCompactContext()
    ) {
      const compacted = await this.compactContext({
        force: true,
        onEvent,
        reason: "context limit error",
      })

      if (compacted.compacted) {
        const retry = await this.tryRunPrompt(prompt, onEvent)

        if (retry.ok) {
          return
        }

        throw retry.error
      }
    }

    throw result.error
  }

  private async compactContext({
    force = false,
    onEvent,
    reason,
  }: CompactContextOptions): Promise<CompactContextResult> {
    if (!this.context.enabled && !force) {
      const message = "Auto compaction is disabled."
      onEvent?.({ type: "compaction", status: "skipped", reason, message })
      return { compacted: false, reason, message }
    }

    const plan = this.memory.createCompactionPlan(force)

    if (!plan) {
      const message = "No conversation history is available to compact."
      onEvent?.({ type: "compaction", status: "skipped", reason, message })
      return { compacted: false, reason, message }
    }

    onEvent?.({
      type: "compaction",
      status: "started",
      reason,
      message: "Compacting prior context and starting a fresh agent.",
      originalChars: plan.originalChars,
      retainedChars: plan.retainedChars,
    })

    try {
      const output = await this.createContextSummary(
        plan.entriesToCompact,
        plan.previousSummaryText,
        reason
      )
      this.memory.commitCompaction({
        output,
        plan,
        reason,
        status: "success",
      })
      await this.disposeAgent()
      const summaryChars = output.summaryText.length

      const result = {
        compacted: true as const,
        reason,
        originalChars: plan.originalChars,
        retainedChars: plan.retainedChars,
        summaryChars,
      }

      onEvent?.({
        type: "compaction",
        status: "finished",
        reason,
        message: `Context compacted to ${result.summaryChars} summary chars; retained ${result.retainedChars} recent chars.`,
        originalChars: result.originalChars,
        retainedChars: result.retainedChars,
        summaryChars: result.summaryChars,
      })

      return result
    } catch (error) {
      const fallback = createFallbackSessionMemorySummary({
        entries: plan.entriesToCompact,
        existingSummary: plan.previousSummaryText,
        maxChars: this.context.summaryMaxChars,
      })
      this.memory.commitCompaction({
        errorMessage: getErrorMessage(error),
        output: fallback,
        plan,
        reason,
        status: "fallback",
      })
      await this.disposeAgent()

      onEvent?.({
        type: "compaction",
        status: "failed",
        reason,
        message: `LLM summary failed; used deterministic fallback. ${getErrorMessage(error)}`,
        originalChars: plan.originalChars,
        retainedChars: plan.retainedChars,
        summaryChars: fallback.summaryText.length,
      })

      return {
        compacted: true,
        reason,
        originalChars: plan.originalChars,
        retainedChars: plan.retainedChars,
        summaryChars: fallback.summaryText.length,
      }
    }
  }

  private async tryRunPrompt(
    prompt: string,
    onEvent: (event: AgentEvent) => void
  ): Promise<
    { ok: true } | { ok: false; canRetryAfterCompaction: boolean; error: unknown }
  > {
    const recorder = new RunHistoryRecorder(prompt)
    let commitHistory = false
    let contextLimitStatusMessage: string | undefined
    let run: Run | null = null
    let sawAgentWork = false
    let sawEvent = false

    try {
      const agent = await this.getAgent()
      const memoryContext = this.memory.buildPromptContext()
      this.memory.recordPromptSnapshot(prompt, memoryContext)
      run = await agent.send(buildPrompt(prompt, memoryContext), {
        mode: "agent",
        ...(this.mode === "local" ? { model: this.modelSelection } : {}),
        ...(this.mode === "local" && this.force ? { local: { force: true } } : {}),
      })

      this.currentRun = run

      const stream = run.stream()[Symbol.asyncIterator]()
      while (true) {
        const next = await nextSdkMessageWithIdleTimeout(
          stream,
          RUN_STREAM_IDLE_TIMEOUT_MS
        )

        if (next.done) {
          break
        }

        const event = next.value
        sawEvent = true
        emitSdkMessage(event, (agentEvent) => {
          if (isAgentWorkEvent(agentEvent)) {
            sawAgentWork = true
          }

          if (isContextLimitStatus(agentEvent)) {
            contextLimitStatusMessage = agentEvent.message
            recorder.record(agentEvent)
            return
          }

          recorder.record(agentEvent)
          onEvent(agentEvent)
        })
      }

      const result = await run.wait()

      if (result.status === "error" && contextLimitStatusMessage) {
        return {
          ok: false,
          canRetryAfterCompaction: !sawAgentWork,
          error: new Error(contextLimitStatusMessage),
        }
      }

      emitRunResult(result, recorder, onEvent)
      commitHistory = true
      return { ok: true }
    } catch (error) {
      if (isRunCancellationError(error)) {
        commitHistory = sawEvent
        onEvent({
          type: "result",
          status: "cancelled",
          message: "Run cancelled.",
        })
        return { ok: true }
      }

      if (run && isRunIdleTimeoutError(error)) {
        await cancelRunWithTimeout(run, 5000)
      }

      if (run && sawEvent && isRecoverableStreamCloseError(error)) {
        if (isHttp2StreamFrameError(error)) {
          commitHistory = sawEvent && !isLikelyContextLimitError(error)
          return {
            ok: false,
            canRetryAfterCompaction: false,
            error,
          }
        }

        try {
          const result = await run.wait()

          if (result.status === "error" && contextLimitStatusMessage) {
            return {
              ok: false,
              canRetryAfterCompaction: !sawAgentWork,
              error: new Error(contextLimitStatusMessage),
            }
          }

          emitRunResult(result, recorder, onEvent)
          commitHistory = true
          return { ok: true }
        } catch (waitError) {
          commitHistory = !isLikelyContextLimitError(waitError)
          return {
            ok: false,
            canRetryAfterCompaction: !sawAgentWork,
            error: waitError,
          }
        }
      }

      commitHistory = sawEvent && !isLikelyContextLimitError(error)
      return {
        ok: false,
        canRetryAfterCompaction: !sawAgentWork,
        error,
      }
    } finally {
      if (this.currentRun === run) {
        this.currentRun = null
      }

      if (commitHistory) {
        this.memory.appendEntries(recorder.entries())
      }
    }
  }

  private createAgent() {
    const options = {
      apiKey: this.apiKey || undefined,
      mode: "agent" as const,
      name: "Lightweight coding agent",
      model: this.modelSelection,
    }

    if (this.mode === "cloud") {
      const repository = detectCloudRepository(this.cwd)
      this.cloudRepository = repository

      return Agent.create({
        ...options,
        cloud: {
          repos: [repository],
        },
      })
    }

    this.cloudRepository = null

    return Agent.create({
      ...options,
      local: {
        customTools: createWorkspaceCustomTools(this.cwd, this.sandboxOptions),
        cwd: this.cwd,
        ...(this.sandboxOptions ? { sandboxOptions: this.sandboxOptions } : {}),
      },
    })
  }

  private async ensureAgentFresh() {
    const key = this.currentAgentKey()

    if (this.agent && this.agentKey === key) {
      return
    }

    await this.disposeAgent()
    const nextAgent = this.createAgent()
    this.agent = nextAgent
    this.agentKey = key

    try {
      await nextAgent
    } catch (error) {
      if (this.agent === nextAgent) {
        this.agent = null
        this.agentKey = null
      }

      throw error
    }
  }

  private async getAgent() {
    await this.ensureAgentFresh()

    if (!this.agent) {
      throw new Error("Agent was not initialized.")
    }

    return this.agent
  }

  private async disposeAgent() {
    const previousAgent = this.agent
    this.agent = null
    this.agentKey = null

    if (!previousAgent) {
      return
    }

    try {
      const agent = await previousAgent
      await agent[Symbol.asyncDispose]()
    } catch {
      // The agent may have failed to initialize, for example because auth or
      // the transport failed. Disposal should not surface that older failure.
    }
  }

  private currentAgentKey() {
    return JSON.stringify({
      cwd: this.mode === "local" ? this.cwd : undefined,
      mode: this.mode,
      model: modelSelectionKey(this.modelSelection),
      sandboxOptions: this.mode === "local" ? this.sandboxOptions : undefined,
    })
  }

  private canCompactContext() {
    return this.memory.canCompact()
  }

  private async compactContextIfNeeded(
    prompt: string,
    onEvent: (event: AgentEvent) => void
  ) {
    if (!this.context.enabled) {
      return
    }

    const estimatedChars = this.estimateContextChars(prompt)

    const maxHistoryChars = this.effectiveMaxHistoryChars()

    if (estimatedChars <= maxHistoryChars) {
      return
    }

    await this.compactContext({
      onEvent,
      reason: `estimated context ${estimatedChars} chars exceeded ${maxHistoryChars}`,
    })
  }

  private estimateContextChars(extraPrompt = "") {
    return this.memory.estimateContextChars(extraPrompt)
  }

  private effectiveMaxHistoryChars() {
    return createContextUsage(
      0,
      this.context.maxHistoryChars,
      inferModelContextInfo(this.modelSelection)
    ).maxChars
  }

  private async createContextSummary(
    entries: ContextEntry[],
    existingSummary: string,
    reason: string
  ) {
    const summaryAgent = await Agent.create({
      apiKey: this.apiKey,
      mode: "agent",
      name: "Context compactor",
      model: this.modelSelection,
      local: {
        cwd: this.cwd,
      },
    })

    try {
      const transcript = clampTextMiddle(
        contextEntriesToText(entries),
        this.context.maxCompactionInputChars
      )
      const run = await summaryAgent.send(
        buildCompactionPrompt({
          existingSummary,
          maxSummaryChars: this.context.summaryMaxChars,
          reason,
          transcript,
        }),
        {
          mode: "agent",
          model: this.modelSelection,
          ...(this.force ? { local: { force: true } } : {}),
        }
      )
      let streamedText = ""

      for await (const event of run.stream()) {
        streamedText += assistantTextFromSdkMessage(event)
      }

      const result = await run.wait()
      const summary = (result.result || streamedText).trim()

      if (!summary) {
        throw new Error("Compactor returned an empty summary.")
      }

      return parseSessionMemorySummary(summary, this.context.summaryMaxChars)
    } finally {
      await summaryAgent[Symbol.asyncDispose]()
    }
  }
}

export function buildPrompt(
  prompt: string,
  memoryContext: SessionMemoryPromptContext = {
    recentEntries: [],
    recentText: "",
    summaryText: "",
  }
) {
  const parts = [AGENT_INSTRUCTIONS]
  const summary = memoryContext.summaryText.trim()
  const recentText = memoryContext.recentText.trim()

  if (summary) {
    parts.push(
      "",
      "Session memory summary:",
      summary,
      "",
      "Use the session memory summary to continue this same session. If it conflicts with current workspace contents, verify against the workspace."
    )
  }

  if (recentText) {
    parts.push(
      "",
      "Recent conversation:",
      recentText,
      "",
      "Use the recent conversation as the uncompressed tail of this same session."
    )
  }

  parts.push("", "User task:", prompt)
  return parts.join("\n")
}

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

function normalizeContextOptions(
  options: Partial<ContextCompactionOptions> | undefined
): ContextCompactionOptions {
  const merged = { ...DEFAULT_CONTEXT_COMPACTION_OPTIONS, ...options }
  const maxHistoryChars = positiveIntegerOrDefault(
    merged.maxHistoryChars,
    DEFAULT_CONTEXT_COMPACTION_OPTIONS.maxHistoryChars
  )
  const retainRecentChars = Math.min(
    positiveIntegerOrDefault(
      merged.retainRecentChars,
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.retainRecentChars
    ),
    Math.max(1, maxHistoryChars - 1)
  )

  return {
    enabled: merged.enabled,
    maxHistoryChars,
    retainRecentChars,
    summaryMaxChars: positiveIntegerOrDefault(
      merged.summaryMaxChars,
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.summaryMaxChars
    ),
    maxCompactionInputChars: positiveIntegerOrDefault(
      merged.maxCompactionInputChars,
      DEFAULT_CONTEXT_COMPACTION_OPTIONS.maxCompactionInputChars
    ),
  }
}

function createContextUsage(
  usedCharsValue: number,
  localMaxCharsValue: number,
  modelContext: ModelContextInfo = { source: "unknown" }
): ContextUsage {
  const usedChars = Math.max(0, Math.ceil(usedCharsValue))
  const localBudgetChars = Math.max(1, Math.ceil(localMaxCharsValue))
  const localBudgetTokens = estimateTokenCount(localBudgetChars)
  const modelMaxTokens = positiveInteger(modelContext.tokens)
  const modelBudgetChars = modelMaxTokens
    ? Math.max(
        1,
        Math.floor(modelMaxTokens * MODEL_CONTEXT_USABLE_RATIO) *
          ESTIMATED_CHARS_PER_TOKEN
      )
    : 0
  const maxChars = modelBudgetChars || localBudgetChars
  const remainingChars = Math.max(0, maxChars - usedChars)
  const percentUsed = Math.min(100, Math.round((usedChars / maxChars) * 100))
  const percentRemaining = Math.max(0, 100 - percentUsed)

  return {
    charsPerToken: ESTIMATED_CHARS_PER_TOKEN,
    contextWindowKind: modelBudgetChars ? "model" : "local",
    localBudgetChars,
    localBudgetTokens,
    maxChars,
    maxTokens: estimateTokenCount(maxChars),
    modelContextSource: modelContext.source === "unknown" ? undefined : modelContext.source,
    modelMaxTokens: modelMaxTokens || undefined,
    percentRemaining,
    percentUsed,
    remainingChars,
    remainingTokens: estimateTokenCount(remainingChars),
    usedChars,
    usedTokens: estimateTokenCount(usedChars),
  }
}

function estimateTokenCount(chars: number) {
  return Math.ceil(Math.max(0, chars) / ESTIMATED_CHARS_PER_TOKEN)
}

type ModelContextInfo = {
  source: ModelContextSource
  tokens?: number
}

function inferModelContextInfo(model: ModelSelection | SDKModel | null | undefined): ModelContextInfo {
  if (!model) return { source: "unknown" }

  const record = model as unknown as Record<string, unknown>
  const paramTokens = inferContextTokensFromModelParams(record.params)
  if (paramTokens) return { source: "catalog", tokens: paramTokens }

  const catalogTokens = firstPositiveInteger([
    record.contextWindowTokens,
    record.contextWindow,
    record.maxContextTokens,
    record.maxInputTokens,
    record.inputTokenLimit,
    record.contextLength,
    record.tokenLimit,
  ])
  if (catalogTokens) return { source: "catalog", tokens: catalogTokens }

  const textTokens = inferContextTokensFromText([
    record.displayName,
    record.description,
    record.id,
    Array.isArray(record.aliases) ? record.aliases.join(" ") : "",
  ])
  if (textTokens) return { source: "description", tokens: textTokens }

  const idTokens = inferContextTokensFromModelId(String(record.id || ""))
  if (idTokens) return { source: "model-id", tokens: idTokens }

  return { source: "unknown" }
}

function inferContextTokensFromModelParams(params: unknown) {
  if (!Array.isArray(params)) return 0

  const contextParam = params.find((param) => {
    if (!param || typeof param !== "object") return false
    return (param as { id?: unknown }).id === "context"
  }) as { value?: unknown } | undefined

  if (contextParam) {
    const tokens = inferContextTokensFromText([`context ${contextParam.value}`])
    if (tokens) return tokens
  }

  return inferContextTokensFromText(
    params.map((param) => {
      if (!param || typeof param !== "object") return ""
      const item = param as { id?: unknown; value?: unknown }
      return `${item.id || ""} ${item.value || ""}`
    })
  )
}

function inferContextTokensFromText(values: unknown[]) {
  const text = values.map((value) => String(value || "")).join(" ")
  if (!text.trim()) return 0

  const contextualPatterns = [
    /(\d+(?:\.\d+)?)\s*(m|million)\s*(?:token|tokens|context|ctx|window)/i,
    /(\d+(?:\.\d+)?)\s*k\s*(?:token|tokens|context|ctx|window)/i,
    /(\d{4,})\s*(?:token|tokens|context|ctx|window)/i,
    /(?:token|tokens|context|ctx|window)\D{0,24}(\d+(?:\.\d+)?)\s*(m|million|k)?/i,
  ]

  for (const pattern of contextualPatterns) {
    const match = pattern.exec(text)
    const tokens = tokensFromMatch(match)
    if (tokens) return tokens
  }

  return 0
}

function inferContextTokensFromModelId(id: string) {
  const normalized = id.toLowerCase()
  const explicit = inferContextTokensFromText([normalized.replace(/[-_]/g, " ")])
  if (explicit) return explicit

  if (/composer[-_ ]?2/.test(normalized)) return 200_000
  if (/claude/.test(normalized)) return 200_000
  if (/gemini/.test(normalized)) return 1_000_000
  if (/gpt[-_ ]?4\.1/.test(normalized)) return 1_000_000
  if (/gpt[-_ ]?4o/.test(normalized)) return 128_000
  if (/\bo[34](?:[-_]|$)/.test(normalized)) return 200_000

  return 0
}

function tokensFromMatch(match: RegExpExecArray | null) {
  if (!match) return 0
  const number = Number(match[1])
  if (!Number.isFinite(number) || number <= 0) return 0
  const unit = String(match[2] || "").toLowerCase()
  const multiplier =
    unit === "m" || unit === "million"
      ? 1_000_000
      : unit === "k"
        ? 1_000
        : 1
  const tokens = Math.round(number * multiplier)
  return tokens >= 1_000 ? tokens : 0
}

function firstPositiveInteger(values: unknown[]) {
  for (const value of values) {
    const number = positiveInteger(value)
    if (number) return number
  }
  return 0
}

function positiveInteger(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0
}

function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

class RunStreamIdleTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `Agent run produced no SDK events for ${formatDuration(timeoutMs)}; cancelled the stalled run.`
    )
    this.name = "RunStreamIdleTimeoutError"
  }
}

function isRunIdleTimeoutError(error: unknown) {
  return error instanceof RunStreamIdleTimeoutError
}

function nextSdkMessageWithIdleTimeout(
  stream: AsyncIterator<SDKMessage>,
  timeoutMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return Promise.race([
    stream.next(),
    new Promise<IteratorResult<SDKMessage>>((_, reject) => {
      timeout = setTimeout(
        () => reject(new RunStreamIdleTimeoutError(timeoutMs)),
        timeoutMs
      )
      timeout.unref?.()
    }),
  ]).finally(() => {
    if (timeout) {
      clearTimeout(timeout)
    }
  })
}

async function cancelRunWithTimeout(run: Run, timeoutMs: number) {
  if (!run.supports("cancel")) {
    return
  }

  await Promise.race([
    run.cancel().catch(() => undefined),
    new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, timeoutMs)
      timeout.unref?.()
    }),
  ])
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
  return relative ? relative : "."
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

    throw new Error(`ripgrep failed: ${getChildProcessErrorOutput(error)}`)
  }
}

function runWorkspaceShell(
  root: string,
  workingDirectory: string,
  command: string,
  timeoutMs: number,
  maxOutputBytes: number
) {
  try {
    const stdout = execFileSync("sh", ["-lc", command], {
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

class RunHistoryRecorder {
  private assistantText = ""
  private resultText = ""
  private readonly statusEntries: ContextEntry[] = []
  private readonly taskEntries = new Map<string, ContextEntry>()
  private readonly toolEntries = new Map<string, ContextEntry>()

  constructor(private readonly prompt: string) {}

  record(event: AgentEvent) {
    switch (event.type) {
      case "assistant_delta":
        this.assistantText += event.text
        break
      case "tool": {
        const key = event.callId ?? event.name
        const result =
          event.result && event.status === "error" ? `=> ${event.result}` : undefined
        this.toolEntries.set(key, {
          role: "tool",
          text: [
            event.status,
            event.name,
            event.params ? `(${event.params})` : undefined,
            result,
          ]
            .filter(Boolean)
            .join(" "),
        })
        break
      }
      case "status":
        if (event.status === "ERROR" || event.message) {
          this.statusEntries.push({
            role: "status",
            text: [event.status, event.message, event.errorCode && `code=${event.errorCode}`]
              .filter(Boolean)
              .join(" "),
          })
        }
        break
      case "task": {
        const text = [event.status, event.text].filter(Boolean).join(" ")
        if (text.trim()) {
          this.taskEntries.set(event.status ?? text, { role: "task", text })
        }
        break
      }
      case "result":
        this.resultText = [
          `status=${event.status}`,
          event.durationMs ? `duration=${formatDuration(event.durationMs)}` : undefined,
          event.usage?.inputTokens ? `input=${event.usage.inputTokens}` : undefined,
          event.usage?.outputTokens ? `output=${event.usage.outputTokens}` : undefined,
          event.message ? `message=${event.message}` : undefined,
          event.errorCode ? `code=${event.errorCode}` : undefined,
        ]
          .filter(Boolean)
          .join(" ")
        break
      case "compaction":
      case "thinking":
        break
    }
  }

  entries(): ContextEntry[] {
    return [
      { role: "user", text: this.prompt },
      ...this.statusEntries,
      ...this.taskEntries.values(),
      ...this.toolEntries.values(),
      this.assistantText.trim()
        ? { role: "assistant" as const, text: this.assistantText.trim() }
        : undefined,
      this.resultText ? { role: "result" as const, text: this.resultText } : undefined,
    ].filter((entry): entry is ContextEntry => Boolean(entry?.text.trim()))
  }
}

function buildCompactionPrompt({
  existingSummary,
  maxSummaryChars,
  reason,
  transcript,
}: {
  existingSummary: string
  maxSummaryChars: number
  reason: string
  transcript: string
}) {
  return [
    COMPACTION_INSTRUCTIONS,
    "",
    `Compaction reason: ${reason}`,
    `Maximum summary length: ${maxSummaryChars} characters.`,
    "",
    "Required JSON schema:",
    SESSION_MEMORY_JSON_SCHEMA,
    "",
    "Existing session memory summary:",
    existingSummary.trim() || "(none)",
    "",
    "Transcript to compact:",
    transcript,
    "",
    "Return only the updated JSON object.",
  ].join("\n")
}

function assistantTextFromSdkMessage(event: SDKMessage) {
  if (event.type !== "assistant") {
    return ""
  }

  return event.message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
}

function emitRunResult(
  result: RunResult,
  recorder: RunHistoryRecorder,
  onEvent: (event: AgentEvent) => void
) {
  const usage = (result as { usage?: TokenUsage }).usage
  const message = result.status === "error" ? summarizeRunResultError(result) : undefined
  const errorCode = extractStringField(result, "errorCode")
  const resultEvent: AgentEvent = {
    type: "result",
    status: result.status,
    durationMs: result.durationMs,
    usage,
    message,
    errorCode,
  }

  recorder.record(resultEvent)
  onEvent(resultEvent)
}

function summarizeRunResultError(result: RunResult) {
  const record = result as unknown as Record<string, unknown>
  const detail = firstCompactDetail([
    record.result,
    record.error,
    record.message,
    record.errorMessage,
    record.details,
    record.detail,
    record.reason,
    record.errorCode,
  ])

  if (!detail || detail.toLowerCase() === result.status.toLowerCase()) {
    return undefined
  }

  return clampInlineText(detail, 2400)
}

function extractStringField(value: unknown, field: string) {
  if (!value || typeof value !== "object") {
    return undefined
  }

  const raw = (value as Record<string, unknown>)[field]
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined
}

function firstCompactDetail(values: unknown[]) {
  for (const value of values) {
    const text = compactErrorDetail(value)
    if (text) {
      return text
    }
  }

  return undefined
}

function compactErrorDetail(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (value instanceof Error) {
    const parts = [
      value.name && value.name !== "Error" ? `${value.name}:` : undefined,
      value.message,
    ].filter(Boolean)
    return compactInlineText(parts.join(" "))
  }

  if (typeof value === "string") {
    return compactInlineText(value)
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const nested = firstCompactDetail([
      record.message,
      record.error,
      record.errorMessage,
      record.details,
      record.detail,
      record.reason,
      record.code,
    ])

    if (nested) {
      return nested
    }

    return compactInlineText(stringifyToolResult(value))
  }

  return compactInlineText(String(value))
}

function clampTextMiddle(value: string, maxChars: number) {
  const text = value.trim()

  if (text.length <= maxChars) {
    return text
  }

  const marker = "\n[... middle omitted during compaction ...]\n"
  const remaining = Math.max(0, maxChars - marker.length)
  const head = Math.ceil(remaining / 2)
  const tail = Math.floor(remaining / 2)

  return `${text.slice(0, head).trimEnd()}${marker}${text.slice(text.length - tail).trimStart()}`
}

function isLikelyContextLimitError(error: unknown) {
  return isLikelyContextLimitMessage(getErrorMessage(error))
}

function isRecoverableStreamCloseError(error: unknown) {
  const text = getErrorMessage(error).toLowerCase()

  return (
    text.includes("nghttp2_frame_size_error") ||
    (text.includes("stream closed") && text.includes("frame_size"))
  )
}

function isHttp2StreamFrameError(error: unknown) {
  const text = getErrorMessage(error).toLowerCase()

  return (
    text.includes("nghttp2_frame_size_error") ||
    text.includes("err_http2_stream_error")
  )
}

function isRunCancellationError(error: unknown) {
  const text = getErrorText(error).toLowerCase()

  return (
    text.includes("connecterror") &&
    text.includes("canceled") &&
    text.includes("operation was aborted")
  ) || (
    text.includes("aborterror") &&
    text.includes("operation was aborted")
  )
}

function isContextLimitStatus(
  event: AgentEvent
): event is Extract<AgentEvent, { type: "status" }> & { message: string } {
  return (
    event.type === "status" &&
    event.status === "ERROR" &&
    Boolean(event.message && isLikelyContextLimitMessage(event.message))
  )
}

function isAgentWorkEvent(event: AgentEvent) {
  return (
    (event.type === "assistant_delta" && event.text.trim().length > 0) ||
    event.type === "tool" ||
    event.type === "task"
  )
}

function isLikelyContextLimitMessage(message: string) {
  const text = message.toLowerCase()

  if (text.includes("rate limit")) {
    return false
  }

  return (
    text.includes("context") ||
    text.includes("too many tokens") ||
    text.includes("token limit") ||
    text.includes("input too large") ||
    text.includes("maximum input") ||
    text.includes("413") ||
    (text.includes("exceed") && text.includes("token"))
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause
    return [error.name, error.message, cause ? getErrorText(cause) : ""]
      .filter(Boolean)
      .join(" ")
  }

  return String(error)
}

export function formatModelLabel(model: ModelSelection) {
  const params = model.params?.map((param) => param.value).filter(Boolean)
  return params?.length ? `${model.id} (${params.join(", ")})` : model.id
}

export function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`
  }

  return `${(ms / 1000).toFixed(1)}s`
}

function modelToChoices(model: SDKModel): ModelChoice[] {
  const variants = [...(model.variants ?? [])]
  if (variants.length === 0) {
    return [modelToChoice(model)]
  }

  variants.sort((left, right) => Number(Boolean(right.isDefault)) - Number(Boolean(left.isDefault)))
  return variants.map((variant) => modelVariantToChoice(model, variant))
}

function modelToChoice(model: SDKModel): ModelChoice {
  const context = inferModelContextInfo(model)
  return {
    label: model.id,
    value: { id: model.id },
    description: model.description,
    contextWindowTokens: context.tokens,
    contextWindowSource: context.source === "unknown" ? undefined : context.source,
  }
}

function modelVariantToChoice(
  model: SDKModel,
  variant: NonNullable<SDKModel["variants"]>[number]
): ModelChoice {
  const value: ModelSelection = {
    id: model.id,
    ...(variant.params.length > 0
      ? { params: variant.params.map((param) => ({ ...param })) }
      : {}),
  }
  const context = inferVariantContextInfo(model, variant, value)
  return {
    label: modelSelectionKey(value),
    value,
    description: variant.description ?? model.description,
    contextWindowTokens: context.tokens,
    contextWindowSource: context.source === "unknown" ? undefined : context.source,
  }
}

function inferVariantContextInfo(
  model: SDKModel,
  variant: NonNullable<SDKModel["variants"]>[number],
  selection: ModelSelection
): ModelContextInfo {
  const contextParam = selection.params?.find((param) => param.id === "context")
  const contextParamTokens = contextParam
    ? inferContextTokensFromText([`context ${contextParam.value}`])
    : 0
  if (contextParamTokens) {
    return { source: "catalog", tokens: contextParamTokens }
  }

  const paramTokens = inferContextTokensFromText(
    selection.params?.map((param) => `${param.id} ${param.value}`) ?? []
  )
  if (paramTokens) {
    return { source: "description", tokens: paramTokens }
  }

  const variantTokens = inferContextTokensFromText([
    variant.displayName,
    variant.description,
  ])
  if (variantTokens) {
    return { source: "description", tokens: variantTokens }
  }

  return inferModelContextInfo(model)
}

function dedupeModelChoices(choices: ModelChoice[]) {
  const bySelection = new Map<string, ModelChoice>()

  for (const choice of choices) {
    const key = modelSelectionKey(choice.value)
    const existing = bySelection.get(key)

    if (!existing) {
      bySelection.set(key, choice)
      continue
    }

    bySelection.set(key, {
      ...existing,
      contextWindowSource: existing.contextWindowSource ?? choice.contextWindowSource,
      contextWindowTokens: existing.contextWindowTokens ?? choice.contextWindowTokens,
      description: existing.description ?? choice.description,
    })
  }

  return Array.from(bySelection.values())
}

function disambiguateGlobalDuplicateLabels(choices: ModelChoice[]) {
  const labelCounts = choices.reduce((counts, choice) => {
    counts.set(choice.label, (counts.get(choice.label) ?? 0) + 1)
    return counts
  }, new Map<string, number>())
  const readableKeys = new Set<string>()
  const result: ModelChoice[] = []

  for (const choice of choices) {
    const label = (labelCounts.get(choice.label) ?? 0) > 1
      ? addSelectionDetail(choice)
      : choice.label
    const readableKey = normalizeLabel(label)

    if (readableKeys.has(readableKey)) {
      continue
    }

    readableKeys.add(readableKey)
    result.push({ ...choice, label })
  }

  return result
}

function addSelectionDetail(choice: ModelChoice) {
  const detail = choice.value.id

  if (!detail || normalizeLabel(choice.label) === normalizeLabel(detail)) {
    return choice.label
  }

  return `${choice.label} - ${detail}`
}

function modelSelectionKey(selection: ModelSelection) {
  const params = [...(selection.params ?? [])]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((param) => `${param.id}=${param.value}`)
    .join("&")

  return params ? `${selection.id}?${params}` : selection.id
}

function detectCloudRepository(cwd: string): CloudRepository {
  const remote = runGit(cwd, ["config", "--get", "remote.origin.url"])

  if (!remote) {
    throw new Error("Cloud mode requires a git repository with remote.origin.url set.")
  }

  const url = normalizeGitHubRemote(remote)

  if (!url) {
    throw new Error("Cloud mode currently expects remote.origin.url to point at GitHub.")
  }

  const branch = runGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"])
  const startingRef = branch && branch !== "HEAD" ? branch : undefined

  return startingRef ? { url, startingRef } : { url }
}

function runGit(cwd: string, args: string[]) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return undefined
  }
}

function normalizeGitHubRemote(remote: string) {
  const trimmed = remote.trim().replace(/\.git$/, "")
  const sshMatch = trimmed.match(/^git@github\.com:(.+\/.+)$/)
  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/(.+\/.+)$/)
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/(.+\/.+)$/)
  const repoPath = sshMatch?.[1] ?? sshUrlMatch?.[1] ?? httpsMatch?.[1]

  return repoPath ? `https://github.com/${repoPath}` : undefined
}

function formatCloudRepository(repository: CloudRepository) {
  return repository.startingRef
    ? `${repository.url}#${repository.startingRef}`
    : repository.url
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function emitSdkMessage(event: SDKMessage, emit: (event: AgentEvent) => void) {
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") {
          emit({ type: "assistant_delta", text: block.text })
        } else {
          emit({
            type: "tool",
            callId: block.id,
            name: block.name,
            params: summarizeToolArgs(block.name, block.input),
            status: "requested",
          })
        }
      }
      break
    case "thinking":
      emit({ type: "thinking", text: event.text })
      break
    case "tool_call":
      emit({
        type: "tool",
        callId: event.call_id,
        name: event.name,
        params: summarizeToolArgs(event.name, event.args),
        result: summarizeToolResult(event.result, Boolean(event.truncated?.result)),
        status: event.status,
      })
      break
    case "status":
      emit({
        type: "status",
        status: event.status,
        message: event.message,
        errorCode: extractStringField(event, "errorCode"),
      })
      break
    case "task":
      emit({ type: "task", status: event.status, text: event.text })
      break
    default:
      break
  }
}

function summarizeToolResult(result: unknown, truncated: boolean) {
  if (result === undefined) {
    return undefined
  }

  const text = compactInlineText(stringifyToolResult(result))
  if (!text) {
    return undefined
  }

  const suffix = truncated ? " [truncated by SDK]" : ""
  return `${clampInlineText(text, 1200 - suffix.length)}${suffix}`
}

function stringifyToolResult(result: unknown) {
  if (typeof result === "string") {
    return result
  }

  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

function compactInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function clampInlineText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxChars - 24)).trimEnd()} [truncated]`
}

function summarizeToolArgs(toolName: string, args: unknown) {
  if (!args || typeof args !== "object") {
    return undefined
  }

  const record = args as Record<string, unknown>
  const records = collectToolArgRecords(record)
  const keyGroups = getToolSummaryKeys(toolName)
  const parts: string[] = []
  const seen = new Set<string>()

  for (const candidate of records) {
    for (const keys of keyGroups) {
      const part = summarizeFirstValue(candidate, keys)
      if (part && !seen.has(part)) {
        seen.add(part)
        parts.push(part)
      }

      if (parts.length >= 4) {
        break
      }
    }

    if (parts.length >= 4) {
      break
    }
  }

  return parts.length > 0 ? parts.join(" ") : undefined
}

function getToolSummaryKeys(toolName: string) {
  const name = toolName.toLowerCase()

  if (name.includes("read")) {
    return [["path", "filePath", "target_file", "absolutePath"], ["offset"], ["limit"]]
  }

  if (name.includes("glob")) {
    return [["pattern", "glob", "glob_pattern"], ["path", "cwd", "target_directory"]]
  }

  if (name.includes("grep") || name.includes("search")) {
    return [["pattern", "query"], ["path"], ["glob"], ["type"]]
  }

  if (name.includes("shell") || name.includes("terminal") || name.includes("command")) {
    return [["command", "cmd"], ["cwd", "working_directory"]]
  }

  if (name.includes("edit") || name.includes("write") || name.includes("patch")) {
    return [["path", "target_file", "file"], ["instruction"]]
  }

  return [
    ["tool", "name", "method"],
    ["path", "file", "filePath", "target_file", "absolutePath"],
    ["root", "cwd", "working_directory"],
    ["pattern", "query", "command", "cmd"],
  ]
}

function collectToolArgRecords(record: Record<string, unknown>) {
  const records: Record<string, unknown>[] = [record]
  const nestedKeys = ["args", "arguments", "input", "params", "payload"]

  for (const key of nestedKeys) {
    const nested = toRecord(record[key])
    if (nested) {
      records.push(nested)
    }
  }

  return records
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value !== "string") {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function summarizeFirstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    const formatted = formatArgValue(value)

    if (formatted) {
      return `${key}=${formatted}`
    }
  }

  return undefined
}

function formatArgValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return shortenValue(value.replace(/\s+/g, " ").trim())
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (Array.isArray(value)) {
    const items: string[] = value
      .slice(0, 3)
      .map(formatArgValue)
      .filter((item): item is string => Boolean(item))
    return items.length > 0 ? `[${items.join(",")}]` : undefined
  }

  return undefined
}

function shortenValue(value: string, maxLength = 80) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}
