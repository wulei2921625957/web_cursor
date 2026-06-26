import { execFileSync } from "node:child_process"
import {
  Agent,
  Cursor,
  type ModelSelection,
  type Run,
  type RunResult,
  type SDKAgent,
  type SDKMessage,
  type SDKModel,
} from "@cursor/sdk"

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
      status: string
    }
  | { type: "status"; status: string; message?: string }
  | { type: "task"; status?: string; text?: string }
  | { type: "result"; status: string; durationMs?: number; usage?: TokenUsage }

export type ModelChoice = {
  label: string
  value: ModelSelection
  description?: string
}

export type TokenUsage = {
  inputTokens?: number
  outputTokens?: number
}

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

export type ContextEntry = {
  role: "assistant" | "result" | "status" | "task" | "tool" | "user"
  text: string
}

export type CodingAgentSessionSnapshot = {
  contextSummary: string
  executionMode: ExecutionMode
  history: ContextEntry[]
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
  "Do not inspect or modify files. Only summarize the transcript provided below.",
].join("\n")

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
  private contextSummary = ""
  private currentRun: Run | null = null
  private apiKey: string
  private readonly context: ContextCompactionOptions
  private readonly cwd: string
  private readonly force: boolean
  private history: ContextEntry[] = []
  private mode: ExecutionMode
  private modelSelection: ModelSelection
  private readonly sandboxOptions?: LocalSandboxOptions

  constructor(options: CodingAgentSessionOptions) {
    this.apiKey = options.apiKey
    this.context = normalizeContextOptions(options.context)
    this.contextSummary = stringOrEmpty(options.initialState?.contextSummary)
    this.cwd = options.cwd
    this.force = options.force
    this.history = normalizeHistoryEntries(options.initialState?.history)
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

  async reset() {
    this.contextSummary = ""
    this.history = []
    await this.disposeAgent()
  }

  addExternalSummary(summary: string) {
    const text = summary.trim()
    if (!text) {
      return
    }

    this.contextSummary = [this.contextSummary, text].filter(Boolean).join("\n\n")
    this.history.push({ role: "result", text })
  }

  snapshot(): CodingAgentSessionSnapshot {
    return {
      contextSummary: this.contextSummary,
      executionMode: this.mode,
      history: this.history.map((entry) => ({ ...entry })),
      model: this.modelSelection,
    }
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

    await run.cancel()
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

  async compactContext({
    force = false,
    onEvent,
    reason,
  }: CompactContextOptions): Promise<CompactContextResult> {
    if (!this.context.enabled && !force) {
      const message = "Auto compaction is disabled."
      onEvent?.({ type: "compaction", status: "skipped", reason, message })
      return { compacted: false, reason, message }
    }

    const plan = this.createCompactionPlan(force)

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
      const summary = await this.createContextSummary(plan.entriesToCompact, reason)
      this.contextSummary = clampText(summary, this.context.summaryMaxChars)
      this.history = plan.retainedEntries
      await this.disposeAgent()

      const result = {
        compacted: true as const,
        reason,
        originalChars: plan.originalChars,
        retainedChars: plan.retainedChars,
        summaryChars: this.contextSummary.length,
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
      const fallback = createFallbackSummary(
        this.contextSummary,
        plan.entriesToCompact,
        this.context.summaryMaxChars
      )
      this.contextSummary = fallback
      this.history = plan.retainedEntries
      await this.disposeAgent()

      onEvent?.({
        type: "compaction",
        status: "failed",
        reason,
        message: `LLM summary failed; used deterministic fallback. ${getErrorMessage(error)}`,
        originalChars: plan.originalChars,
        retainedChars: plan.retainedChars,
        summaryChars: this.contextSummary.length,
      })

      return {
        compacted: true,
        reason,
        originalChars: plan.originalChars,
        retainedChars: plan.retainedChars,
        summaryChars: this.contextSummary.length,
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
      run = await agent.send(buildPrompt(prompt, this.contextSummary), {
        ...(this.mode === "local" ? { model: this.modelSelection } : {}),
        ...(this.mode === "local" && this.force ? { local: { force: true } } : {}),
      })

      this.currentRun = run

      for await (const event of run.stream()) {
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
        this.appendHistory(recorder.entries())
      }
    }
  }

  private createAgent() {
    const options = {
      apiKey: this.apiKey || undefined,
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

  private async replaceAgent() {
    await this.disposeAgent()
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
    const modelKey =
      this.mode === "cloud" ? modelSelectionKey(this.modelSelection) : undefined
    return JSON.stringify({ mode: this.mode, model: modelKey })
  }

  private appendHistory(entries: ContextEntry[]) {
    this.history.push(...entries.filter((entry) => entry.text.trim()))
  }

  private canCompactContext() {
    return this.history.length > 0 || Boolean(this.contextSummary)
  }

  private async compactContextIfNeeded(
    prompt: string,
    onEvent: (event: AgentEvent) => void
  ) {
    if (!this.context.enabled) {
      return
    }

    const estimatedChars = this.estimateContextChars(prompt)

    if (estimatedChars <= this.context.maxHistoryChars) {
      return
    }

    await this.compactContext({
      onEvent,
      reason: `estimated context ${estimatedChars} chars exceeded ${this.context.maxHistoryChars}`,
    })
  }

  private estimateContextChars(extraPrompt = "") {
    return (
      this.contextSummary.length +
      contextEntriesToText(this.history).length +
      extraPrompt.length
    )
  }

  private createCompactionPlan(force: boolean) {
    if (!this.history.length) {
      return undefined
    }

    const retainedEntries = takeRecentEntries(
      this.history,
      this.context.retainRecentChars
    )
    const retainedCount = retainedEntries.length
    const compactableCount = this.history.length - retainedCount
    const entriesToCompact =
      compactableCount > 0 ? this.history.slice(0, compactableCount) : this.history
    const finalRetainedEntries = compactableCount > 0 ? retainedEntries : []
    const originalChars = this.estimateContextChars()

    if (!force && entriesToCompact.length === 0) {
      return undefined
    }

    return {
      entriesToCompact,
      originalChars,
      retainedChars: contextEntriesToText(finalRetainedEntries).length,
      retainedEntries: finalRetainedEntries,
    }
  }

  private async createContextSummary(entries: ContextEntry[], reason: string) {
    const summaryAgent = await Agent.create({
      apiKey: this.apiKey,
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
          existingSummary: this.contextSummary,
          maxSummaryChars: this.context.summaryMaxChars,
          reason,
          transcript,
        }),
        {
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

      return summary
    } finally {
      await summaryAgent[Symbol.asyncDispose]()
    }
  }
}

export function buildPrompt(prompt: string, contextSummary = "") {
  const parts = [AGENT_INSTRUCTIONS]

  if (contextSummary.trim()) {
    parts.push(
      "",
      "Compressed prior context:",
      contextSummary.trim(),
      "",
      "Use the compressed prior context to continue the same task history. If it conflicts with current workspace contents, verify against the workspace."
    )
  }

  parts.push("", "User task:", prompt)
  return parts.join("\n")
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

function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : ""
}

function normalizeHistoryEntries(
  entries: ContextEntry[] | undefined
): ContextEntry[] {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .filter(
      (entry): entry is ContextEntry =>
        Boolean(entry) &&
        isContextEntryRole(entry.role) &&
        typeof entry.text === "string" &&
        entry.text.trim().length > 0
    )
    .map((entry) => ({ role: entry.role, text: entry.text }))
}

function isContextEntryRole(value: unknown): value is ContextEntry["role"] {
  return (
    value === "assistant" ||
    value === "result" ||
    value === "status" ||
    value === "task" ||
    value === "tool" ||
    value === "user"
  )
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
        this.toolEntries.set(key, {
          role: "tool",
          text: [
            event.status,
            event.name,
            event.params ? `(${event.params})` : undefined,
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
            text: [event.status, event.message].filter(Boolean).join(" "),
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

function takeRecentEntries(entries: ContextEntry[], maxChars: number) {
  const retained: ContextEntry[] = []
  let chars = 0

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    const entryChars = contextEntryToText(entry).length

    if (retained.length > 0 && chars + entryChars > maxChars) {
      break
    }

    retained.unshift(entry)
    chars += entryChars
  }

  return retained
}

function contextEntriesToText(entries: ContextEntry[]) {
  return entries.map(contextEntryToText).join("\n\n")
}

function contextEntryToText(entry: ContextEntry) {
  return `## ${entry.role}\n${entry.text.trim()}`
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
    "Existing compressed memory:",
    existingSummary.trim() || "(none)",
    "",
    "Transcript to compact:",
    transcript,
    "",
    "Return only the updated compressed memory.",
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
  const resultEvent: AgentEvent = {
    type: "result",
    status: result.status,
    durationMs: result.durationMs,
    usage,
  }

  recorder.record(resultEvent)
  onEvent(resultEvent)
}

function createFallbackSummary(
  existingSummary: string,
  entries: ContextEntry[],
  maxChars: number
) {
  const transcript = contextEntriesToText(entries)
  const sections = [
    existingSummary.trim()
      ? `Existing compressed memory:\n${existingSummary.trim()}`
      : undefined,
    `Deterministic compacted history:\n${clampTextMiddle(transcript, maxChars)}`,
  ].filter(Boolean)

  return clampText(sections.join("\n\n"), maxChars)
}

function clampText(value: string, maxChars: number) {
  const text = value.trim()

  if (text.length <= maxChars) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxChars - 38)).trimEnd()}\n[truncated during compaction]`
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
  const baseLabel = model.displayName || model.id
  const variants = model.variants ?? []

  if (variants.length === 0) {
    return [
      {
        label: baseLabel,
        value: { id: model.id },
        description: model.description,
      },
    ]
  }

  const choices = variants.map((variant) => ({
    label: buildVariantLabel(model, variant.displayName),
    value: { id: model.id, params: variant.params },
    description: variant.description ?? model.description,
  }))

  return disambiguateDuplicateLabels(dedupeModelChoices(choices), model)
}

function buildVariantLabel(model: SDKModel, variantDisplayName: string) {
  const baseLabel = model.displayName || model.id
  const variantLabel = variantDisplayName.trim()

  if (!variantLabel || labelsMatch(baseLabel, variantLabel)) {
    return baseLabel
  }

  return `${baseLabel} - ${variantLabel}`
}

function disambiguateDuplicateLabels(
  choices: ModelChoice[],
  model: SDKModel
): ModelChoice[] {
  const labelCounts = choices.reduce((counts, choice) => {
    counts.set(choice.label, (counts.get(choice.label) ?? 0) + 1)
    return counts
  }, new Map<string, number>())

  return choices.map((choice) => {
    if ((labelCounts.get(choice.label) ?? 0) <= 1) {
      return choice
    }

    const paramsLabel = formatParamsLabel(choice.value.params ?? [], model)
    return paramsLabel
      ? { ...choice, label: `${choice.label} - ${paramsLabel}` }
      : choice
  })
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
  const detail = selectionDetail(choice.value)

  if (!detail || labelsMatch(choice.label, detail)) {
    return choice.label
  }

  return `${choice.label} - ${detail}`
}

function selectionDetail(selection: ModelSelection) {
  if (selection.params?.length) {
    return selection.params
      .map((param) => labelFromId(param.value))
      .filter(Boolean)
      .join(", ")
  }

  return selection.id
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

function formatParamsLabel(
  params: NonNullable<ModelSelection["params"]>,
  model: SDKModel
) {
  return params
    .map((param) => {
      const parameter = model.parameters?.find((item) => item.id === param.id)
      const value = parameter?.values.find((item) => item.value === param.value)
      const parameterLabel = parameter?.displayName || labelFromId(param.id)
      const valueLabel = value?.displayName || labelFromId(param.value)

      if (labelsMatch(parameterLabel, valueLabel)) {
        return valueLabel
      }

      return `${parameterLabel}: ${valueLabel}`
    })
    .filter(Boolean)
    .join(", ")
}

function labelsMatch(left: string, right: string) {
  return normalizeLabel(left) === normalizeLabel(right)
}

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function labelFromId(id: string) {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
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
        status: event.status,
      })
      break
    case "status":
      emit({ type: "status", status: event.status, message: event.message })
      break
    case "task":
      emit({ type: "task", status: event.status, text: event.text })
      break
    default:
      break
  }
}

function summarizeToolArgs(toolName: string, args: unknown) {
  if (!args || typeof args !== "object") {
    return undefined
  }

  const record = args as Record<string, unknown>
  const keyGroups = getToolSummaryKeys(toolName)
  const parts: string[] = []

  for (const keys of keyGroups) {
    const part = summarizeFirstValue(record, keys)
    if (part) {
      parts.push(part)
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
    ["path", "file", "target_file"],
    ["pattern", "query", "command"],
  ]
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
