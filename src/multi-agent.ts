import { setMaxListeners } from "node:events"
import {
  Agent,
  type McpServerConfig,
  type ModelSelection,
  type Run,
  type RunResult,
  type SDKAgent,
  type SDKMessage,
} from "@cursor/sdk"

import {
  createWorkspaceCustomTools,
  type LocalSandboxOptions,
  type TokenUsage,
} from "./agent.js"

export type MultiAgentTaskStatus =
  | "PENDING"
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "SKIPPED"
  | "CANCELLED"

export type MultiAgentRunStatus =
  | "PLANNING"
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "CANCELLED"

export type MultiAgentTaskState = {
  id: string
  title: string
  dependsOn: string[]
  modelLabel: string
  prompt: string
  status: MultiAgentTaskStatus
  resultText?: string
  errorMessage?: string
  startedAt?: number
  finishedAt?: number
  durationMs?: number
  usage?: TokenUsage
}

export type MultiAgentRunState = {
  id: string
  title: string
  prompt: string
  status: MultiAgentRunStatus
  message?: string
  startedAt: number
  finishedAt?: number
  tasks: MultiAgentTaskState[]
}

export type MultiAgentRunEvent = {
  type: "multi_agent_state"
  state: MultiAgentRunState
}

type MultiAgentTaskPlan = {
  id: string
  title: string
  dependsOn: string[]
  prompt: string
}

type MultiAgentRunnerOptions = {
  apiKey: string
  cwd: string
  force: boolean
  instructions?: string
  mcpServers?: Record<string, McpServerConfig>
  model: ModelSelection
  modelLabel: string
  prompt: string
  sandboxOptions?: LocalSandboxOptions
  onEvent: (event: MultiAgentRunEvent) => void
}

const MAX_TASKS = 6
const STREAM_CAP = 5000
const UPSTREAM_SNIPPET_CAP = 2200
const DEFAULT_TASK_TIMEOUT_MS = 20 * 60 * 1000
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 5 * 60 * 1000
const WAIT_AFTER_STREAM_GRACE_MS = 15 * 1000
const ABORT_SIGNAL_LISTENER_LIMIT = 100

export class MultiAgentRunner {
  private readonly activeRuns = new Set<Run>()
  private readonly state: MultiAgentRunState
  private cancelRequested = false
  private publishTimer: NodeJS.Timeout | undefined

  constructor(private readonly options: MultiAgentRunnerOptions) {
    this.state = {
      id: createEntityId("multi"),
      title: titleFromPrompt(options.prompt),
      prompt: options.prompt,
      status: "PLANNING",
      startedAt: Date.now(),
      tasks: [],
    }
  }

  snapshot(): MultiAgentRunState {
    return cloneState(this.state)
  }

  async cancel() {
    this.cancelRequested = true
    this.state.status = "CANCELLED"
    this.state.message = "Cancellation requested."
    this.publish(true)

    await Promise.all(
      Array.from(this.activeRuns).map(async (run) => {
        if (!supportsRunCancel(run)) {
          return
        }

        await run.cancel().catch(() => undefined)
      })
    )
  }

  async run(): Promise<MultiAgentRunState> {
    setMaxListeners(ABORT_SIGNAL_LISTENER_LIMIT)
    this.publish(true)

    try {
      const plan = await this.createPlan()
      if (this.cancelRequested) {
        throw new CancelledError()
      }

      this.state.tasks = plan.map((task) => ({
        id: task.id,
        title: task.title,
        dependsOn: task.dependsOn,
        modelLabel: this.options.modelLabel,
        prompt: task.prompt,
        status: "PENDING",
      }))
      this.state.status = "RUNNING"
      this.state.message = `Planned ${this.state.tasks.length} subagents.`
      this.publish(true)

      await this.runRanks(computeRanks(this.state.tasks))
      this.finishRun()
      return this.snapshot()
    } catch (error) {
      if (this.cancelRequested) {
        this.markUnfinished("CANCELLED", "Cancelled.")
      } else {
        this.state.status = "ERROR"
        this.state.message = getErrorMessage(error)
        this.markUnfinished("ERROR", this.state.message)
      }
      this.state.finishedAt = Date.now()
      this.publish(true)
      return this.snapshot()
    } finally {
      if (this.publishTimer) {
        clearTimeout(this.publishTimer)
        this.publishTimer = undefined
      }
    }
  }

