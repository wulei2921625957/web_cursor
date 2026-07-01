import { execFileSync } from "node:child_process"
import { setMaxListeners } from "node:events"
import {
  Agent,
  type AgentDefinition,
  type AgentOptions,
  type LocalAgentStore,
  type McpServerConfig,
  type ModelSelection,
  type Run,
  type RunResult,
  type SDKAgent,
  type SDKMessage,
  type TextBlock,
  type ToolUseBlock,
} from "@cursor/sdk"

import {
  createSdkUserMessage,
  createWorkspaceCustomTools,
  type AgentPromptImage,
  type LocalSandboxOptions,
  type TokenUsage,
} from "./agent.js"
import {
  permissionInstructions,
  sdkAutoReviewEnabled,
  sdkCustomToolsEnabled,
  sdkSandboxOptions,
} from "./permissions.js"
import {
  createSandboxOptionsForPermissionMode,
  normalizePermissionMode,
  type PermissionMode,
  type ShellApprovalHandler,
} from "./permissions.js"

export type MultiAgentTaskAccessMode = "read" | "write"

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
  accessMode: MultiAgentTaskAccessMode
  agentName: string
  changedFiles?: string[]
  id: string
  title: string
  dependsOn: string[]
  modelLabel: string
  permissionBoundary?: string
  prompt: string
  status: MultiAgentTaskStatus
  resultText?: string
  errorMessage?: string
  startedAt?: number
  finishedAt?: number
  durationMs?: number
  steering?: MultiAgentTaskSteering[]
  toolUsage?: MultiAgentToolUsage[]
  usage?: TokenUsage
}

export type MultiAgentTaskSteering = {
  appliedToPrompt: boolean
  createdAt: number
  id: string
  text: string
}

export type MultiAgentToolUsage = {
  callId?: string
  name: string
  params?: string
  result?: string
  status: string
}