  private async createPlan(): Promise<MultiAgentTaskPlan[]> {
    const fallback = fallbackPlan(this.options.prompt)

    try {
      const planner = await this.createAgent("Multi-agent planner")
      let run: Run | undefined
      let text = ""

      try {
        run = await planner.send(
          buildPlannerPrompt(this.options.prompt, this.options.instructions),
          {
            mode: "agent",
            ...(this.options.mcpServers &&
            Object.keys(this.options.mcpServers).length > 0
              ? { mcpServers: this.options.mcpServers }
              : {}),
            ...(this.options.force ? { local: { force: true } } : {}),
          }
        )
        this.activeRuns.add(run)

        for await (const event of run.stream()) {
          text += assistantTextFromSdkMessage(event)
        }

        const result = await run.wait()
        const planText = (result.result || text).trim()
        return normalizePlan(parsePlanJson(planText))
      } finally {
        if (run) {
          this.activeRuns.delete(run)
        }
        await disposeAgent(planner)
      }
    } catch (error) {
      if (this.cancelRequested) {
        throw new CancelledError()
      }

      this.state.message = `Planner failed; using fallback plan. ${getErrorMessage(error)}`
      this.publish(true)
      return fallback
    }
  }

  private async runRanks(ranks: MultiAgentTaskState[][]) {
    for (const rank of ranks) {
      if (this.cancelRequested) {
        break
      }

      for (const task of rank) {
        const failedDeps = task.dependsOn.filter((depId) => {
          const dep = this.findTask(depId)
          return dep && dep.status !== "FINISHED"
        })

        if (failedDeps.length > 0) {
          task.status = "SKIPPED"
          task.finishedAt = Date.now()
          task.durationMs = 0
          task.errorMessage = `Skipped because upstream task(s) failed: ${failedDeps.join(", ")}`
          this.publish(true)
        }
      }

      const ready = rank.filter((task) => task.status === "PENDING")
      await Promise.all(ready.map((task) => this.runTask(task)))
    }
  }

  private async runTask(task: MultiAgentTaskState) {
    if (this.cancelRequested) {
      task.status = "CANCELLED"
      task.finishedAt = Date.now()
      this.publish(true)
      return
    }

    const agent = await this.createAgent(`Multi-agent: ${task.title}`)
    let run: Run | undefined
    const startedAt = Date.now()
    const deadline = startedAt + DEFAULT_TASK_TIMEOUT_MS
    let result: RunResult | undefined

    task.status = "RUNNING"
    task.startedAt = startedAt
    this.publish(true)

    try {
      const prompt = buildTaskPrompt(task, this.state, this.options.instructions)
      run = await agent.send(prompt, {
        mode: "agent",
        ...(this.options.mcpServers && Object.keys(this.options.mcpServers).length > 0
          ? { mcpServers: this.options.mcpServers }
          : {}),
        ...(this.options.force ? { local: { force: true } } : {}),
      })
      this.activeRuns.add(run)

      const iterator = run.stream()[Symbol.asyncIterator]()
      while (true) {
        if (this.cancelRequested) {
          throw new CancelledError()
        }

        const timeoutForNext = Math.min(
          deadline - Date.now(),
          DEFAULT_STREAM_IDLE_TIMEOUT_MS
        )
        if (timeoutForNext <= 0) {
          throw new TimeoutError(
            `Task ${task.id} exceeded ${formatDuration(DEFAULT_TASK_TIMEOUT_MS)}.`
          )
        }

        const next = await withTimeout(
          iterator.next(),
          timeoutForNext,
          `Task ${task.id} produced no stream events within ${formatDuration(timeoutForNext)}.`
        )

        if (next.done) {
          break
        }

        const chunk = assistantTextFromSdkMessage(next.value)
        if (chunk) {
          task.resultText = appendBounded(task.resultText ?? "", chunk, STREAM_CAP)
          this.publish()
        }
      }

      const waitGraceMs = Math.min(deadline - Date.now(), WAIT_AFTER_STREAM_GRACE_MS)
      if (waitGraceMs <= 0) {
        throw new TimeoutError(
          `Task ${task.id} exceeded ${formatDuration(DEFAULT_TASK_TIMEOUT_MS)}.`
        )
      }

      result = await withTimeout(
        run.wait(),
        waitGraceMs,
        `Task ${task.id} did not finalize after stream completion.`
      )

      task.finishedAt = Date.now()
      task.durationMs = task.finishedAt - startedAt
      task.usage = (result as { usage?: TokenUsage }).usage
      task.status = result.status === "finished" ? "FINISHED" : "ERROR"
      if (task.status === "ERROR") {
        task.errorMessage = `Run ${result.status}`
      }
      if (result.result && !task.resultText?.trim()) {
        task.resultText = appendBounded("", result.result, STREAM_CAP)
      }
    } catch (error) {
      if (run && (isTimeoutError(error) || this.cancelRequested)) {
        await cancelRun(run)
      }

      task.finishedAt = Date.now()
      task.durationMs = task.finishedAt - startedAt
      task.status = error instanceof CancelledError ? "CANCELLED" : "ERROR"
      task.errorMessage =
        error instanceof CancelledError ? "Cancelled." : getErrorMessage(error)
    } finally {
      if (run) {
        this.activeRuns.delete(run)
      }
      await disposeAgent(agent)
      this.publish(true)
    }
  }

  private finishRun() {
    if (this.cancelRequested) {
      this.markUnfinished("CANCELLED", "Cancelled.")
      this.state.status = "CANCELLED"
      this.state.message = "Cancelled."
    } else if (this.state.tasks.some((task) => task.status !== "FINISHED")) {
      this.state.status = "ERROR"
      this.state.message = "One or more subagents failed."
    } else {
      this.state.status = "FINISHED"
      this.state.message = "All subagents finished."
    }

    this.state.finishedAt = Date.now()
    this.publish(true)
  }

  private markUnfinished(status: MultiAgentTaskStatus, message: string) {
    const now = Date.now()
    for (const task of this.state.tasks) {
      if (["FINISHED", "ERROR", "SKIPPED", "CANCELLED"].includes(task.status)) {
        continue
      }
      task.status = status
      task.finishedAt = now
      task.durationMs = task.startedAt ? now - task.startedAt : 0
      task.errorMessage = message
    }
  }

  private publish(force = false) {
    if (!force) {
      if (this.publishTimer) {
        return
      }

      this.publishTimer = setTimeout(() => {
        this.publishTimer = undefined
        this.options.onEvent({ type: "multi_agent_state", state: this.snapshot() })
      }, 300)
      return
    }

    if (this.publishTimer) {
      clearTimeout(this.publishTimer)
      this.publishTimer = undefined
    }
    this.options.onEvent({ type: "multi_agent_state", state: this.snapshot() })
  }

  private findTask(taskId: string) {
    return this.state.tasks.find((task) => task.id === taskId)
  }

  private createAgent(name: string): Promise<SDKAgent> {
    return Agent.create({
      apiKey: this.options.apiKey,
      mode: "agent",
      name,
      model: this.options.model,
      local: {
        customTools: createWorkspaceCustomTools(
          this.options.cwd,
          this.options.sandboxOptions
        ),
        cwd: this.options.cwd,
        ...(this.options.sandboxOptions
          ? { sandboxOptions: this.options.sandboxOptions }
          : {}),
      },
    })
  }
}

function buildPlannerPrompt(prompt: string, instructions = "") {
  return [
    "Create a small multi-agent execution plan for a coding task.",
    "Return only JSON. Do not use Markdown fences.",
    "Schema:",
    '{"title":"short title","tasks":[{"id":"kebab-id","title":"short title","depends_on":[],"subtask_prompt":"self-contained prompt"}]}',
    "",
    "Rules:",
    `- Use ${MAX_TASKS} tasks or fewer.`,
    "- Prefer two independent read-only discovery tasks first when useful.",
    "- Only one task should be responsible for writing implementation changes.",
    "- Verification tasks must depend on implementation tasks.",
    "- Every task prompt must be self-contained and mention whether it is read-only or may edit files.",
    "- Use ASCII ids.",
    renderProjectInstructions(instructions),
    "",
    "User task:",
    prompt,
  ].filter(Boolean).join("\n")
}

function buildTaskPrompt(
  task: MultiAgentTaskState,
  run: MultiAgentRunState,
  instructions = ""
) {
  const upstream = buildUpstreamContext(task, run)
  return [
    "You are one subagent in a local multi-agent coding run.",
    `Overall task: ${run.prompt}`,
    `Subtask id: ${task.id}`,
    `Subtask title: ${task.title}`,
    "",
    "Coordination rules:",
    "- Focus only on this subtask.",
    "- For project overview or analysis tasks, call workspace_project_snapshot once before reading individual files.",
    "- For local workspace access, prefer custom MCP tools workspace_read_file, workspace_list_files, workspace_grep, and workspace_shell over built-in file/shell tools.",
    "- Call workspace_* tools one at a time; wait for a result before issuing the next custom MCP call.",
    "- Preserve unrelated user work.",
    "- Only edit files if this subtask explicitly asks for implementation or file changes.",
    "- If this is a read-only task, inspect and report findings without changing files.",
    "- End with a concise result summary, including files changed or commands run when relevant.",
    renderProjectInstructions(instructions),
    "",
    upstream,
    "",
    "Subtask prompt:",
    task.prompt,
  ]
    .filter(Boolean)
    .join("\n")
}