export type MultiAgentProfile = {
  description?: string
  instructions?: string
  model?: ModelSelection
  name: string
  permissionMode?: PermissionMode
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

type MultiAgentRunnerOptions = {
  apiKey: string
  cwd: string
  force: boolean
  images?: AgentPromptImage[]
  instructions?: string
  mcpServers?: Record<string, McpServerConfig>
  model: ModelSelection
  modelLabel: string
  prompt: string
  profiles?: MultiAgentProfile[]
  sandboxOptions?: LocalSandboxOptions
  sdkStore?: LocalAgentStore
  shellApprovalHandler?: ShellApprovalHandler
  workspaceRoots?: string[]
  onEvent: (event: MultiAgentRunEvent) => void
}

const MAX_TASKS = 6
const STREAM_CAP = 5000
const TOOL_USAGE_CAP = 30
const STEERING_NOTE_CAP = 2400
const ABORT_SIGNAL_LISTENER_LIMIT = 100

export class MultiAgentRunner {
  private readonly activeRuns = new Set<Run>()
  private readonly sdkTaskIdsByCallId = new Map<string, string>()
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

  async cancelTask(taskId: string) {
    const task = this.findTask(taskId)
    if (!task || ["FINISHED", "ERROR", "SKIPPED", "CANCELLED"].includes(task.status)) {
      return false
    }

    task.errorMessage =
      "SDK subagent runs cannot be cancelled individually; cancel the whole multi-agent run instead."
    this.publish(true)
    return false
  }

  addTaskSteering(taskId: string, text: string) {
    const task = this.findTask(taskId)
    if (!task || ["FINISHED", "ERROR", "SKIPPED", "CANCELLED"].includes(task.status)) {
      return false
    }

    const noteText = text.trim()
    if (!noteText) {
      throw new Error("steering 不能为空。")
    }

    task.steering = [
      ...(task.steering ?? []),
      {
        appliedToPrompt: false,
        createdAt: Date.now(),
        id: createEntityId("steer"),
        text: truncate(noteText, STEERING_NOTE_CAP),
      },
    ]
    this.publish(true)
    return true
  }

  async run(): Promise<MultiAgentRunState> {
    setMaxListeners(ABORT_SIGNAL_LISTENER_LIMIT)
    const sdkSubagents = buildSdkSubagentCatalog(
      this.options.profiles ?? [],
      this.options.modelLabel,
      this.options.sandboxOptions
    )
    const coordinator = createCoordinatorTask(this.options.modelLabel, this.options.sandboxOptions)
    this.state.tasks = [coordinator]
    this.state.message = "Preparing SDK subagents."
    this.publish(true)

    let agent: SDKAgent | undefined
    let run: Run | undefined

    try {
      if (this.cancelRequested) {
        throw new CancelledError()
      }

      agent = await this.createSdkCoordinatorAgent(sdkSubagents.definitions)
      if (this.cancelRequested) {
        throw new CancelledError()
      }
      this.state.status = "RUNNING"
      this.state.message = `SDK subagents enabled: ${sdkSubagents.items
        .map((item) => item.key)
        .join(", ")}.`
      coordinator.status = "RUNNING"
      coordinator.startedAt = Date.now()
      this.publish(true)

      run = await agent.send(
        createSdkUserMessage(
          buildSdkMultiAgentPrompt({
            instructions: this.options.instructions,
            prompt: this.options.prompt,
            sandboxOptions: this.options.sandboxOptions,
            subagents: sdkSubagents.items,
            workspaceRoots: this.options.workspaceRoots ?? [],
          }),
          this.options.images
        ),
        {
          mode: "agent",
          ...(this.options.mcpServers && Object.keys(this.options.mcpServers).length > 0
            ? { mcpServers: this.options.mcpServers }
            : {}),
          model: this.options.model,
          ...(this.options.force ? { local: { force: true } } : {}),
        }
      )
      this.activeRuns.add(run)

      for await (const event of run.stream()) {
        if (this.cancelRequested) {
          throw new CancelledError()
        }
        this.handleSdkCoordinatorEvent(event, coordinator, sdkSubagents.byKey)
      }

      const result = await run.wait()
      this.finishSdkRun(result, coordinator)
      return this.snapshot()
    } catch (error) {
      if (this.cancelRequested) {
        this.markUnfinished("CANCELLED", "Cancelled.")
        this.state.status = "CANCELLED"
        this.state.message = "Cancelled."
      } else {
        this.state.status = "ERROR"
        this.state.message = getErrorMessage(error)
        this.markUnfinished("ERROR", this.state.message)
      }
      this.state.finishedAt = Date.now()
      this.publish(true)
      return this.snapshot()
    } finally {
      if (run) {
        this.activeRuns.delete(run)
      }
      if (agent) {
        await disposeAgent(agent)
      }
      if (this.publishTimer) {
        clearTimeout(this.publishTimer)
        this.publishTimer = undefined
      }
    }
  }

  private handleSdkCoordinatorEvent(
    event: SDKMessage,
    coordinator: MultiAgentTaskState,
    subagentsByKey: Map<string, SdkSubagentCatalogItem>
  ) {
    if (event.type === "status") {
      this.state.message = event.message || event.status
      this.publish()
      return
    }

    if (event.type === "task") {
      this.state.message = event.text || event.status || this.state.message
      this.publish()
      return
    }

    if (event.type === "usage") {
      coordinator.usage = event.usage
      this.publish()
      return
    }

    const taskCalls = sdkSubagentToolCallsFromMessage(event)
    if (taskCalls.length > 0) {
      for (const call of taskCalls) {
        this.applySdkSubagentCall(call, subagentsByKey)
      }
      this.publish()
    } else {
      const toolUsage = toolUsageFromSdkMessage(event)
      if (toolUsage.length > 0) {
        coordinator.toolUsage = appendToolUsage(coordinator.toolUsage, toolUsage)
        this.publish()
      }
    }

    const chunk = assistantTextFromSdkMessage(event)
    if (chunk) {
      coordinator.resultText = appendBounded(coordinator.resultText ?? "", chunk, STREAM_CAP)
      this.publish()
    }
  }

  private applySdkSubagentCall(
    call: SdkSubagentToolCall,
    subagentsByKey: Map<string, SdkSubagentCatalogItem>
  ) {
    const task = this.upsertSdkSubagentTask(call, subagentsByKey)
    task.toolUsage = appendToolUsage(task.toolUsage, [call.toolUsage])

    if (call.status === "requested" || call.status === "running") {
      if (task.status === "PENDING") {
        task.status = "RUNNING"
        task.startedAt = Date.now()
      }
      return
    }

    task.finishedAt = Date.now()
    task.durationMs = task.startedAt ? task.finishedAt - task.startedAt : 0
    task.changedFiles = readWorkspaceChangedFiles(this.options.cwd)

    const result = describeSdkSubagentResult(call.result)
    if (call.status === "error" || result.errorText) {
      task.status = "ERROR"
      task.errorMessage = result.errorText || "SDK subagent failed."
    } else {
      task.status = "FINISHED"
      task.resultText = appendBounded(task.resultText ?? "", result.resultText, STREAM_CAP)
      if (result.durationMs !== undefined) {
        task.durationMs = result.durationMs
      }
    }
  }

  private upsertSdkSubagentTask(
    call: SdkSubagentToolCall,
    subagentsByKey: Map<string, SdkSubagentCatalogItem>
  ) {
    const args = asRecord(call.args)
    const requestedName = sdkSubagentNameFromArgs(args)
    const catalogItem = requestedName ? subagentsByKey.get(requestedName) : undefined
    const taskId = this.sdkTaskIdForCall(call, requestedName)
    let task = this.findTask(taskId)

    if (!task) {
      task = {
        accessMode: catalogItem?.accessMode ?? inferSdkSubagentAccessMode(args, requestedName),
        agentName: catalogItem?.displayName ?? requestedName ?? "SDK subagent",
        dependsOn: [],
        id: taskId,
        modelLabel: catalogItem?.modelLabel ?? this.options.modelLabel,
        permissionBoundary:
          catalogItem?.permissionBoundary ??
          permissionBoundaryForMode(undefined, this.options.sandboxOptions),
        prompt: optionalText(args.prompt) ?? summarizeToolPayload(args) ?? "",
        status: "PENDING",
        title: optionalText(args.description) ?? requestedName ?? "SDK subagent",
      }
      this.state.tasks.push(task)
    }

    task.agentName = catalogItem?.displayName ?? requestedName ?? task.agentName
    task.prompt = optionalText(args.prompt) ?? task.prompt
    task.permissionBoundary =
      catalogItem?.permissionBoundary ?? task.permissionBoundary
    task.modelLabel = catalogItem?.modelLabel ?? task.modelLabel
    return task
  }

  private sdkTaskIdForCall(call: SdkSubagentToolCall, requestedName: string | undefined) {
    if (call.callId) {
      const existing = this.sdkTaskIdsByCallId.get(call.callId)
      if (existing) {
        return existing
      }
    }

    const base = call.callId || requestedName || optionalText(asRecord(call.args).description) || "sdk-subagent"
    const id = slugify(base) || createEntityId("sdk-task")
    if (call.callId) {
      this.sdkTaskIdsByCallId.set(call.callId, id)
    }
    return id
  }

  private finishSdkRun(result: RunResult, coordinator: MultiAgentTaskState) {
    const now = Date.now()
    coordinator.finishedAt = now
    coordinator.durationMs = coordinator.startedAt ? now - coordinator.startedAt : 0
    coordinator.usage = (result as { usage?: TokenUsage }).usage ?? coordinator.usage
    if (result.result && !coordinator.resultText?.trim()) {
      coordinator.resultText = appendBounded("", result.result, STREAM_CAP)
    }

    if (this.cancelRequested || result.status === "cancelled") {
      coordinator.status = "CANCELLED"
      this.markUnfinished("CANCELLED", "Cancelled.")
      this.state.status = "CANCELLED"
      this.state.message = "Cancelled."
    } else if (result.status !== "finished") {
      coordinator.status = "ERROR"
      coordinator.errorMessage = `Run ${result.status}`
      this.markUnfinished("ERROR", coordinator.errorMessage)
      this.state.status = "ERROR"
      this.state.message = coordinator.errorMessage
    } else if (this.state.tasks.some((task) => task.status === "ERROR")) {
      coordinator.status = "FINISHED"
      this.state.status = "ERROR"
      this.state.message = "One or more SDK subagents failed."
    } else {
      coordinator.status = "FINISHED"
      this.state.status = "FINISHED"
      this.state.message = "SDK subagents finished."
    }

    for (const task of this.state.tasks) {
      if (task.status === "RUNNING" || task.status === "PENDING") {
        task.status =
          this.state.status === "FINISHED"
            ? "FINISHED"
            : this.state.status === "CANCELLED"
              ? "CANCELLED"
              : "ERROR"
        task.finishedAt = task.finishedAt ?? now
        task.durationMs = task.startedAt ? now - task.startedAt : 0
      }
    }
    coordinator.changedFiles = readWorkspaceChangedFiles(this.options.cwd)
    this.state.finishedAt = now
    this.publish(true)
  }

  private createSdkCoordinatorAgent(
    agents: Record<string, AgentDefinition>
  ): Promise<SDKAgent> {
    const customTools = sdkCustomToolsEnabled(this.options.sandboxOptions)
      ? createWorkspaceCustomTools(
          this.options.cwd,
          this.options.sandboxOptions,
          this.options.shellApprovalHandler,
          this.options.workspaceRoots
        )
      : undefined
    const options: AgentOptions = {
      agents,
      apiKey: this.options.apiKey,
      mode: "agent",
      name: "SDK multi-agent coordinator",
      model: this.options.model,
      ...(this.options.mcpServers && Object.keys(this.options.mcpServers).length > 0
        ? { mcpServers: this.options.mcpServers }
        : {}),
      local: {
        autoReview: sdkAutoReviewEnabled(this.options.sandboxOptions),
        ...(customTools ? { customTools } : {}),
        cwd: sdkLocalCwd(this.options.cwd, this.options.workspaceRoots),
        ...(this.options.sdkStore ? { store: this.options.sdkStore } : {}),
        ...(this.options.sandboxOptions
          ? { sandboxOptions: sdkSandboxOptions(this.options.sandboxOptions) }
          : {}),
      },
    }
    return Agent.create(options)
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

}

type SdkSubagentCatalogItem = {
  accessMode: MultiAgentTaskAccessMode
  definition: AgentDefinition
  displayName: string
  key: string
  modelLabel: string
  permissionBoundary: string
}

type SdkSubagentCatalog = {
  byKey: Map<string, SdkSubagentCatalogItem>
  definitions: Record<string, AgentDefinition>
  items: SdkSubagentCatalogItem[]
}

type SdkSubagentToolCall = {
  args?: unknown
  callId?: string
  result?: unknown
  status: "requested" | "running" | "completed" | "error"
  toolUsage: MultiAgentToolUsage
}

function buildSdkSubagentCatalog(
  profiles: MultiAgentProfile[],
  parentModelLabel: string,
  parentSandboxOptions?: LocalSandboxOptions
): SdkSubagentCatalog {
  const rawItems =
    profiles.length > 0
      ? profiles.map((profile) =>
          catalogItemFromProfile(profile, parentModelLabel, parentSandboxOptions)
        )
      : defaultSdkSubagentCatalogItems(parentModelLabel, parentSandboxOptions)

  const usedKeys = new Set<string>()
  const items = rawItems.map((item) => {
    const key = uniqueSubagentKey(item.key, usedKeys)
    return { ...item, key }
  })
  const definitions = Object.fromEntries(
    items.map((item) => [item.key, item.definition])
  )

  return {
    byKey: new Map(items.map((item) => [item.key, item])),
    definitions,
    items,
  }
}

function catalogItemFromProfile(
  profile: MultiAgentProfile,
  parentModelLabel: string,
  parentSandboxOptions?: LocalSandboxOptions
): SdkSubagentCatalogItem {
  const permissionMode = profile.permissionMode
  const accessMode =
    permissionMode === "read_only" || /read|review|research|scan/i.test(profile.name)
      ? "read"
      : "write"
  const sandboxOptions = permissionMode
    ? createSandboxOptionsForPermissionMode(permissionMode, permissionMode === "read_only")
    : parentSandboxOptions
  const displayName = profile.name.trim() || defaultAgentName(accessMode)
  const description =
    profile.description?.trim() ||
    (accessMode === "read"
      ? "Use for read-only investigation, review, and analysis."
      : "Use for implementation, verification, and other write-capable work.")
  const prompt = [
    `You are the ${displayName} SDK subagent.`,
    description,
    "",
    permissionInstructions(sandboxOptions),
    profile.instructions ? ["", "Profile instructions:", profile.instructions].join("\n") : "",
    "",
    "Follow the parent coordinator's task prompt exactly. Keep the response concise and include files changed, commands run, failures, and remaining risks when relevant.",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    accessMode,
    definition: {
      description,
      model: profile.model ?? "inherit",
      prompt,
    },
    displayName,
    key: slugify(displayName) || defaultSdkSubagentKey(accessMode),
    modelLabel: profile.model ? formatModelSelection(profile.model) : parentModelLabel,
    permissionBoundary: permissionBoundaryForMode(permissionMode, parentSandboxOptions),
  }
}

function defaultSdkSubagentCatalogItems(
  parentModelLabel: string,
  parentSandboxOptions?: LocalSandboxOptions
): SdkSubagentCatalogItem[] {
  return [
    defaultSdkSubagentCatalogItem({
      accessMode: "read",
      description:
        "Use for read-only workspace discovery, code review, risk analysis, and validation planning.",
      displayName: "Read-only reviewer",
      key: "read-only-reviewer",
      parentModelLabel,
      parentSandboxOptions,
      permissionMode: "read_only",
      promptLines: [
        "Inspect and report only. Do not edit files, write patches, install packages, start servers, or run validation commands unless the coordinator explicitly asks for a non-mutating inspection command.",
        "Return concise findings, exact paths, and risks.",
      ],
    }),
    defaultSdkSubagentCatalogItem({
      accessMode: "write",
      description:
        "Use for focused implementation work that may edit files in the configured workspace roots.",
      displayName: "Implementation writer",
      key: "implementation-writer",
      parentModelLabel,
      parentSandboxOptions,
      permissionMode: undefined,
      promptLines: [
        "Make only the requested edits and preserve unrelated user work.",
        "Summarize changed files and commands actually run.",
      ],
    }),
    defaultSdkSubagentCatalogItem({
      accessMode: "write",
      description:
        "Use for targeted verification, test execution, build/typecheck checks, and small follow-up fixes when required.",
      displayName: "Verification runner",
      key: "verification-runner",
      parentModelLabel,
      parentSandboxOptions,
      permissionMode: "auto",
      promptLines: [
        "Run relevant validation when practical. Only edit files for small fixes clearly required by failed checks.",
        "Report exact commands, results, and residual risk.",
      ],
    }),
  ]
}

function defaultSdkSubagentCatalogItem(options: {
  accessMode: MultiAgentTaskAccessMode
  description: string
  displayName: string
  key: string
  parentModelLabel: string
  parentSandboxOptions?: LocalSandboxOptions
  permissionMode?: PermissionMode
  promptLines: string[]
}): SdkSubagentCatalogItem {
  const sandboxOptions = options.permissionMode
    ? createSandboxOptionsForPermissionMode(
        options.permissionMode,
        options.permissionMode === "read_only"
      )
    : options.parentSandboxOptions
  return {
    accessMode: options.accessMode,
    definition: {
      description: options.description,
      model: "inherit",
      prompt: [
        `You are the ${options.displayName} SDK subagent.`,
        options.description,
        "",
        permissionInstructions(sandboxOptions),
        "",
        ...options.promptLines,
      ].join("\n"),
    },
    displayName: options.displayName,
    key: options.key,
    modelLabel: options.parentModelLabel,
    permissionBoundary: permissionBoundaryForMode(
      options.permissionMode,
      options.parentSandboxOptions
    ),
  }
}

function createCoordinatorTask(
  modelLabel: string,
  sandboxOptions?: LocalSandboxOptions
): MultiAgentTaskState {
  return {
    accessMode: "write",
    agentName: "SDK coordinator",
    dependsOn: [],
    id: "sdk-coordinator",
    modelLabel,
    permissionBoundary: permissionBoundaryForMode(undefined, sandboxOptions),
    prompt: "Coordinate the overall request and delegate work through Cursor SDK subagents.",
    status: "PENDING",
    title: "SDK coordinator",
  }
}

function buildSdkMultiAgentPrompt(options: {
  instructions?: string
  prompt: string
  sandboxOptions?: LocalSandboxOptions
  subagents: SdkSubagentCatalogItem[]
  workspaceRoots: string[]
}) {
  return [
    "You are the coordinator for a Cursor SDK native multi-agent run.",
    "Use the SDK Task tool with the configured custom subagents for substantive independent work. Do not implement a separate JSON planner.",
    'When delegating, set Task args mode to "agent" and subagentType to {"kind":"custom","name":"<subagent key>"} using one of the exact keys below.',
    `Use ${MAX_TASKS} subagent calls or fewer unless the user explicitly asks for more.`,
    "Prefer read-only subagents for discovery/review before write-capable implementation when that helps.",
    "Keep write-capable work coordinated so two subagents do not edit the same files at the same time.",
    "After subagents finish, synthesize their results and include changed files, commands run, failures, and remaining risk.",
    "",
    "Available SDK subagents:",
    ...options.subagents.map((item) =>
      [
        `- ${item.key}: ${item.definition.description}`,
        `  display: ${item.displayName}`,
        `  access: ${item.accessMode === "read" ? "read-only requested" : "write-capable"}`,
        `  permission boundary: ${item.permissionBoundary}`,
      ].join("\n")
    ),
    "",
    permissionInstructions(options.sandboxOptions),
    "",
    workspaceAccessInstructions(options.sandboxOptions, options.workspaceRoots),
    renderProjectInstructions(options.instructions),
    "",
    "User task:",
    options.prompt,
  ]
    .filter(Boolean)
    .join("\n")
}

function sdkSubagentToolCallsFromMessage(event: SDKMessage): SdkSubagentToolCall[] {
  if (event.type === "assistant") {
    return event.message.content
      .filter(isSdkSubagentToolUseBlock)
      .map((block) => ({
        args: block.input,
        callId: block.id,
        status: "requested" as const,
        toolUsage: {
          callId: block.id,
          name: block.name,
          params: summarizeToolPayload(block.input),
          status: "requested",
        },
      }))
  }

  if (event.type === "tool_call" && isSdkSubagentToolName(event.name)) {
    return [
      {
        args: event.args,
        callId: event.call_id,
        result: event.result,
        status: event.status,
        toolUsage: {
          callId: event.call_id,
          name: event.name,
          params: summarizeToolPayload(event.args),
          result: summarizeToolPayload(event.result),
          status: event.status,
        },
      },
    ]
  }

  return []
}

function isSdkSubagentToolUseBlock(
  block: TextBlock | ToolUseBlock
): block is ToolUseBlock {
  return block.type === "tool_use" && isSdkSubagentToolName(block.name)
}

function isSdkSubagentToolName(name: string | undefined) {
  const value = name?.trim().toLowerCase()
  return value === "task" || value === "agent" || value === "subagent"
}

function sdkSubagentNameFromArgs(args: Record<string, unknown>) {
  const subagentType = asRecord(args.subagentType)
  const name = optionalText(subagentType.name)
  const kind = optionalText(subagentType.kind)
  if (name) {
    return name
  }
  if (kind && kind !== "custom") {
    return kind
  }
  return (
    optionalText(args.subagentType) ??
    optionalText(args.agentName) ??
    optionalText(args.agent)
  )
}

function inferSdkSubagentAccessMode(
  args: Record<string, unknown>,
  requestedName: string | undefined
): MultiAgentTaskAccessMode {
  const text = [
    requestedName,
    optionalText(args.description),
    optionalText(args.prompt),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
  return /read|review|research|scan|inspect|analysis|do not edit|read-only/.test(text)
    ? "read"
    : "write"
}

function describeSdkSubagentResult(result: unknown) {
  const record = asRecord(result)
  const value = asRecord(record.value)
  const success = asRecord(record.success)
  const resultValue = Object.keys(value).length > 0 ? value : success
  const explicitError =
    optionalText(record.error) ??
    optionalText(record.errorMessage) ??
    optionalText(asRecord(record.failure).message)
  const errorText =
    optionalText(record.status) === "error"
      ? summarizeToolPayload(record.error) || explicitError || "SDK subagent failed."
      : explicitError

  if (errorText) {
    return {
      errorText,
      resultText: "",
    }
  }

  const durationMs =
    optionalNumber(resultValue.durationMs) ?? optionalNumber(record.durationMs)
  const detailLines = [
    optionalText(resultValue.resultSuffix) ?? optionalText(record.resultSuffix),
    optionalText(resultValue.agentId)
      ? `agentId: ${optionalText(resultValue.agentId)}`
      : undefined,
    optionalText(resultValue.transcriptPath)
      ? `transcript: ${optionalText(resultValue.transcriptPath)}`
      : undefined,
  ].filter((line): line is string => Boolean(line))
  const resultText =
    detailLines.join("\n") ||
    optionalText(record.result) ||
    summarizeToolPayload(result) ||
    "SDK subagent completed."

  return {
    durationMs,
    resultText,
  }
}

function permissionBoundaryForMode(
  requestedMode: PermissionMode | undefined,
  parentSandboxOptions?: LocalSandboxOptions
) {
  const parentMode = parentSandboxOptions?.permissionMode ?? "full_access"
  const requested = requestedMode ?? parentMode
  const hard =
    requested === parentMode
      ? `hard parent sandbox: ${parentMode}`
      : `requested ${requested}; hard parent sandbox: ${parentMode}`
  return `${hard}. SDK subagents inherit the coordinator's tool boundary.`
}

function uniqueSubagentKey(key: string, usedKeys: Set<string>) {
  const base = slugify(key) || "sdk-subagent"
  let candidate = base
  let suffix = 2
  while (usedKeys.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  usedKeys.add(candidate)
  return candidate
}

function defaultSdkSubagentKey(accessMode: MultiAgentTaskAccessMode) {
  return accessMode === "read" ? "read-only-reviewer" : "implementation-writer"
}

function sdkLocalCwd(primaryRoot: string, workspaceRoots?: string[]) {
  const roots: string[] = []
  const addRoot = (root: string | undefined) => {
    const value = root?.trim()
    if (value && !roots.includes(value)) {
      roots.push(value)
    }
  }

  addRoot(primaryRoot)
  for (const root of workspaceRoots ?? []) {
    addRoot(root)
  }

  return roots.length > 1 ? roots : roots[0] ?? primaryRoot
}

function workspaceAccessInstructions(
  sandboxOptions?: LocalSandboxOptions,
  workspaceRoots: string[] = []
) {
  const lines = [
    "- Work only inside the configured workspace roots. Relative paths resolve inside the primary workspace; use absolute paths for other opened project roots.",
    "- If a requested absolute path is outside the configured workspace roots, explain that only opened project workspaces can be targeted from the UI.",
  ]

  if (workspaceRoots.length > 0) {
    lines.push(
      "- Configured workspace roots:",
      ...workspaceRoots.map((root, index) => `  ${index === 0 ? "* primary" : "*"} ${root}`)
    )
  }

  if (sdkCustomToolsEnabled(sandboxOptions)) {
    lines.push(
      "- For project overview or analysis tasks, call workspace_project_snapshot once before reading individual files.",
      "- For local workspace access, prefer custom MCP tools workspace_read_file, workspace_list_files, workspace_grep, and workspace_shell over built-in file/shell tools.",
      "- Call workspace_* tools one at a time; wait for a result before issuing the next custom MCP call."
    )
  } else {
    lines.push(
      "- Use Cursor SDK built-in Read, Glob, Grep, and Shell tools for workspace inspection and validation.",
      "- App-owned workspace_* custom MCP tools are not exposed in this permission mode because local SDK sandbox/Auto-review cannot grant interactive approval for MCP tool calls.",
      "- Do not call workspace_project_snapshot unless it is actually listed as an available tool.",
      "- If SDK built-in tools cannot access an additional configured root, explain that cross-project file access requires a mode where workspace_* custom tools are exposed."
    )
  }

  return lines.join("\n")
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

function defaultAgentName(accessMode: MultiAgentTaskAccessMode) {
  return accessMode === "read" ? "Read-only subagent" : "Write subagent"
}

function formatModelSelection(model: ModelSelection) {
  const params =
    model.params && Object.keys(model.params).length > 0
      ? ` ${JSON.stringify(model.params)}`
      : ""
  return `${model.id}${params}`
}

function readWorkspaceChangedFiles(cwd: string) {
  try {
    const output = execFileSync("git", ["-C", cwd, "status", "--porcelain=v1"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
    return Array.from(
      new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.slice(3).trim())
          .map((file) => file.replace(/^"|"$/g, ""))
          .filter(Boolean)
      )
    )
  } catch {
    return []
  }
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

function toolUsageFromSdkMessage(event: SDKMessage): MultiAgentToolUsage[] {
  const raw = event as unknown as Record<string, unknown>
  if (event.type === "assistant") {
    return event.message.content
      .filter((block) => block.type !== "text")
      .map((block) => {
        const record = block as unknown as Record<string, unknown>
        return {
          callId: optionalText(record.id),
          name: optionalText(record.name) ?? "tool",
          params: summarizeToolPayload(record.input),
          status: "requested",
        }
      })
  }

  if (event.type === "tool_call") {
    return [
      {
        callId: optionalText(raw.call_id),
        name: optionalText(raw.name) ?? "tool",
        params: summarizeToolPayload(raw.args),
        result: summarizeToolPayload(raw.result),
        status: optionalText(raw.status) ?? "completed",
      },
    ]
  }

  return []
}

function appendToolUsage(
  current: MultiAgentToolUsage[] | undefined,
  next: MultiAgentToolUsage[]
) {
  return [...(current ?? []), ...next].slice(-TOOL_USAGE_CAP)
}

function summarizeToolPayload(value: unknown) {
  if (value === undefined || value === null) {
    return undefined
  }
  const text =
    typeof value === "string"
      ? value
      : (() => {
          try {
            return JSON.stringify(value)
          } catch {
            return String(value)
          }
        })()
  const compact = text.replace(/\s+/g, " ").trim()
  if (!compact) {
    return undefined
  }
  return compact.length > 300 ? `${compact.slice(0, 276).trimEnd()} [truncated]` : compact
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function createEntityId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

class CancelledError extends Error {
  constructor() {
    super("Cancelled.")
    this.name = "CancelledError"
  }
}