function renderProjectInstructions(instructions = "") {
  const text = instructions.trim()
  if (!text) {
    return ""
  }

  return [
    "",
    "Project instructions:",
    text,
    "",
    "Follow these project instructions unless they conflict with higher-priority system or developer instructions.",
  ].join("\n")
}

function buildUpstreamContext(task: MultiAgentTaskState, run: MultiAgentRunState) {
  if (task.dependsOn.length === 0) {
    return ""
  }

  const lines = ["Upstream task results:"]
  for (const depId of task.dependsOn) {
    const dep = run.tasks.find((item) => item.id === depId)
    if (!dep) {
      continue
    }

    lines.push("")
    lines.push(`## ${dep.id} (${dep.status})`)
    lines.push(
      truncate(
        dep.resultText || dep.errorMessage || "No result text.",
        UPSTREAM_SNIPPET_CAP
      )
    )
  }

  return lines.join("\n")
}

function parsePlanJson(text: string) {
  const source = text.trim()
  try {
    return JSON.parse(source)
  } catch {}

  const json = extractBalancedJsonObject(source)
  if (!json) {
    throw new Error("Planner did not return a JSON object.")
  }

  return JSON.parse(json)
}

function extractBalancedJsonObject(text: string) {
  const start = text.indexOf("{")
  if (start === -1) {
    return ""
  }

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === "\\") {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) {
      continue
    }
    if (char === "{") {
      depth += 1
    } else if (char === "}") {
      depth -= 1
      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return ""
}

function normalizePlan(raw: unknown): MultiAgentTaskPlan[] {
  const record = asRecord(raw)
  const rawTasks = Array.isArray(record.tasks) ? record.tasks : []
  const tasks = rawTasks
    .slice(0, MAX_TASKS)
    .map(normalizeTaskPlan)
    .filter((task): task is MultiAgentTaskPlan => Boolean(task))

  if (tasks.length === 0) {
    throw new Error("Planner returned no tasks.")
  }

  const ids = new Set<string>()
  for (const task of tasks) {
    if (ids.has(task.id)) {
      throw new Error(`Planner returned duplicate task id: ${task.id}`)
    }
    ids.add(task.id)
  }

  for (const task of tasks) {
    task.dependsOn = task.dependsOn.filter((depId) => ids.has(depId) && depId !== task.id)
  }

  detectCycle(tasks)
  return tasks
}

function normalizeTaskPlan(raw: unknown): MultiAgentTaskPlan | null {
  const record = asRecord(raw)
  const id = slugify(optionalString(record.id) ?? optionalString(record.title) ?? "")
  const prompt =
    optionalString(record.subtask_prompt) ??
    optionalString(record.prompt) ??
    optionalString(record.task)
  if (!id || !prompt) {
    return null
  }

  const dependsRaw = Array.isArray(record.depends_on)
    ? record.depends_on
    : Array.isArray(record.dependsOn)
      ? record.dependsOn
      : []

  return {
    id,
    title: optionalString(record.title) ?? titleFromPrompt(prompt),
    dependsOn: dependsRaw
      .filter((value): value is string => typeof value === "string")
      .map(slugify)
      .filter(Boolean),
    prompt,
  }
}

function fallbackPlan(prompt: string): MultiAgentTaskPlan[] {
  return [
    {
      id: "context-scan",
      title: "Context scan",
      dependsOn: [],
      prompt: [
        "Read-only task. Inspect the relevant project structure and code paths for the requested change.",
        "Do not edit files. Return concise findings, likely files to touch, and risks.",
        "",
        `Requested change: ${prompt}`,
      ].join("\n"),
    },
    {
      id: "test-scan",
      title: "Validation scan",
      dependsOn: [],
      prompt: [
        "Read-only task. Identify available tests, build commands, lint/typecheck commands, and validation gaps.",
        "Do not edit files. Return the exact commands that should be run after implementation.",
        "",
        `Requested change: ${prompt}`,
      ].join("\n"),
    },
    {
      id: "implementation-plan",
      title: "Implementation plan",
      dependsOn: ["context-scan", "test-scan"],
      prompt: [
        "Read-only task. Combine upstream findings into a concise implementation plan.",
        "Do not edit files. Call out file ownership, order of edits, and validation steps.",
        "",
        `Requested change: ${prompt}`,
      ].join("\n"),
    },
    {
      id: "implement",
      title: "Implement",
      dependsOn: ["implementation-plan"],
      prompt: [
        "Implementation task. Make the requested code changes in the workspace.",
        "Keep the change scoped and preserve unrelated user work.",
        "",
        `Requested change: ${prompt}`,
      ].join("\n"),
    },
    {
      id: "verify",
      title: "Verify",
      dependsOn: ["implement"],
      prompt: [
        "Verification task. Run the relevant checks found earlier if practical, inspect the resulting diff, and report remaining risk.",
        "Only edit files if a small fix is clearly required by a failed check.",
        "",
        `Requested change: ${prompt}`,
      ].join("\n"),
    },
  ]
}

function computeRanks(tasks: MultiAgentTaskState[]): MultiAgentTaskState[][] {
  const remaining = new Map<string, number>()
  const byId = new Map<string, MultiAgentTaskState>()
  const dependents = new Map<string, string[]>()

  for (const task of tasks) {
    remaining.set(task.id, task.dependsOn.length)
    byId.set(task.id, task)
    dependents.set(task.id, [])
  }

  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      dependents.get(depId)?.push(task.id)
    }
  }

  const ranks: MultiAgentTaskState[][] = []
  let frontier = tasks.filter((task) => remaining.get(task.id) === 0)

  while (frontier.length > 0) {
    ranks.push(frontier)
    const next: MultiAgentTaskState[] = []
    for (const task of frontier) {
      for (const childId of dependents.get(task.id) ?? []) {
        const count = (remaining.get(childId) ?? 0) - 1
        remaining.set(childId, count)
        if (count === 0) {
          const child = byId.get(childId)
          if (child) {
            next.push(child)
          }
        }
      }
    }
    frontier = next
  }

  if (ranks.reduce((count, rank) => count + rank.length, 0) !== tasks.length) {
    throw new Error("Multi-agent task graph contains a cycle.")
  }

  return ranks
}

function detectCycle(tasks: MultiAgentTaskPlan[]) {
  const byId = new Map(tasks.map((task) => [task.id, task]))
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const visit = (taskId: string) => {
    if (visited.has(taskId)) {
      return
    }
    if (visiting.has(taskId)) {
      throw new Error(`Planner returned a cycle at ${taskId}.`)
    }

    visiting.add(taskId)
    for (const depId of byId.get(taskId)?.dependsOn ?? []) {
      visit(depId)
    }
    visiting.delete(taskId)
    visited.add(taskId)
  }

  for (const task of tasks) {
    visit(task.id)
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

async function cancelRun(run: Run) {
  if (!supportsRunCancel(run)) {
    return
  }

  await run.cancel().catch(() => undefined)
}

function supportsRunCancel(run: Run): run is Run & { cancel: () => Promise<void> } {
  return (
    typeof run.supports === "function" &&
    run.supports("cancel") &&
    typeof run.cancel === "function"
  )
}

function assistantTextFromSdkMessage(event: SDKMessage) {
  if (event.type !== "assistant") {
    return ""
  }

  let text = ""
  for (const block of event.message.content) {
    if (block.type === "text") {
      text += block.text
    }
  }
  return text
}

async function disposeAgent(agent: SDKAgent) {
  const disposable = agent as unknown as {
    [Symbol.asyncDispose]?: () => Promise<void>
  }
  await disposable[Symbol.asyncDispose]?.().catch(() => undefined)
}

function appendBounded(current: string, chunk: string, cap: number) {
  const next = current + chunk
  if (next.length <= cap) {
    return next
  }

  return `[...truncated ${next.length - cap} earlier chars...]\n${next.slice(-cap)}`
}

function cloneState(state: MultiAgentRunState): MultiAgentRunState {
  return JSON.parse(JSON.stringify(state)) as MultiAgentRunState
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim()
  return compact.length > 42 ? `${compact.slice(0, 39)}...` : compact || "Multi-agent run"
}

function truncate(text: string, cap: number) {
  return text.length <= cap ? text : `${text.slice(0, cap)}\n[...truncated...]`
}

function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`
  }
  return `${(ms / 1000).toFixed(1)}s`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function createEntityId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TimeoutError"
  }
}

class CancelledError extends Error {
  constructor() {
    super("Cancelled.")
    this.name = "CancelledError"
  }
}

function isTimeoutError(error: unknown) {
  return error instanceof TimeoutError
}
