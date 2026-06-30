#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process"
import {
  accessSync,
  constants as fsConstants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs"
import * as fs from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import BetterSqlite3 from "better-sqlite3"

import {
  CodingAgentSession,
  DEFAULT_CONTEXT_COMPACTION_OPTIONS,
  formatModelLabel,
  formatDuration,
  type AgentEvent,
  type CodingAgentSessionSnapshot,
  type ContextCompactionOptions,
  type LocalSandboxOptions,
  type ModelChoice,
} from "./agent.js"
import { MultiAgentRunner, type MultiAgentRunState } from "./multi-agent.js"
import { loadExtensionRuntime, runHooks } from "./extensions.js"
import {
  applyWorkspacePatch,
  getSessionChanges,
  readGit,
  recordSessionChangeResult,
  restoreWorkspaceTree,
  tryCreateWorkspaceTree,
} from "./git-workspace.js"
import { normalizeSessionMemorySnapshot } from "./session-memory.js"
import type { ModelSelection } from "@cursor/sdk"
import { renderCodexAppHtml } from "./web/codex-app/render.js"

type SqliteStatement<Result, Params extends unknown[]> = {
  all(...params: Params): Result[]
  get(...params: Params): Result | undefined
  run(...params: Params): unknown
}

type Database = {
  close(): void
  exec(sql: string): unknown
  query<Result, Params extends unknown[] = unknown[]>(
    sql: string
  ): SqliteStatement<Result, Params>
}

function openDatabase(filename: string): Database {
  const db = new BetterSqlite3(filename)

  return {
    close: () => {
      db.close()
    },
    exec: (sql) => db.exec(sql),
    query: <Result, Params extends unknown[] = unknown[]>(sql: string) =>
      db.prepare(sql) as unknown as SqliteStatement<Result, Params>,
  }
}

type UiOptions = {
  context: ContextCompactionOptions
  cwd: string
  devReload: boolean
  force: boolean
  help: boolean
  host: string
  model: string
  open: boolean
  port: number
  sandboxOptions?: LocalSandboxOptions
}

type UiProject = {
  id: string
  cwd: string
  name: string
  sessions: UiAgentSession[]
}

type SessionWorkspaceMode = "local" | "worktree"

type SessionWorkspace = {
  baseRef?: string
  createdAt?: number
  cwd: string
  mode: SessionWorkspaceMode
  sourceCwd: string
  worktreePath?: string
}

type UiAgentSession = {
  id: string
  agent: CodingAgentSession
  changeBaselineTree?: string
  changeResultTree?: string
  createdAt: number
  messages: UiMessage[]
  projectId: string
  title: string
  updatedAt: number
  workspace: SessionWorkspace
}

type UiMessage = {
  kind: string
  text: string
}

type RunSubmissionMode = "normal" | "guide"

type RunAttachmentInput = {
  dataBase64: string
  lastModified?: number
  name: string
  size: number
  type: string
}

type RunStreamSend = (event: unknown) => void

type QueuedSessionRun = {
  attachmentInputs: RunAttachmentInput[]
  id: string
  mode: RunSubmissionMode
  multiAgent: boolean
  project: UiProject
  prompt: string
  reject?: (error: unknown) => void
  resolve?: () => void
  send: RunStreamSend
  session: UiAgentSession
}

type RunningSessionState = {
  active: boolean
  activeRunId?: string
  multiRun?: MultiAgentRunner
  projectId: string
  queue: QueuedSessionRun[]
}

type SavedRunAttachment = {
  kind: "image" | "text" | "binary"
  name: string
  path: string
  relativePath: string
  size: number
  textPreview?: string
  truncated?: boolean
  type: string
}

type PersistedUiState = {
  version: 1
  activeProjectId: string | null
  activeSessionId: string | null
  projects: PersistedProject[]
  selectedModel: ModelSelection
}

type PersistedProjectState = {
  version: 1
  activeSessionId: string | null
  project: PersistedProject
  selectedModel: ModelSelection
}

type PersistedProjectRegistry = {
  version: 1
  activeProjectId: string | null
  activeSessionId: string | null
  projectPaths: string[]
  selectedModel: ModelSelection
}

type PersistedProject = {
  id: string
  cwd: string
  name: string
  sessions: PersistedSession[]
}

type PersistedSession = {
  id: string
  agentState: CodingAgentSessionSnapshot
  changeBaselineTree?: string
  changeResultTree?: string
  createdAt: number
  messages: UiMessage[]
  title: string
  updatedAt: number
  workspace?: SessionWorkspace
}

const DEFAULT_MODEL = process.env.CURSOR_MODEL ?? "composer-2"
const DEFAULT_UI_PORT = 3030
const MAX_RUN_ATTACHMENTS = 8
const MAX_RUN_ATTACHMENT_BYTES = 8 * 1024 * 1024
const MAX_RUN_ATTACHMENTS_TOTAL_BYTES = 20 * 1024 * 1024
const MAX_ATTACHMENT_TEXT_PREVIEW_BYTES = 24 * 1024
const LEGACY_PROJECT_CONFIG_FILE_NAME = "config.json"
const PROJECT_CONFIG_FILE_NAME = "coding-agent.config.json"
const WORKTREE_DIR_NAME = "worktrees"
const WINDOWS_RESERVED_FILE_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
])

type UserConfig = {
  apiKey?: string
  port?: number
  version?: number
}

type ApiKeySource = "config" | "env" | "manual" | ""

async function main() {
  const argv = process.argv.slice(2)
  const helpRequested = argv.some((arg) => arg === "--help" || arg === "-h")
  const projectConfig = helpRequested ? {} : await readProjectConfig()
  const options = parseArgs(argv, projectConfig)

  if (options.help) {
    printHelp()
    return
  }

  installSdkTransportErrorGuard()

  const envApiKey = (process.env.CURSOR_API_KEY ?? "").trim()
  const configApiKey = projectConfig.apiKey?.trim() ?? ""
  let apiKey = configApiKey || envApiKey
  let apiKeySource: ApiKeySource = configApiKey ? "config" : envApiKey ? "env" : ""
  if (apiKey) {
    process.env.CURSOR_API_KEY = apiKey
  }
  let modelChoices: ModelChoice[] = []
  let modelsLoaded = false
  let selectedModel: ModelSelection = { id: options.model }
  let activeProjectId: string | null = null
  let activeSessionId: string | null = null
  const runningSessions = new Map<string, RunningSessionState>()
  const projects = new Map<string, UiProject>()
  const projectIdsByPath = new Map<string, string>()
  const loadedProjectPaths = new Set<string>()
  const legacyStateFile = getLegacySessionStateFile()
  const projectRegistryFile = getProjectRegistryFile()

  const allSessions = () =>
    Array.from(projects.values()).flatMap((project) => project.sessions)

  const findSession = (sessionId: string) => {
    for (const project of projects.values()) {
      const session = project.sessions.find((item) => item.id === sessionId)
      if (session) {
        return { project, session }
      }
    }

    return null
  }

  const hasRunningSessions = () =>
    Array.from(runningSessions.values()).some(
      (run) => run.active || run.queue.length > 0
    )

  const isSessionRunning = (sessionId?: string | null) =>
    Boolean(
      sessionId &&
        runningSessions.has(sessionId) &&
        ((runningSessions.get(sessionId)?.active ?? false) ||
          (runningSessions.get(sessionId)?.queue.length ?? 0) > 0)
    )

  const isSessionActivelyRunning = (sessionId?: string | null) =>
    Boolean(sessionId && runningSessions.get(sessionId)?.active)

  const sessionQueueLength = (sessionId?: string | null) =>
    sessionId ? runningSessions.get(sessionId)?.queue.length ?? 0 : 0

  const isProjectRunning = (projectId: string) =>
    Array.from(runningSessions.values()).some(
      (run) => run.projectId === projectId && (run.active || run.queue.length > 0)
    )

  const runningSessionIds = () =>
    Array.from(runningSessions.entries())
      .filter(([, run]) => run.active || run.queue.length > 0)
      .map(([sessionId]) => sessionId)

  const activeRunSessionIds = () =>
    Array.from(runningSessions.entries())
      .filter(([, run]) => run.active)
      .map(([sessionId]) => sessionId)

  const hasRunningSessionsOutsideProject = (projectId: string) =>
    Array.from(runningSessions.values()).some(
      (run) => run.projectId !== projectId && (run.active || run.queue.length > 0)
    )

  const disposeInactiveProjectAgents = async (projectId: string) => {
    await Promise.all(
      Array.from(projects.values()).flatMap((project) =>
        project.id === projectId
          ? []
          : project.sessions.map((session) => session.agent.dispose().catch(() => {}))
      )
    )
  }

  const refreshProjectAgents = async (project: UiProject) => {
    await Promise.all(
      project.sessions.map((session) => session.agent.refreshAgent())
    )
  }

  const rebindSessionWorkspace = async (
    project: UiProject,
    session: UiAgentSession
  ) => {
    const workspace = normalizeSessionWorkspace(session.workspace, project.cwd)
    session.workspace = workspace
    if (sameWorkspacePath(session.agent.workspaceCwd, workspace.cwd)) {
      return false
    }

    const snapshot = session.agent.snapshot()
    const model = normalizeModelSelection(snapshot.model, selectedModel)
    await session.agent.dispose().catch(() => {})
    session.agent = new CodingAgentSession({
      apiKey,
      context: options.context,
      cwd: workspace.cwd,
      force: options.force,
      initialState: { ...snapshot, model },
      model,
      sandboxOptions: options.sandboxOptions,
    })
    session.updatedAt = Date.now()
    return true
  }

  const getActiveProject = () =>
    activeProjectId ? projects.get(activeProjectId) ?? null : null

  const getActiveSession = () => {
    if (!activeProjectId || !activeSessionId) {
      return null
    }

    const project = projects.get(activeProjectId)
    return project?.sessions.find((session) => session.id === activeSessionId) ?? null
  }

  const getRequestedSession = (sessionId: string) => {
    if (sessionId) {
      return findSession(sessionId)
    }

    const project = getActiveProject()
    const session = getActiveSession()
    return project && session ? { project, session } : null
  }

  const publicSession = (session: UiAgentSession) => ({
    activeRun: isSessionActivelyRunning(session.id),
    contextUsage: session.agent.contextUsage(),
    id: session.id,
    createdAt: session.createdAt,
    messages: session.messages,
    model: session.agent.model,
    modelLabel: formatModelLabel(session.agent.model),
    projectId: session.projectId,
    queueLength: sessionQueueLength(session.id),
    running: isSessionRunning(session.id),
    title: session.title,
    updatedAt: session.updatedAt,
    workspace: publicSessionWorkspace(session),
    workspaceCwd: sessionWorkspaceCwd(session),
    workspaceMode: session.workspace.mode,
  })

  const publicProject = (project: UiProject) => ({
    id: project.id,
    cwd: project.cwd,
    name: project.name,
    sessions: project.sessions.map(publicSession),
  })

  const buildState = (message?: string) => {
    const activeProject = getActiveProject()
    const activeSession = getActiveSession()
    const model = activeSession?.agent.model ?? selectedModel

    return {
      activeProject: activeProject ? publicProject(activeProject) : null,
      activeProjectId,
      activeSession: activeSession ? publicSession(activeSession) : null,
      activeSessionId: activeSession?.id ?? null,
      activeSessionRunning: isSessionRunning(activeSession?.id),
      activeRunSessionIds: activeRunSessionIds(),
      autoCompact: options.context.enabled,
      busy: hasRunningSessions(),
      canPersistApiKey: canPersistApiKey(),
      cwd: activeProject?.cwd ?? "",
      devReload: options.devReload,
      hasApiKey: Boolean(apiKey),
      launchCwd: options.cwd,
      message,
      model: formatModelLabel(model),
      modelsLoaded: areModelsReady(),
      platform: process.platform,
      projects: Array.from(projects.values()).map(publicProject),
      runningSessionIds: runningSessionIds(),
      selectedModel: model,
    }
  }

  const createProject = (cwd: string, persisted?: PersistedProject): UiProject => {
    const project: UiProject = {
      id: persisted?.id || createEntityId("project"),
      cwd,
      name: persisted?.name?.trim() || path.basename(cwd) || cwd,
      sessions: [],
    }
    projects.set(project.id, project)
    projectIdsByPath.set(cwd, project.id)
    return project
  }

  const openProject = async (rawCwd: string) => {
    const cwd = setProcessWorkspaceCwd(rawCwd)
    const existingProjectId = projectIdsByPath.get(cwd)
    const persisted = loadedProjectPaths.has(cwd)
      ? null
      : await readProjectPersistedState(cwd, legacyStateFile)
    const project = existingProjectId
      ? projects.get(existingProjectId) ?? createProject(cwd, persisted?.project)
      : createProject(cwd, persisted?.project)

    if (persisted && !loadedProjectPaths.has(cwd)) {
      project.name = persisted.project.name?.trim() || path.basename(cwd) || cwd
      project.sessions = persisted.project.sessions.map((session) =>
        createPersistedSession(project, session)
      )
      selectedModel = normalizeModelSelection(persisted.selectedModel, selectedModel)
    }

    loadedProjectPaths.add(cwd)

    activeProjectId = project.id
    activeSessionId =
      persisted?.activeSessionId &&
      project.sessions.some((session) => session.id === persisted.activeSessionId)
        ? persisted.activeSessionId
        : project.sessions[0]?.id ?? null
    await refreshProjectAgents(project)
    await disposeInactiveProjectAgents(project.id)
    return project
  }

  const createSession = async (
    project: UiProject,
    workspaceMode: SessionWorkspaceMode = "local"
  ) => {
    const reusableSession = findReusableEmptySession(project, workspaceMode)
    if (reusableSession) {
      activeProjectId = project.id
      activeSessionId = reusableSession.id
      reusableSession.updatedAt = Date.now()
      await rebindSessionWorkspace(project, reusableSession)
      return { session: reusableSession, reused: true }
    }

    const now = Date.now()
    const workspace = createLocalSessionWorkspace(project.cwd)
    const session: UiAgentSession = {
      id: createEntityId("session"),
      agent: new CodingAgentSession({
        apiKey,
        context: options.context,
        cwd: workspace.cwd,
        force: options.force,
        model: cloneModelSelection(selectedModel),
        sandboxOptions: options.sandboxOptions,
      }),
      createdAt: now,
      messages: [],
      projectId: project.id,
      title: `新会话 ${project.sessions.length + 1}`,
      updatedAt: now,
      workspace,
    }

    if (workspaceMode === "worktree") {
      await moveSessionToWorktree(project, session, { carryChanges: false })
    }

    project.sessions.unshift(session)
    activeProjectId = project.id
    activeSessionId = session.id
    return { session, reused: false }
  }

  const findReusableEmptySession = (
    project: UiProject,
    workspaceMode: SessionWorkspaceMode
  ) =>
    project.sessions.find((session) =>
      isReusableEmptySession(session, workspaceMode)
    ) ?? null

  const isReusableEmptySession = (
    session: UiAgentSession,
    workspaceMode: SessionWorkspaceMode
  ) => {
    if (session.workspace.mode !== workspaceMode) return false
    if (isSessionRunning(session.id)) return false
    if (!isDefaultSessionTitle(session.title)) return false
    if (session.changeBaselineTree || session.changeResultTree) return false
    if (session.messages.some(isMeaningfulUiMessage)) return false

    const snapshot = session.agent.snapshot()
    if (snapshot.contextSummary.trim()) return false
    if (snapshot.history.some(isMeaningfulContextEntry)) return false
    if (snapshot.memory?.summaryText.trim()) return false
    if (snapshot.memory?.recentEntries.some(isMeaningfulContextEntry)) return false
    if (snapshot.memory?.transcriptEntries.some(isMeaningfulContextEntry)) {
      return false
    }
    if (
      session.workspace.mode === "worktree" &&
      workspaceHasUncommittedChanges(sessionWorkspaceCwd(session))
    ) {
      return false
    }

    return true
  }

  const createPersistedSession = (
    project: UiProject,
    persisted: PersistedSession
  ): UiAgentSession => {
    const model = normalizeModelSelection(
      persisted.agentState?.model,
      selectedModel
    )
    const agentState: Partial<CodingAgentSessionSnapshot> = {
      ...persisted.agentState,
      model,
    }
    const workspace = normalizeSessionWorkspace(persisted.workspace, project.cwd)

    return {
      id: persisted.id || createEntityId("session"),
      agent: new CodingAgentSession({
        apiKey,
        context: options.context,
        cwd: workspace.cwd,
        force: options.force,
        initialState: agentState,
        model,
        sandboxOptions: options.sandboxOptions,
      }),
      changeBaselineTree: persisted.changeBaselineTree,
      changeResultTree: persisted.changeResultTree,
      createdAt: finiteTimestampOrNow(persisted.createdAt),
      messages: normalizeUiMessages(persisted.messages),
      projectId: project.id,
      title: persisted.title?.trim() || "新会话",
      updatedAt: finiteTimestampOrNow(persisted.updatedAt),
      workspace,
    }
  }

  const moveSessionToWorktree = async (
    project: UiProject,
    session: UiAgentSession,
    { carryChanges }: { carryChanges: boolean }
  ) => {
    if (isSessionRunning(session.id)) {
      throw new Error("这个会话正在执行中，结束或取消后再迁移。")
    }

    const previousCwd = sessionWorkspaceCwd(session)
    const workspace = createManagedWorktree(project.cwd, session.id)
    if (carryChanges && !sameWorkspacePath(previousCwd, workspace.cwd)) {
      applyWorkspacePatch(previousCwd, workspace.cwd)
    }

    session.workspace = workspace
    await rebindSessionWorkspace(project, session)
    session.updatedAt = Date.now()
    return session
  }

  const moveSessionToLocal = async (
    project: UiProject,
    session: UiAgentSession,
    { carryChanges }: { carryChanges: boolean }
  ) => {
    if (isSessionRunning(session.id)) {
      throw new Error("这个会话正在执行中，结束或取消后再迁移。")
    }

    const previousCwd = sessionWorkspaceCwd(session)
    const previousWorkspace = session.workspace
    if (carryChanges && !sameWorkspacePath(previousCwd, project.cwd)) {
      applyWorkspacePatch(previousCwd, project.cwd)
    }

    session.workspace = createLocalSessionWorkspace(project.cwd)
    await rebindSessionWorkspace(project, session)
    await deleteManagedSessionWorktree({ ...session, workspace: previousWorkspace })
    session.updatedAt = Date.now()
    return session
  }

  const discardSessionChanges = async (session: UiAgentSession) => {
    if (isSessionRunning(session.id)) {
      throw new Error("这个会话正在执行中，结束或取消后再撤销。")
    }

    if (!session.changeBaselineTree) {
      throw new Error("当前会话没有可撤销的本轮变更基线。")
    }

    const changed = restoreWorkspaceTree(
      sessionWorkspaceCwd(session),
      session.changeBaselineTree
    )
    recordSessionChangeResult(sessionWorkspaceCwd(session), session)
    session.updatedAt = Date.now()
    return changed
  }

  const deleteSession = async (sessionId: string) => {
    const result = findSession(sessionId)
    if (!result) {
      return null
    }

    const { project, session } = result
    const sessionIndex = project.sessions.findIndex(
      (item) => item.id === session.id
    )

    if (sessionIndex === -1) {
      return null
    }

    project.sessions.splice(sessionIndex, 1)

    if (activeSessionId === session.id) {
      activeProjectId = project.id
      activeSessionId = null
    }

    await deleteSessionAttachments(sessionWorkspaceCwd(session), session.id)
    await deleteManagedSessionWorktree(session)
    await session.agent.dispose().catch(() => {})
    return { project, session }
  }

  const deleteProject = async (projectId: string) => {
    const project = projects.get(projectId)
    if (!project) {
      return null
    }

    if (isProjectRunning(project.id)) {
      throw new Error("这个项目还有会话正在执行，结束或取消后再移除。")
    }

    await Promise.all(project.sessions.map((session) => deleteManagedSessionWorktree(session)))
    await deleteProjectPersistedState(project.cwd, legacyStateFile)

    projects.delete(project.id)
    projectIdsByPath.delete(project.cwd)
    loadedProjectPaths.delete(project.cwd)

    const wasActiveProject = activeProjectId === project.id
    if (wasActiveProject) {
      const nextProject = Array.from(projects.values())[0] ?? null
      activeProjectId = nextProject?.id ?? null
      activeSessionId = nextProject?.sessions[0]?.id ?? null

      if (nextProject) {
        setProcessWorkspaceCwd(nextProject.cwd)
        await refreshProjectAgents(nextProject)
        await disposeInactiveProjectAgents(nextProject.id)
      }
    } else {
      await disposeInactiveProjectAgents(activeProjectId ?? "")
    }

    await Promise.all(project.sessions.map((session) => session.agent.dispose().catch(() => {})))
    return project
  }

  const restoreRegisteredProjects = async () => {
    const registry =
      (await readProjectRegistry(projectRegistryFile, legacyStateFile)) ??
      (await createLaunchProjectRegistry(options.cwd, legacyStateFile))
    if (!registry) {
      return
    }

    selectedModel = normalizeModelSelection(registry.selectedModel, selectedModel)

    for (const rawCwd of registry.projectPaths) {
      const cwd = path.resolve(rawCwd)
      if (!isUsableWorkspacePath(cwd) || loadedProjectPaths.has(cwd)) {
        continue
      }

      const persisted = await readProjectPersistedState(cwd, legacyStateFile).catch(
        () => null
      )
      if (!persisted) {
        continue
      }

      const project = createProject(cwd, persisted.project)
      project.name = persisted.project.name?.trim() || path.basename(cwd) || cwd
      project.sessions = persisted.project.sessions.map((session) =>
        createPersistedSession(project, session)
      )
      loadedProjectPaths.add(cwd)
    }

    const activeProject = registry.activeProjectId
      ? projects.get(registry.activeProjectId) ?? null
      : null
    if (!activeProject) {
      activeProjectId = null
      activeSessionId = null
      return
    }

    activeProjectId = activeProject.id
    activeSessionId =
      registry.activeSessionId &&
      activeProject.sessions.some((session) => session.id === registry.activeSessionId)
        ? registry.activeSessionId
        : activeProject.sessions[0]?.id ?? null
    setProcessWorkspaceCwd(activeProject.cwd)
    await disposeInactiveProjectAgents(activeProject.id)
  }

  const persistState = async () => {
    await Promise.all(
      Array.from(projects.values()).map((project) =>
        writeProjectPersistedState({
          version: 1,
          activeSessionId: activeProjectId === project.id ? activeSessionId : null,
          selectedModel,
          project: {
            id: project.id,
            cwd: project.cwd,
            name: project.name,
            sessions: project.sessions.map((session) => ({
              id: session.id,
              agentState: session.agent.snapshot(),
              changeBaselineTree: session.changeBaselineTree,
              changeResultTree: session.changeResultTree,
              createdAt: session.createdAt,
              messages: session.messages,
              title: session.title,
              updatedAt: session.updatedAt,
              workspace: session.workspace,
            })),
          },
        })
      )
    )
    await writeProjectRegistry(projectRegistryFile, {
      version: 1,
      activeProjectId,
      activeSessionId,
      projectPaths: Array.from(projects.values()).map((project) => project.cwd),
      selectedModel,
    })
  }

  const areModelsReady = () =>
    Boolean(apiKey && modelsLoaded && modelChoices.length > 0)

  const submitSessionRun = async (item: QueuedSessionRun) => {
    let state = runningSessions.get(item.session.id)

    if (!state) {
      state = {
        active: false,
        projectId: item.project.id,
        queue: [],
      }
      runningSessions.set(item.session.id, state)
    }

    state.projectId = item.project.id

    if (state.active) {
      await enqueueSessionRun(state, item)
      return
    }

    state.active = true
    state.activeRunId = item.id
    await executeSessionRun(item, state)
  }

  const enqueueSessionRun = (
    state: RunningSessionState,
    item: QueuedSessionRun
  ) =>
    new Promise<void>((resolve, reject) => {
      item.resolve = resolve
      item.reject = reject

      insertQueuedRun(state, item)

      const position = state.queue.findIndex((queued) => queued.id === item.id) + 1
      item.send({
        type: "queued",
        id: item.id,
        mode: item.mode,
        position,
        queueLength: state.queue.length,
      })
    })

  const insertQueuedRun = (state: RunningSessionState, item: QueuedSessionRun) => {
    if (item.mode === "guide") {
      const firstNormalIndex = state.queue.findIndex(
        (queued) => queued.mode !== "guide"
      )
      if (firstNormalIndex === -1) {
        state.queue.push(item)
      } else {
        state.queue.splice(firstNormalIndex, 0, item)
      }
      return
    }

    state.queue.push(item)
  }

  const findQueuedRun = (sessionId: string, runId: string) => {
    const state = runningSessions.get(sessionId)
    if (!state) {
      return null
    }

    const index = state.queue.findIndex((item) => item.id === runId)
    if (index < 0) {
      return null
    }

    return {
      index,
      item: state.queue[index],
      state,
    }
  }

  const updateQueuedRun = ({
    mode,
    prompt,
    runId,
    sessionId,
  }: {
    mode?: RunSubmissionMode
    prompt?: string
    runId: string
    sessionId: string
  }) => {
    const queued = findQueuedRun(sessionId, runId)

    if (!queued) {
      throw new Error("排队消息不存在或已经开始执行。")
    }

    if (typeof prompt === "string") {
      const nextPrompt = prompt.trim()
      if (!nextPrompt && queued.item.attachmentInputs.length === 0) {
        throw new Error("排队消息内容不能为空。")
      }
      queued.item.prompt = nextPrompt || "请查看附件。"
    }

    if (mode) {
      queued.item.mode = mode
      queued.state.queue.splice(queued.index, 1)
      insertQueuedRun(queued.state, queued.item)
    }

    const position =
      queued.state.queue.findIndex((item) => item.id === queued.item.id) + 1
    queued.item.send({
      type: "queue_updated",
      id: queued.item.id,
      mode: queued.item.mode,
      position,
      queueLength: queued.state.queue.length,
    })

    return {
      mode: queued.item.mode,
      position,
      queueLength: queued.state.queue.length,
    }
  }

  const cancelQueuedRun = (sessionId: string, runId: string) => {
    const queued = findQueuedRun(sessionId, runId)

    if (!queued) {
      throw new Error("排队消息不存在或已经开始执行。")
    }

    queued.state.queue.splice(queued.index, 1)
    queued.item.send({
      type: "queue_cancelled",
      id: queued.item.id,
      mode: queued.item.mode,
      queueLength: queued.state.queue.length,
    })
    queued.item.resolve?.()

    if (!queued.state.active && queued.state.queue.length === 0) {
      runningSessions.delete(sessionId)
    }

    return {
      queueLength: queued.state.queue.length,
    }
  }

  const startNextQueuedRun = (sessionId: string, state: RunningSessionState) => {
    const next = state.queue.shift()

    if (!next) {
      runningSessions.delete(sessionId)
      return
    }

    state.active = true
    state.activeRunId = next.id
    state.projectId = next.project.id
    next.send({
      type: "dequeued",
      id: next.id,
      mode: next.mode,
      queueLength: state.queue.length,
    })

    void executeSessionRun(next, state)
      .then(() => next.resolve?.())
      .catch((error) => next.reject?.(error))
  }

  const executeSessionRun = async (
    item: QueuedSessionRun,
    state: RunningSessionState
  ) => {
    const {
      attachmentInputs,
      mode,
      multiAgent,
      project: activeProject,
      prompt,
      send,
      session: activeSession,
    } = item

    try {
      try {
        if (await rebindSessionWorkspace(activeProject, activeSession)) {
          await persistState().catch(() => {})
        }
        activeSession.changeResultTree = undefined
      } catch (error) {
        send({ type: "error", message: getErrorMessage(error) })
        return
      }

      activeSession.changeBaselineTree = tryCreateWorkspaceTree(
        sessionWorkspaceCwd(activeSession)
      )

      try {
        const activeCwd = setProcessWorkspaceCwd(sessionWorkspaceCwd(activeSession))
        assertWorkspaceReady(activeCwd)
      } catch (error) {
        send({ type: "error", message: getErrorMessage(error) })
        return
      }

      activeSession.updatedAt = Date.now()
      if (isDefaultSessionTitle(activeSession.title)) {
        activeSession.title = titleFromPrompt(prompt || "附件")
      }

      let runPrompt = prompt
      try {
        const savedAttachments = await saveRunAttachments(
          sessionWorkspaceCwd(activeSession),
          activeSession.id,
          attachmentInputs
        )
        runPrompt = buildPromptWithAttachments(prompt, savedAttachments)
        if (savedAttachments.length > 0) {
          send({
            type: "agent",
            event: {
              type: "task",
              status: "附件",
              text: `已保存 ${savedAttachments.length} 个附件到 .coding-agent/uploads。`,
            },
          })
        }
      } catch (error) {
        send({ type: "error", message: getErrorMessage(error) })
        return
      }

      runPrompt = buildRunModePrompt(runPrompt, mode)
      const workspaceCwd = sessionWorkspaceCwd(activeSession)
      let extensionRuntime: ReturnType<typeof loadExtensionRuntime>
      try {
        extensionRuntime = loadExtensionRuntime(workspaceCwd, runPrompt)
        if (extensionRuntime.sources.length > 0) {
          send({
            type: "agent",
            event: {
              type: "task",
              status: "扩展",
              text: formatExtensionRuntimeStatus(extensionRuntime.sources),
            },
          })
        }
        runHooks(
          extensionRuntime.hooks,
          "UserPromptSubmit",
          {
            prompt: runPrompt,
            sessionId: activeSession.id,
            workspaceCwd,
          },
          workspaceCwd,
          (message) =>
            send({
              type: "agent",
              event: { type: "task", status: "Hook", text: message },
            })
        )
        runHooks(
          extensionRuntime.hooks,
          "PreRun",
          {
            mode,
            multiAgent,
            sessionId: activeSession.id,
            workspaceCwd,
          },
          workspaceCwd,
          (message) =>
            send({
              type: "agent",
              event: { type: "task", status: "Hook", text: message },
            })
        )
      } catch (error) {
        send({ type: "error", message: getErrorMessage(error) })
        return
      }
      send({ type: "started", mode: multiAgent ? "multi" : "single", runMode: mode })

      try {
        if (multiAgent) {
          const model = cloneModelSelection(activeSession.agent.model)
          const runner = new MultiAgentRunner({
            apiKey,
            cwd: sessionWorkspaceCwd(activeSession),
            force: options.force,
            instructions: extensionRuntime.instructions,
            mcpServers: extensionRuntime.mcpServers,
            model,
            modelLabel: formatModelLabel(model),
            prompt: runPrompt,
            sandboxOptions: options.sandboxOptions,
            onEvent: (event) => send({ type: "multi", state: event.state }),
          })
          state.multiRun = runner
          const finalState = await runner.run()
          activeSession.agent.addExternalSummary(summarizeMultiAgentRun(finalState))
        } else {
          await activeSession.agent.sendPrompt({
            instructions: extensionRuntime.instructions,
            mcpServers: extensionRuntime.mcpServers,
            prompt: runPrompt,
            onEvent: (event) => send({ type: "agent", event }),
          })
        }
        runHooks(
          extensionRuntime.hooks,
          "PostRun",
          {
            sessionId: activeSession.id,
            status: "finished",
            workspaceCwd,
          },
          workspaceCwd,
          (message) =>
            send({
              type: "agent",
              event: { type: "task", status: "Hook", text: message },
            })
        )
        activeSession.updatedAt = Date.now()
        try {
          recordSessionChangeResult(sessionWorkspaceCwd(activeSession), activeSession)
        } catch {}
        send({ type: "finished" })
      } catch (error) {
        send({ type: "error", message: getFriendlyRuntimeErrorMessage(error) })
      }
    } finally {
      try {
        recordSessionChangeResult(sessionWorkspaceCwd(activeSession), activeSession)
      } catch {}
      state.active = false
      state.activeRunId = undefined
      state.multiRun = undefined
      await persistState().catch(() => {})

      if (runningSessions.get(activeSession.id) === state) {
        startNextQueuedRun(activeSession.id, state)
      }
    }
  }

  const loadModelChoices = async (nextApiKey: string) => {
    const probe = new CodingAgentSession({
      apiKey: nextApiKey,
      context: options.context,
      cwd: options.cwd,
      force: options.force,
      model: cloneModelSelection(selectedModel),
      sandboxOptions: options.sandboxOptions,
    })

    try {
      return await probe.listModels()
    } finally {
      await probe.dispose().catch(() => {})
    }
  }

  const applyLoadedModelChoices = (choices: ModelChoice[]) => {
    modelChoices = choices
    modelsLoaded = choices.length > 0

    if (!modelsLoaded) {
      return selectedModel
    }

    const currentModel = getActiveSession()?.agent.model ?? selectedModel
    const matchingChoice = findModelChoice(modelChoices, currentModel)
    const nextModel = cloneModelSelection(matchingChoice?.value ?? modelChoices[0].value)
    selectedModel = nextModel

    for (const session of allSessions()) {
      if (!isSessionRunning(session.id) && !findModelChoice(modelChoices, session.agent.model)) {
        session.agent.setModel(nextModel)
      }
    }

    return nextModel
  }

  const buildModelsResponse = (message?: string) => {
    const currentModel = getActiveSession()?.agent.model ?? selectedModel
    return {
      available: areModelsReady(),
      choices: modelChoices,
      current: currentModel,
      currentLabel: formatModelLabel(currentModel),
      message,
    }
  }

  const readCurrentConfigApiKey = async () =>
    (await readProjectConfig().catch((): UserConfig => ({}))).apiKey?.trim() ?? ""

  const refreshApiKeyFromProjectConfig = async () => {
    const nextApiKey = await readCurrentConfigApiKey()
    if (!nextApiKey || nextApiKey === apiKey) {
      return false
    }

    apiKey = nextApiKey
    apiKeySource = "config"
    process.env.CURSOR_API_KEY = nextApiKey
    return true
  }

  const applyApiKeyToIdleSessions = async (nextApiKey: string) => {
    for (const item of allSessions()) {
      if (!isSessionRunning(item.id)) {
        await item.agent.setApiKey(nextApiKey)
      }
    }
  }

  await restoreRegisteredProjects().catch(() => {})
  if (projects.size > 0) {
    await persistState().catch(() => {})
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)

      if (request.method === "GET" && url.pathname === "/") {
        sendHtml(response, renderCodexAppHtml())
        return
      }

      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, buildState())
        return
      }

      if (request.method === "GET" && url.pathname === "/api/dev/events") {
        if (!options.devReload) {
          sendJson(response, { error: "Developer reload is disabled." }, 404)
          return
        }

        streamDevReloadEvents(response)
        return
      }

      if (request.method === "GET" && url.pathname === "/api/changes") {
        const sessionId = url.searchParams.get("sessionId")?.trim() ?? ""
        const target = getRequestedSession(sessionId)
        sendJson(
          response,
          target
            ? getSessionChanges(sessionWorkspaceCwd(target.session), target.session)
            : { available: false, files: [], message: "请先在项目中新建会话。" }
        )
        return
      }

      if (request.method === "GET" && url.pathname === "/api/attachments/preview") {
        const sessionId = url.searchParams.get("sessionId")?.trim() ?? ""
        const name = url.searchParams.get("name")?.trim() ?? ""
        const target = getRequestedSession(sessionId)
        const project = target?.project ?? getActiveProject()
        const previewSessionId = target?.session.id ?? sessionId
        if (!project || !previewSessionId || !name) {
          sendJson(response, { error: "附件不存在。" }, 404)
          return
        }

        const previewFile = await findSessionAttachmentPreviewFile(
          target ? sessionWorkspaceCwd(target.session) : project.cwd,
          previewSessionId,
          name
        )
        if (!previewFile) {
          sendJson(response, { error: "附件不存在。" }, 404)
          return
        }

        await sendAttachmentPreview(response, previewFile.path, previewFile.contentType)
        return
      }

      if (request.method === "GET" && url.pathname === "/api/models") {
        const configApiKeyChanged = await refreshApiKeyFromProjectConfig()

        if (!apiKey) {
          sendJson(response, {
            available: false,
            choices: [],
            current: selectedModel,
            currentLabel: formatModelLabel(selectedModel),
            message: "请先在页面设置 API Key，然后加载可用模型。",
          })
          return
        }

        const attemptedApiKey = apiKey
        const attemptedApiKeySource = apiKeySource
        let choices: ModelChoice[]
        try {
          choices = await loadModelChoices(attemptedApiKey)
        } catch (error) {
          if (attemptedApiKeySource === "config" || attemptedApiKeySource === "env") {
            apiKey = ""
            apiKeySource = ""
            modelChoices = []
            modelsLoaded = false
            if (process.env.CURSOR_API_KEY === attemptedApiKey) {
              delete process.env.CURSOR_API_KEY
            }

            const sourceLabel =
              attemptedApiKeySource === "config"
                ? "项目配置中保存的密钥"
                : "环境变量 CURSOR_API_KEY"
            sendJson(response, {
              available: false,
              choices: [],
              current: selectedModel,
              currentLabel: formatModelLabel(selectedModel),
              hasApiKey: false,
              message: `${sourceLabel}验证失败，请重新输入密钥。`,
            })
            return
          }

          throw error
        }
        applyLoadedModelChoices(choices)
        if (configApiKeyChanged) {
          await applyApiKeyToIdleSessions(apiKey)
        }
        await persistState().catch(() => {})
        sendJson(
          response,
          buildModelsResponse(`已加载 ${modelChoices.length} 个可用模型。`)
        )
        return
      }

      if (request.method === "POST" && url.pathname === "/api/projects/pick") {
        if (hasRunningSessions()) {
          sendJson(response, { error: "当前任务执行中，结束后再打开项目。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const initialDirectory = stringField(body, "initialDirectory").trim()
        const pickedPath = pickWorkspaceDirectory(initialDirectory || options.cwd)

        if (!pickedPath) {
          sendJson(response, { ...buildState("已取消选择项目。"), cancelled: true })
          return
        }

        const project = await openProject(pickedPath)
        await persistState()
        sendJson(response, {
          ...buildState(`已打开项目 ${project.name}。`),
          cancelled: false,
          selectedPath: project.cwd,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/projects/open") {
        if (hasRunningSessions()) {
          sendJson(response, { error: "当前任务执行中，结束后再打开项目。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const cwd = stringField(body, "cwd").trim()

        if (!cwd) {
          sendJson(response, { error: "项目路径不能为空。" }, 400)
          return
        }

        const project = await openProject(cwd)
        await persistState()
        sendJson(response, buildState(`已打开项目 ${project.name}。`))
        return
      }

      if (request.method === "POST" && url.pathname === "/api/projects/select") {
        if (hasRunningSessions()) {
          sendJson(response, { error: "当前任务执行中，结束后再切换项目。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const projectId = stringField(body, "projectId").trim()
        const project = projects.get(projectId)

        if (!project) {
          sendJson(response, { error: "项目不存在。" }, 404)
          return
        }

        setProcessWorkspaceCwd(project.cwd)
        activeProjectId = project.id
        activeSessionId = project.sessions[0]?.id ?? null
        await refreshProjectAgents(project)
        await disposeInactiveProjectAgents(project.id)
        await persistState()
        sendJson(response, buildState(`已切换到项目 ${project.name}。`))
        return
      }

      if (request.method === "DELETE" && url.pathname === "/api/projects") {
        const body = await readJsonBody(request)
        const bodyProjectId = stringField(body, "projectId").trim()
        const queryProjectId = url.searchParams.get("projectId")?.trim() ?? ""
        const projectId = bodyProjectId || queryProjectId

        if (!projectId) {
          sendJson(response, { error: "projectId 不能为空。" }, 400)
          return
        }

        if (isProjectRunning(projectId)) {
          sendJson(response, { error: "这个项目还有会话正在执行，结束或取消后再移除。" }, 409)
          return
        }

        const project = await deleteProject(projectId)

        if (!project) {
          sendJson(response, { error: "项目不存在。" }, 404)
          return
        }

        await persistState()
        sendJson(response, buildState(`已移除项目 ${project.name}。`))
        return
      }

      if (request.method === "POST" && url.pathname === "/api/sessions/select") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim()
        const result = findSession(sessionId)

        if (!result) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        if (hasRunningSessions() && activeProjectId && result.project.id !== activeProjectId) {
          sendJson(
            response,
            { error: "当前任务执行中，可切换同项目会话，结束后再切换项目。" },
            409
          )
          return
        }

        setProcessWorkspaceCwd(result.project.cwd)
        const switchedProject = activeProjectId !== result.project.id
        activeProjectId = result.project.id
        activeSessionId = result.session.id
        if (!hasRunningSessions()) {
          if (switchedProject) {
            await refreshProjectAgents(result.project)
          }
          await disposeInactiveProjectAgents(result.project.id)
        }
        await persistState()
        sendJson(response, buildState(`已切换到 ${result.session.title}。`))
        return
      }

      if (request.method === "DELETE" && url.pathname === "/api/sessions") {
        const body = await readJsonBody(request)
        const bodySessionId = stringField(body, "sessionId").trim()
        const querySessionId = url.searchParams.get("sessionId")?.trim() ?? ""
        const sessionId = bodySessionId || querySessionId

        if (!sessionId) {
          sendJson(response, { error: "sessionId 不能为空。" }, 400)
          return
        }

        if (isSessionRunning(sessionId)) {
          sendJson(response, { error: "这个会话正在执行中，结束或取消后再删除。" }, 409)
          return
        }

        const result = await deleteSession(sessionId)

        if (!result) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        await persistState()
        sendJson(response, buildState(`已删除 ${result.session.title}。`))
        return
      }

      if (request.method === "POST" && url.pathname === "/api/key") {
        if (hasRunningSessions()) {
          sendJson(response, { error: "当前任务执行中，结束后再设置密钥。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const nextApiKey = stringField(body, "apiKey").trim()
        const save = booleanField(body, "save")

        if (!nextApiKey) {
          sendJson(response, { error: "API Key 不能为空。" }, 400)
          return
        }

        const choices = await loadModelChoices(nextApiKey)
        apiKey = nextApiKey
        apiKeySource = "manual"
        process.env.CURSOR_API_KEY = nextApiKey
        applyLoadedModelChoices(choices)

        await applyApiKeyToIdleSessions(nextApiKey)

        let saveMessage = "仅当前服务生效。"
        if (save) {
          try {
            await persistApiKey(nextApiKey, options.port)
            apiKeySource = "config"
            saveMessage = "并保存到项目配置。"
          } catch (error) {
            saveMessage = `当前服务已生效，但未保存到项目配置：${getErrorMessage(error)}`
          }
        }

        await persistState()
        sendJson(response, {
          ...buildState(),
          ...buildModelsResponse(
            `密钥已更新，已加载 ${modelChoices.length} 个可用模型，${saveMessage}`
          ),
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/model") {
        const body = await readJsonBody(request)
        const model = modelSelectionField(body, "model")
        if (!areModelsReady()) {
          sendJson(response, { error: "请先设置 API Key 并加载可用模型。" }, 400)
          return
        }

        const choice = findModelChoice(modelChoices, model)
        if (!choice) {
          sendJson(response, { error: "请选择已加载列表中的可用模型。" }, 400)
          return
        }

        selectedModel = cloneModelSelection(choice.value)
        const activeSession = getActiveSession()

        if (isSessionRunning(activeSession?.id)) {
          sendJson(response, { error: "当前会话任务执行中，结束后再切换模型。" }, 409)
          return
        }

        if (activeSession) {
          activeSession.agent.setModel(selectedModel)
          activeSession.updatedAt = Date.now()
        }

        await persistState()
        sendJson(response, {
          ...buildState(),
          current: activeSession?.agent.model ?? selectedModel,
          currentLabel: formatModelLabel(activeSession?.agent.model ?? selectedModel),
          message: `已切换到 ${formatModelLabel(activeSession?.agent.model ?? selectedModel)}。`,
        })
        return
      }

      if (
        request.method === "POST" &&
        (url.pathname === "/api/new-session" || url.pathname === "/api/sessions")
      ) {
        const body = await readJsonBody(request).catch(() => ({}))
        const project = getActiveProject()
        if (!project) {
          sendJson(response, { error: "请先打开项目。" }, 400)
          return
        }

        if (!areModelsReady()) {
          sendJson(response, { error: "请先设置 API Key 并加载可用模型。" }, 400)
          return
        }

        const workspaceMode = sessionWorkspaceModeField(body, "workspaceMode")
        const { session, reused } = await createSession(project, workspaceMode)
        await persistState()
        sendJson(response, {
          ...buildState(),
          reused,
          message: reused
            ? `已切换到 ${project.name} 中的空会话 ${session.title}。`
            : `已在 ${project.name} 中创建 ${session.title}。`,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/sessions/messages") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim()
        const result = findSession(sessionId)

        if (!result) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        result.session.messages = normalizeUiMessages(body.messages)
        result.session.updatedAt = Date.now()
        await persistState()
        sendJson(response, buildState())
        return
      }

      if (request.method === "POST" && url.pathname === "/api/sessions/workspace") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""
        const workspaceMode = sessionWorkspaceModeField(body, "workspaceMode")
        const carryChanges = booleanField(body, "carryChanges", true)
        const result = getRequestedSession(sessionId)

        if (!result) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        if (workspaceMode === "worktree") {
          await moveSessionToWorktree(result.project, result.session, { carryChanges })
        } else {
          await moveSessionToLocal(result.project, result.session, { carryChanges })
        }

        await persistState()
        sendJson(
          response,
          buildState(
            workspaceMode === "worktree"
              ? "已将会话迁移到 Worktree。"
              : "已将会话迁移到 Local。"
          )
        )
        return
      }

      if (request.method === "POST" && url.pathname === "/api/sessions/discard") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""
        const result = getRequestedSession(sessionId)

        if (!result) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        const changed = await discardSessionChanges(result.session)
        await persistState()
        sendJson(
          response,
          buildState(changed ? "已撤销本轮会话变更。" : "本轮会话没有需要撤销的变更。")
        )
        return
      }

      if (request.method === "POST" && url.pathname === "/api/cancel") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""
        const running = sessionId ? runningSessions.get(sessionId) : null
        const target = getRequestedSession(sessionId)

        if (!target || !running?.active) {
          sendJson(response, { error: "当前会话没有可取消的任务。" }, 400)
          return
        }

        if (running.multiRun) {
          await running.multiRun.cancel()
          sendJson(response, {
            message: "已请求取消当前会话的多 Agent 任务。",
            cancelled: true,
          })
          return
        }

        const result = await target.session.agent.cancelCurrentRun()
        sendJson(response, {
          message: result.cancelled ? "已请求取消当前任务。" : result.reason,
          cancelled: result.cancelled,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/run/queue/update") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""
        const runId = runIdField(body, "runId")
        const target = getRequestedSession(sessionId)

        if (!target) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        if (!runId) {
          sendJson(response, { error: "runId 不能为空。" }, 400)
          return
        }

        const prompt =
          typeof body.prompt === "string" ? stringField(body, "prompt") : undefined
        const mode = stringField(body, "mode").trim()
          ? runSubmissionModeField(body, "mode")
          : undefined

        const result = updateQueuedRun({
          mode,
          prompt,
          runId,
          sessionId: target.session.id,
        })
        sendJson(response, {
          ...buildState("排队消息已更新。"),
          ...result,
          updated: true,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/run/queue/cancel") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""
        const runId = runIdField(body, "runId")
        const target = getRequestedSession(sessionId)

        if (!target) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        if (!runId) {
          sendJson(response, { error: "runId 不能为空。" }, 400)
          return
        }

        const result = cancelQueuedRun(target.session.id, runId)
        sendJson(response, {
          ...buildState("已关闭排队。"),
          ...result,
          cancelled: true,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/run") {
        const body = await readJsonBody(request)
        const prompt = stringField(body, "prompt").trim()
        let attachmentInputs: RunAttachmentInput[]
        try {
          attachmentInputs = attachmentInputsField(body, "attachments")
        } catch (error) {
          sendJson(response, { error: getErrorMessage(error) }, 400)
          return
        }
        const multiAgent = booleanField(body, "multiAgent")
        const mode = runSubmissionModeField(body, "mode")
        const runId = runIdField(body, "runId") || createEntityId("run")
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""

        streamEvents(response, async (send) => {
          const target = getRequestedSession(sessionId)
          if (!target) {
            send({ type: "error", message: "请先在项目中新建会话。" })
            return
          }

          const { project: activeProject, session: activeSession } = target

          if (activeProject.id !== activeProjectId) {
            send({
              type: "error",
              message: "当前会话不属于当前项目，请先切换到该项目。",
            })
            return
          }

          if (hasRunningSessionsOutsideProject(activeProject.id)) {
            send({ type: "error", message: "其他项目还有任务在执行，结束后再提交任务。" })
            return
          }

          if (!areModelsReady()) {
            send({ type: "error", message: "请先设置 API Key 并加载可用模型。" })
            return
          }

          if (!prompt && attachmentInputs.length === 0) {
            send({ type: "error", message: "请输入任务内容。" })
            return
          }

          await submitSessionRun({
            attachmentInputs,
            id: runId,
            mode,
            multiAgent,
            project: activeProject,
            prompt,
            send,
            session: activeSession,
          })
        })
        return
      }

      sendJson(response, { error: "Not found." }, 404)
    } catch (error) {
      sendJson(response, { error: getErrorMessage(error) }, 500)
    }
  })

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off("listening", onListening)
        reject(error)
      }
      const onListening = () => {
        server.off("error", onError)
        resolve()
      }

      server.once("error", onError)
      server.once("listening", onListening)
      server.listen(options.port, options.host)
    })
  } catch (error) {
    throw createListenError(error, options)
  }

  const address = server.address()
  const port = typeof address === "object" && address ? address.port : options.port
  const url = `http://${hostForBrowser(options.host)}:${port}/`
  const startupActiveProject = getActiveProject()

  console.log(`Coding Agent UI: ${url}`)
  console.log(`Project picker start directory: ${options.cwd}`)
  console.log(
    startupActiveProject
      ? `Agent workspace restored: ${startupActiveProject.cwd}`
      : "Agent workspace: none until you open a project in the UI."
  )
  console.log(`UI server process cwd: ${process.cwd()}`)
  console.log("Press Ctrl+C to stop.")

  if (options.open) {
    openBrowser(url)
  }

  const shutdown = async () => {
    server.close()
    for (const item of allSessions()) {
      await item.agent.dispose().catch(() => {})
    }
    process.exit(0)
  }

  process.once("SIGINT", () => void shutdown())
  process.once("SIGTERM", () => void shutdown())
}

function parseArgs(argv: string[], projectConfig: UserConfig = {}): UiOptions {
  let context = readContextOptionsFromEnv()
  let cwd = process.cwd()
  let devReload = readBooleanEnv("CURSOR_UI_DEV_RELOAD", false)
  let force = readBooleanEnv("CURSOR_FORCE", true)
  let help = false
  let host = "127.0.0.1"
  let model = DEFAULT_MODEL
  let open = false
  let port =
    projectConfig.port ??
    readPort(process.env.CURSOR_UI_PORT ?? String(DEFAULT_UI_PORT), "CURSOR_UI_PORT")
  let sandboxOptions = readSandboxOptionsFromEnv()

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--help" || arg === "-h") {
      help = true
      continue
    }

    if (arg === "--force") {
      force = true
      continue
    }

    if (arg === "--no-force") {
      force = false
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

    if (arg === "--open") {
      open = true
      continue
    }

    if (arg === "--no-open") {
      open = false
      continue
    }

    if (arg === "--dev-reload") {
      devReload = true
      continue
    }

    if (arg === "--no-dev-reload") {
      devReload = false
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

    if (arg === "--host") {
      host = readOptionValue(argv, index, arg)
      index += 1
      continue
    }

    if (arg.startsWith("--host=")) {
      host = arg.slice("--host=".length)
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

    if (arg === "--port") {
      port = readPort(readOptionValue(argv, index, arg), arg)
      index += 1
      continue
    }

    if (arg.startsWith("--port=")) {
      port = readPort(arg.slice("--port=".length), "--port")
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  return {
    context,
    cwd: path.resolve(cwd),
    devReload,
    force,
    help,
    host,
    model,
    open,
    port,
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

function readPort(value: string, option: string) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Expected a port between 0 and 65535 for ${option}.`)
  }

  return parsed
}

function createListenError(error: unknown, options: UiOptions) {
  const code = (error as { code?: unknown }).code
  const address = `${options.host}:${options.port}`

  if (code === "EADDRINUSE") {
    return new Error(
      `Coding Agent UI 启动失败：端口 ${address} 已被占用。` +
        "如果是本项目已经启动，请先关闭已有实例；如果是其他程序占用，请使用 --port <端口> 指定其它端口。"
    )
  }

  if (code === "EACCES") {
    return new Error(`Coding Agent UI 启动失败：没有权限监听端口 ${address}。`)
  }

  return error instanceof Error ? error : new Error(String(error))
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

function readSandboxOptionsFromEnv(): LocalSandboxOptions {
  const enabled = readOptionalBooleanEnv("CURSOR_SANDBOX")
  return { enabled: enabled ?? false }
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

function sendHtml(response: ServerResponse, html: string) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  })
  response.end(html)
}

function sendJson(response: ServerResponse, payload: unknown, status = 200) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  })
  response.end(JSON.stringify(payload))
}

function streamDevReloadEvents(response: ServerResponse) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  })
  response.flushHeaders?.()
  response.write(`event: ready\ndata: ${JSON.stringify({ startedAt: Date.now() })}\n\n`)

  const heartbeat = setInterval(() => {
    if (response.destroyed || response.writableEnded) {
      clearInterval(heartbeat)
      return
    }

    response.write(": heartbeat\n\n")
  }, 15000)

  response.once("close", () => {
    clearInterval(heartbeat)
  })
}

async function sendAttachmentPreview(
  response: ServerResponse,
  filePath: string,
  contentType: string
) {
  const buffer = await fs.readFile(filePath)
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": String(buffer.length),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  })
  response.end(buffer)
}

function streamEvents(
  response: ServerResponse,
  handler: (send: (event: unknown) => void) => Promise<void>
) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "X-Content-Type-Options": "nosniff",
  })
  response.flushHeaders?.()

  let closed = false
  response.once("close", () => {
    closed = true
  })

  const send = (event: unknown) => {
    if (closed || response.destroyed || response.writableEnded) {
      return
    }

    response.write(`${JSON.stringify(event)}\n`)
  }

  void handler(send)
    .catch((error) => {
      send({ type: "error", message: getFriendlyRuntimeErrorMessage(error) })
    })
    .finally(() => {
      if (!response.destroyed && !response.writableEnded) {
        response.end()
      }
    })
}

async function readJsonBody(request: IncomingMessage) {
  const body = await readBody(request)

  if (!body.trim()) {
    return {}
  }

  return JSON.parse(body) as Record<string, unknown>
}

async function readBody(request: IncomingMessage) {
  let body = ""
  request.setEncoding("utf8")

  for await (const chunk of request) {
    body += chunk
  }

  return body
}

function stringField(body: Record<string, unknown>, name: string) {
  const value = body[name]
  return typeof value === "string" ? value : ""
}

function booleanField(
  body: Record<string, unknown>,
  name: string,
  defaultValue = false
) {
  const value = body[name]
  return typeof value === "boolean" ? value : defaultValue
}

function runSubmissionModeField(
  body: Record<string, unknown>,
  name: string
): RunSubmissionMode {
  return stringField(body, name).trim() === "guide" ? "guide" : "normal"
}

function sessionWorkspaceModeField(
  body: Record<string, unknown>,
  name: string
): SessionWorkspaceMode {
  return stringField(body, name).trim() === "worktree" ? "worktree" : "local"
}

function runIdField(body: Record<string, unknown>, name: string) {
  const value = stringField(body, name).trim()
  return /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : ""
}

function modelSelectionField(
  body: Record<string, unknown>,
  name: string
): ModelSelection {
  const value = body[name]

  if (!value || typeof value !== "object") {
    throw new Error("请选择一个可用模型。")
  }

  const model = value as { id?: unknown; params?: unknown }

  if (typeof model.id !== "string" || !model.id.trim()) {
    throw new Error("模型参数无效。")
  }

  return value as ModelSelection
}

function attachmentInputsField(
  body: Record<string, unknown>,
  name: string
): RunAttachmentInput[] {
  const value = body[name]
  if (!Array.isArray(value)) {
    return []
  }

  if (value.length > MAX_RUN_ATTACHMENTS) {
    throw new Error(`一次最多上传 ${MAX_RUN_ATTACHMENTS} 个附件。`)
  }

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("附件参数无效。")
    }

    const record = item as Record<string, unknown>
    const nameValue = stringField(record, "name").trim() || "attachment"
    const typeValue = stringField(record, "type").trim()
    const dataBase64 = stringField(record, "dataBase64").replace(/\s+/g, "")
    const size = Number(record.size)
    const lastModified = Number(record.lastModified)

    if (!dataBase64) {
      throw new Error(`附件 ${nameValue} 内容为空。`)
    }

    if (!Number.isFinite(size) || size < 0) {
      throw new Error(`附件 ${nameValue} 大小无效。`)
    }

    if (size > MAX_RUN_ATTACHMENT_BYTES) {
      throw new Error(
        `附件 ${nameValue} 超过单文件限制 ${formatBytes(MAX_RUN_ATTACHMENT_BYTES)}。`
      )
    }

    return {
      dataBase64,
      lastModified: Number.isFinite(lastModified) ? lastModified : undefined,
      name: nameValue,
      size,
      type: typeValue,
    }
  })
}

async function saveRunAttachments(
  cwd: string,
  sessionId: string,
  inputs: RunAttachmentInput[]
): Promise<SavedRunAttachment[]> {
  if (inputs.length === 0) {
    return []
  }

  const totalBytes = inputs.reduce((sum, item) => sum + item.size, 0)
  if (totalBytes > MAX_RUN_ATTACHMENTS_TOTAL_BYTES) {
    throw new Error(
      `附件总大小超过 ${formatBytes(MAX_RUN_ATTACHMENTS_TOTAL_BYTES)}。`
    )
  }

  const storage = getProjectStoragePaths(cwd)
  const uploadDir = path.join(
    storage.dir,
    "uploads",
    sanitizePathSegment(sessionId) || "session"
  )
  await fs.mkdir(uploadDir, { recursive: true })
  await ensureProjectStorageIgnored(cwd)

  const saved: SavedRunAttachment[] = []
  const timestamp = Date.now()

  for (const [index, input] of inputs.entries()) {
    const buffer = decodeAttachmentBase64(input)
    if (buffer.length > MAX_RUN_ATTACHMENT_BYTES) {
      throw new Error(
        `附件 ${input.name} 超过单文件限制 ${formatBytes(MAX_RUN_ATTACHMENT_BYTES)}。`
      )
    }

    const fileName =
      String(timestamp) +
      "-" +
      String(index + 1).padStart(2, "0") +
      "-" +
      sanitizeAttachmentFileName(input.name)
    const absolutePath = path.join(uploadDir, fileName)
    await fs.writeFile(absolutePath, buffer)

    const textPreview = extractAttachmentTextPreview(input.name, input.type, buffer)
    const relativePath = path.relative(cwd, absolutePath).split(path.sep).join("/")
    saved.push({
      kind: attachmentKind(input.name, input.type, Boolean(textPreview.preview)),
      name: input.name,
      path: absolutePath,
      relativePath,
      size: buffer.length,
      textPreview: textPreview.preview,
      truncated: textPreview.truncated,
      type: input.type,
    })
  }

  return saved
}

async function findSessionAttachmentPreviewFile(
  cwd: string,
  sessionId: string,
  name: string
): Promise<{ contentType: string; path: string } | null> {
  const storedName = sanitizeAttachmentFileName(name)
  const contentType = attachmentPreviewContentType(storedName)
  if (!storedName || !contentType) {
    return null
  }

  const storage = getProjectStoragePaths(cwd)
  const uploadDir = path.join(
    storage.dir,
    "uploads",
    sanitizePathSegment(sessionId) || "session"
  )
  const entries = await fs.readdir(uploadDir, { withFileTypes: true }).catch(() => [])
  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => attachmentStoredFileMatches(fileName, storedName))
    .sort()
    .reverse()

  for (const candidate of candidates) {
    const absolutePath = path.resolve(uploadDir, candidate)
    const uploadRoot = path.resolve(uploadDir) + path.sep
    if (!absolutePath.startsWith(uploadRoot)) {
      continue
    }

    return { contentType, path: absolutePath }
  }

  return null
}

function attachmentStoredFileMatches(fileName: string, storedName: string) {
  return fileName === storedName || fileName.endsWith("-" + storedName)
}

function attachmentPreviewContentType(fileName: string) {
  switch (path.extname(fileName).toLowerCase()) {
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".gif":
      return "image/gif"
    case ".webp":
      return "image/webp"
    case ".bmp":
      return "image/bmp"
    default:
      return ""
  }
}

function decodeAttachmentBase64(input: RunAttachmentInput) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.dataBase64)) {
    throw new Error(`附件 ${input.name} 不是有效的 base64 内容。`)
  }

  const buffer = Buffer.from(input.dataBase64, "base64")
  if (input.size > 0 && Math.abs(buffer.length - input.size) > 2) {
    throw new Error(`附件 ${input.name} 上传内容长度不一致。`)
  }

  return buffer
}

function buildPromptWithAttachments(
  prompt: string,
  attachments: SavedRunAttachment[]
) {
  if (attachments.length === 0) {
    return prompt
  }

  const parts = [prompt.trim() || "请查看附件。", "", "Uploaded attachments:"]

  for (const attachment of attachments) {
    parts.push(
      "",
      `- ${attachment.name}`,
      `  - kind: ${attachment.kind}`,
      `  - type: ${attachment.type || "unknown"}`,
      `  - size: ${formatBytes(attachment.size)}`,
      `  - workspace path: ${attachment.relativePath}`,
      `  - absolute path: ${attachment.path}`
    )

    if (attachment.textPreview) {
      parts.push(
        `  - text preview${attachment.truncated ? " (truncated)" : ""}:`,
        "```text",
        sanitizeFenceText(attachment.textPreview),
        "```"
      )
    } else if (attachment.kind === "image") {
      parts.push(
        "  - note: This is an image file saved in the workspace. Use the path above if image/file inspection is available."
      )
    } else {
      parts.push(
        "  - note: Binary or unsupported text extraction; use the saved path if the file is needed."
      )
    }
  }

  return parts.join("\n")
}

function buildRunModePrompt(prompt: string, mode: RunSubmissionMode) {
  if (mode !== "guide") {
    return prompt
  }

  return [
    "User guidance/correction received while an earlier run was in progress.",
    "Treat this message as higher priority than the previous assistant direction.",
    "First correct the mistaken assumption, plan, or implementation path called out by the user, then continue from the current workspace state.",
    "",
    "Guidance:",
    prompt.trim() || "The user is correcting the previous direction. Ask for clarification only if the correction is ambiguous.",
  ].join("\n")
}

function extractAttachmentTextPreview(name: string, mimeType: string, buffer: Buffer) {
  if (!isTextAttachment(name, mimeType)) {
    return { preview: "", truncated: false }
  }

  const slice = buffer.subarray(0, MAX_ATTACHMENT_TEXT_PREVIEW_BYTES)
  const preview = slice.toString("utf8")

  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(preview)) {
    return { preview: "", truncated: false }
  }

  return {
    preview: preview.trim(),
    truncated: buffer.length > MAX_ATTACHMENT_TEXT_PREVIEW_BYTES,
  }
}

function isTextAttachment(name: string, mimeType: string) {
  const type = mimeType.toLowerCase()
  if (
    type.startsWith("text/") ||
    type.includes("json") ||
    type.includes("xml") ||
    type.includes("javascript") ||
    type.includes("typescript")
  ) {
    return true
  }

  const lowerName = path.basename(name).toLowerCase()
  if (lowerName === ".env" || lowerName.endsWith(".env")) {
    return true
  }

  const extension = path.extname(lowerName)
  return [
    ".c",
    ".conf",
    ".css",
    ".csv",
    ".env",
    ".go",
    ".h",
    ".html",
    ".java",
    ".js",
    ".json",
    ".jsx",
    ".log",
    ".md",
    ".py",
    ".rs",
    ".sh",
    ".sql",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".vue",
    ".xml",
    ".yaml",
    ".yml",
  ].includes(extension)
}

function attachmentKind(name: string, mimeType: string, hasTextPreview: boolean) {
  if (hasTextPreview) {
    return "text"
  }

  if (mimeType.toLowerCase().startsWith("image/")) {
    return "image"
  }

  const extension = path.extname(name).toLowerCase()
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"].includes(extension)
    ? "image"
    : "binary"
}

function sanitizeAttachmentFileName(name: string) {
  const base = path.basename(name || "attachment")
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/[. ]+$/g, "")
    .replace(/^_+|_+$/g, "")

  if (!cleaned || /^\.+$/.test(cleaned)) {
    return "attachment"
  }

  const parsed = path.parse(cleaned)
  if (WINDOWS_RESERVED_FILE_NAMES.has(parsed.name.toUpperCase())) {
    return `_${cleaned}`
  }

  return cleaned
}

function sanitizePathSegment(value: string) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]+/g, "_")
}

function sanitizeFenceText(value: string) {
  return value.replace(/```/g, "` ` `")
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function formatExtensionRuntimeStatus(
  sources: ReturnType<typeof loadExtensionRuntime>["sources"]
) {
  const counts = new Map<string, number>()
  for (const source of sources) {
    counts.set(source.kind, (counts.get(source.kind) ?? 0) + 1)
  }
  const labels = [
    ["agents", "AGENTS"],
    ["skill", "Skills"],
    ["plugin", "Plugins"],
    ["mcp", "MCP"],
    ["hook", "Hooks"],
  ]
    .map(([kind, label]) => {
      const count = counts.get(kind) ?? 0
      return count > 0 ? `${label} ${count}` : ""
    })
    .filter(Boolean)
  return labels.length > 0 ? `已加载 ${labels.join("，")}。` : "未加载扩展。"
}

function canPersistApiKey() {
  return Boolean(getProjectConfigFile())
}

async function persistApiKey(apiKey: string, port: number) {
  const configFile = getProjectConfigFile()
  if (!configFile) {
    throw new Error("无法确定项目配置路径。")
  }

  const existing = await readProjectConfig().catch((): UserConfig => ({}))
  const next: UserConfig = {
    ...existing,
    apiKey,
    port: existing.port ?? port,
    version: 1,
  }
  const dir = path.dirname(configFile)
  await fs.mkdir(dir, { mode: 0o700, recursive: true })
  await fs.chmod(dir, 0o700).catch(() => {})
  await fs.writeFile(configFile, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  await fs.chmod(configFile, 0o600).catch(() => {})
}

async function readProjectConfig(): Promise<UserConfig> {
  const config = await readProjectConfigFile(getProjectConfigFile())
  if (config) {
    return config
  }

  return (await readProjectConfigFile(getLegacyProjectConfigFile())) ?? {}
}

async function readProjectConfigFile(configFile: string): Promise<UserConfig | null> {
  if (!configFile) {
    return {}
  }

  const text = await fs.readFile(configFile, "utf8").catch((error) => {
    if ((error as { code?: unknown }).code === "ENOENT") {
      return null
    }

    throw error
  })
  if (!text || !text.trim()) {
    return null
  }

  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== "object") {
    return null
  }

  const record = parsed as Record<string, unknown>
  return {
    apiKey: typeof record.apiKey === "string" ? record.apiKey : undefined,
    port: normalizeConfigPort(record.port, configFile),
    version: typeof record.version === "number" ? record.version : undefined,
  }
}

function normalizeConfigPort(value: unknown, configFile: string) {
  if (value === undefined || value === null || value === "") {
    return undefined
  }

  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(
      `${path.relative(getAppRoot(), configFile)} 中的 port 必须是 0 到 65535 的整数。`
    )
  }

  return parsed
}

function getProjectConfigFile() {
  return path.join(getAppRoot(), PROJECT_CONFIG_FILE_NAME)
}

function getLegacyProjectConfigFile() {
  return path.join(getAppRoot(), ".session", LEGACY_PROJECT_CONFIG_FILE_NAME)
}

type ProjectStoragePaths = {
  dbFile: string
  dir: string
}

function getLegacySessionStateFile() {
  return path.join(getAppRoot(), ".session", "sessions.json")
}

function getProjectRegistryFile() {
  return path.join(getAppRoot(), ".session", "projects.json")
}

function getProjectStoragePaths(cwd: string): ProjectStoragePaths {
  const dir = path.join(cwd, ".coding-agent")

  return {
    dbFile: path.join(dir, "sessions.sqlite"),
    dir,
  }
}

function getManagedWorktreeRoot() {
  return path.join(getAppRoot(), ".session", WORKTREE_DIR_NAME)
}

function createManagedWorktree(projectCwd: string, sessionId: string): SessionWorkspace {
  readGit(projectCwd, ["rev-parse", "--is-inside-work-tree"])
  const baseRef = readGit(projectCwd, ["rev-parse", "--short", "HEAD"]).trim()
  const root = getManagedWorktreeRoot()
  const projectSlug =
    sanitizePathSegment(path.basename(path.resolve(projectCwd))) || "project"
  const worktreePath = path.join(
    root,
    `${projectSlug}-${sanitizePathSegment(sessionId) || createEntityId("session")}`
  )

  if (isUsableWorkspacePath(worktreePath)) {
    readGit(worktreePath, ["rev-parse", "--is-inside-work-tree"])
    return {
      baseRef,
      createdAt: Date.now(),
      cwd: worktreePath,
      mode: "worktree",
      sourceCwd: path.resolve(projectCwd),
      worktreePath,
    }
  }

  mkdirSync(root, { recursive: true })
  execFileSync(
    "git",
    ["-C", projectCwd, "worktree", "add", "--detach", worktreePath, "HEAD"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  )
  copyWorktreeIncludes(projectCwd, worktreePath)

  return {
    baseRef,
    createdAt: Date.now(),
    cwd: worktreePath,
    mode: "worktree",
    sourceCwd: path.resolve(projectCwd),
    worktreePath,
  }
}

function copyWorktreeIncludes(sourceCwd: string, worktreePath: string) {
  const includeFile = path.join(sourceCwd, ".worktreeinclude")
  if (!isReadableFile(includeFile)) {
    return
  }

  const patterns = readFileSync(includeFile, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
  const relPaths = new Set<string>()

  for (const pattern of patterns) {
    const exactPath = path.resolve(sourceCwd, pattern)
    if (isInsidePath(sourceCwd, exactPath) && existsSync(exactPath)) {
      relPaths.add(path.relative(sourceCwd, exactPath))
    }

    for (const relPath of expandIgnoredPattern(sourceCwd, pattern)) {
      relPaths.add(relPath)
    }
  }

  for (const relPath of relPaths) {
    const sourcePath = path.resolve(sourceCwd, relPath)
    const targetPath = path.resolve(worktreePath, relPath)
    if (!isInsidePath(sourceCwd, sourcePath) || !isInsidePath(worktreePath, targetPath)) {
      continue
    }
    if (!existsSync(sourcePath) || existsSync(targetPath)) {
      continue
    }
    try {
      const stat = lstatSync(sourcePath)
      if (stat.isSymbolicLink()) {
        continue
      }
      mkdirSync(path.dirname(targetPath), { recursive: true })
      cpSync(sourcePath, targetPath, {
        dereference: false,
        errorOnExist: true,
        force: false,
        recursive: stat.isDirectory(),
      })
    } catch {
      // Worktree creation should not fail just because an optional local file was not copied.
    }
  }
}

function expandIgnoredPattern(sourceCwd: string, pattern: string) {
  try {
    return readGit(sourceCwd, [
      "ls-files",
      "--others",
      "--ignored",
      "--exclude-standard",
      "-z",
      "--",
      pattern,
    ])
      .split("\0")
      .map((entry) => entry.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function getAppRoot() {
  const modulePath = fileURLToPath(import.meta.url)
  const moduleDir = path.dirname(modulePath)
  const baseName = path.basename(moduleDir)

  return baseName === "dist" || baseName === "src"
    ? path.dirname(moduleDir)
    : moduleDir
}

async function readProjectRegistry(
  registryFile: string,
  legacyStateFile: string
): Promise<PersistedProjectRegistry | null> {
  const fromRegistry = await fs.readFile(registryFile, "utf8")
    .then((text) => normalizeProjectRegistry(JSON.parse(text)))
    .catch((error) => {
      if ((error as { code?: unknown }).code === "ENOENT") {
        return null
      }

      return null
    })

  if (fromRegistry) {
    return fromRegistry
  }

  const legacy = readLegacyPersistedUiState(legacyStateFile)
  if (!legacy) {
    return null
  }

  return {
    version: 1,
    activeProjectId: legacy.activeProjectId,
    activeSessionId: legacy.activeSessionId,
    projectPaths: legacy.projects.map((project) => project.cwd),
    selectedModel: legacy.selectedModel,
  }
}

async function createLaunchProjectRegistry(
  cwd: string,
  legacyStateFile: string
): Promise<PersistedProjectRegistry | null> {
  const resolved = path.resolve(cwd)
  const persisted = await readProjectPersistedState(resolved, legacyStateFile).catch(
    () => null
  )

  if (!persisted) {
    return null
  }

  return {
    version: 1,
    activeProjectId: persisted.project.id,
    activeSessionId: persisted.activeSessionId,
    projectPaths: [resolved],
    selectedModel: persisted.selectedModel,
  }
}

async function writeProjectRegistry(
  registryFile: string,
  registry: PersistedProjectRegistry
) {
  await fs.mkdir(path.dirname(registryFile), { recursive: true })
  await fs.writeFile(
    registryFile,
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  )
}

function normalizeProjectRegistry(value: unknown): PersistedProjectRegistry | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const projectPaths = Array.isArray(record.projectPaths)
    ? record.projectPaths
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => path.resolve(item))
    : []

  return {
    version: 1,
    activeProjectId: optionalString(record.activeProjectId),
    activeSessionId: optionalString(record.activeSessionId),
    projectPaths: dedupeStrings(projectPaths),
    selectedModel: normalizeModelSelection(record.selectedModel, {
      id: DEFAULT_MODEL,
    }),
  }
}

async function readProjectPersistedState(
  cwd: string,
  legacyStateFile: string
): Promise<PersistedProjectState | null> {
  const storage = getProjectStoragePaths(cwd)
  const fromSqlite = readProjectPersistedStateFromSqlite(storage)
  if (fromSqlite) {
    return fromSqlite
  }

  const legacyProject = readLegacyPersistedProject(legacyStateFile, cwd)
  if (!legacyProject) {
    return null
  }

  const migrated: PersistedProjectState = {
    version: 1,
    activeSessionId: legacyProject.activeSessionId,
    project: legacyProject.project,
    selectedModel: legacyProject.selectedModel,
  }

  await writeProjectPersistedState(migrated)
  return migrated
}

function readProjectPersistedStateFromSqlite(
  storage: ProjectStoragePaths
): PersistedProjectState | null {
  if (!existsSync(storage.dbFile)) {
    return null
  }

  const db = openDatabase(storage.dbFile)
  try {
    ensureProjectStateSchema(db)
    const project = db
      .query<{ id: string; cwd: string; name: string }, []>(
        "SELECT id, cwd, name FROM project LIMIT 1"
      )
      .get()

    if (!project) {
      return null
    }

    const metadata = readProjectMetadata(db)
    const sessionRows = db
      .query<
        {
          id: string
          agent_state: string
          change_baseline_tree: string | null
          change_result_tree: string | null
          created_at: number
          title: string
          updated_at: number
          workspace_json: string | null
        },
        []
      >(
        [
          "SELECT id, agent_state, change_baseline_tree, change_result_tree, created_at, title, updated_at, workspace_json",
          "FROM sessions",
          "ORDER BY position ASC, updated_at DESC",
        ].join(" ")
      )
      .all()
    const sessions = sessionRows.map((session) => ({
      id: session.id,
      agentState: parseJsonValue<CodingAgentSessionSnapshot>(
        session.agent_state,
        {
          contextSummary: "",
          executionMode: "local",
          history: [],
          model: { id: DEFAULT_MODEL },
        }
      ),
      changeBaselineTree: optionalString(session.change_baseline_tree) ?? undefined,
      changeResultTree: optionalString(session.change_result_tree) ?? undefined,
      createdAt: session.created_at,
      messages: db
        .query<{ kind: string; text: string }, [string]>(
          [
            "SELECT kind, text",
            "FROM messages",
            "WHERE session_id = ?",
            "ORDER BY position ASC",
          ].join(" ")
        )
        .all(session.id),
      title: session.title,
      updatedAt: session.updated_at,
      workspace: parseJsonValue<SessionWorkspace | undefined>(
        optionalString(session.workspace_json) ?? "",
        undefined
      ),
    }))

    return {
      version: 1,
      activeSessionId: metadata.activeSessionId,
      project: {
        id: project.id,
        cwd: project.cwd,
        name: project.name,
        sessions,
      },
      selectedModel: metadata.selectedModel,
    }
  } finally {
    db.close()
  }
}

async function writeProjectPersistedState(state: PersistedProjectState) {
  const storage = getProjectStoragePaths(state.project.cwd)
  await fs.mkdir(storage.dir, { recursive: true })
  await ensureProjectStorageIgnored(state.project.cwd)

  const db = openDatabase(storage.dbFile)
  try {
    ensureProjectStateSchema(db)
    db.exec("BEGIN IMMEDIATE")
    try {
      db.query("DELETE FROM messages").run()
      db.query("DELETE FROM sessions").run()
      db.query("DELETE FROM project").run()
      db.query(
        "INSERT INTO project (id, cwd, name) VALUES (?, ?, ?)"
      ).run(state.project.id, state.project.cwd, state.project.name)
      db.query(
        "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)"
      ).run("version", String(state.version))
      db.query(
        "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)"
      ).run("activeSessionId", state.activeSessionId ?? "")
      db.query(
        "INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)"
      ).run("selectedModel", JSON.stringify(state.selectedModel))

      const insertSession = db.query(
        [
          "INSERT INTO sessions",
          "(id, position, title, created_at, updated_at, agent_state, change_baseline_tree, change_result_tree, workspace_json)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ].join(" ")
      )
      const insertMessage = db.query(
        [
          "INSERT INTO messages",
          "(session_id, position, kind, text)",
          "VALUES (?, ?, ?, ?)",
        ].join(" ")
      )

      state.project.sessions.forEach((session, sessionIndex) => {
        insertSession.run(
          session.id,
          sessionIndex,
          session.title,
          session.createdAt,
          session.updatedAt,
          JSON.stringify(session.agentState),
          session.changeBaselineTree ?? null,
          session.changeResultTree ?? null,
          JSON.stringify(session.workspace ?? null)
        )
        session.messages.forEach((message, messageIndex) => {
          insertMessage.run(session.id, messageIndex, message.kind, message.text)
        })
      })

      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  } finally {
    db.close()
  }
}

async function deleteProjectPersistedState(cwd: string, legacyStateFile: string) {
  const storage = getProjectStoragePaths(cwd)
  await deleteProjectAttachments(cwd)
  await Promise.all(
    [
      storage.dbFile,
      `${storage.dbFile}-journal`,
      `${storage.dbFile}-shm`,
      `${storage.dbFile}-wal`,
    ].map((file) => fs.rm(file, { force: true }))
  )
  await fs.rmdir(storage.dir).catch((error) => {
    const code = (error as { code?: unknown }).code
    if (code === "ENOENT" || code === "ENOTEMPTY") {
      return
    }

    throw error
  })
  await removeLegacyPersistedProject(legacyStateFile, cwd)
}

async function deleteSessionAttachments(cwd: string, sessionId: string) {
  const storage = getProjectStoragePaths(cwd)
  const uploadDir = path.join(
    storage.dir,
    "uploads",
    sanitizePathSegment(sessionId) || "session"
  )
  await fs.rm(uploadDir, { force: true, recursive: true })
}

async function deleteManagedSessionWorktree(session: UiAgentSession) {
  if (session.workspace.mode !== "worktree" || !session.workspace.worktreePath) {
    return
  }

  const worktreePath = path.resolve(session.workspace.worktreePath)
  const managedRoot = getManagedWorktreeRoot()
  if (!isInsidePath(managedRoot, worktreePath) || worktreePath === managedRoot) {
    return
  }

  try {
    readGit(session.workspace.sourceCwd, ["worktree", "remove", "--force", worktreePath])
  } catch {
    await fs.rm(worktreePath, { force: true, recursive: true })
  }
}

async function deleteProjectAttachments(cwd: string) {
  const storage = getProjectStoragePaths(cwd)
  await fs.rm(path.join(storage.dir, "uploads"), { force: true, recursive: true })
}

function ensureProjectStateSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY,
      cwd TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      agent_state TEXT NOT NULL,
      change_baseline_tree TEXT,
      change_result_tree TEXT,
      workspace_json TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      session_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      kind TEXT NOT NULL,
      text TEXT NOT NULL,
      PRIMARY KEY (session_id, position),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
      ON sessions(updated_at);
    CREATE INDEX IF NOT EXISTS idx_messages_session_position
      ON messages(session_id, position);
  `)

  ensureColumn(db, "sessions", "change_baseline_tree", "TEXT")
  ensureColumn(db, "sessions", "change_result_tree", "TEXT")
  ensureColumn(db, "sessions", "workspace_json", "TEXT")
}

function ensureColumn(db: Database, table: string, column: string, definition: string) {
  const rows = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all()
  if (rows.some((row) => row.name === column)) {
    return
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

async function ensureProjectStorageIgnored(cwd: string) {
  const gitDir = path.join(cwd, ".git")
  const excludeFile = path.join(gitDir, "info", "exclude")

  if (!isUsableWorkspacePath(gitDir)) {
    return
  }

  try {
    const existing = await fs.readFile(excludeFile, "utf8").catch((error) => {
      if ((error as { code?: unknown }).code === "ENOENT") {
        return ""
      }

      throw error
    })

    if (existing.split(/\r?\n/).some((line) => line.trim() === ".coding-agent/")) {
      return
    }

    const prefix = existing && !existing.endsWith("\n") ? "\n" : ""
    await fs.mkdir(path.dirname(excludeFile), { recursive: true })
    await fs.writeFile(excludeFile, `${existing}${prefix}.coding-agent/\n`, "utf8")
  } catch {
    // Ignoring this only affects git noise; persistence still works.
  }
}

function readProjectMetadata(db: Database) {
  const rows = db
    .query<{ key: string; value: string }, []>("SELECT key, value FROM metadata")
    .all()
  const values = new Map(rows.map((row) => [row.key, row.value]))

  return {
    activeSessionId: values.get("activeSessionId") || null,
    selectedModel: parseJsonValue<ModelSelection>(
      values.get("selectedModel") ?? "",
      { id: DEFAULT_MODEL }
    ),
  }
}

async function removeLegacyPersistedProject(stateFile: string, cwd: string) {
  const legacy = await fs.readFile(stateFile, "utf8")
    .then((text) => normalizePersistedUiState(JSON.parse(text) as unknown))
    .catch((error) => {
      if ((error as { code?: unknown }).code === "ENOENT") {
        return null
      }

      return null
    })

  if (!legacy) {
    return
  }

  const projects = legacy.projects.filter(
    (project) => !sameWorkspacePath(project.cwd, cwd)
  )

  if (projects.length === legacy.projects.length) {
    return
  }

  const activeProject = projects.some((project) => project.id === legacy.activeProjectId)
    ? projects.find((project) => project.id === legacy.activeProjectId) ?? null
    : projects[0] ?? null
  const activeSessionId =
    activeProject &&
    legacy.activeSessionId &&
    activeProject.sessions.some((session) => session.id === legacy.activeSessionId)
      ? legacy.activeSessionId
      : activeProject?.sessions[0]?.id ?? null

  await fs.writeFile(
    stateFile,
    `${JSON.stringify(
      {
        ...legacy,
        activeProjectId: activeProject?.id ?? null,
        activeSessionId,
        projects,
      },
      null,
      2
    )}\n`,
    "utf8"
  )
}

function readLegacyPersistedProject(
  stateFile: string,
  cwd: string
): PersistedProjectState | null {
  const legacy = readLegacyPersistedUiState(stateFile)
  const project = legacy?.projects.find(
    (item) => path.resolve(item.cwd) === path.resolve(cwd)
  )

  if (!legacy || !project) {
    return null
  }

  return {
    version: 1,
    activeSessionId:
      legacy.activeProjectId === project.id ? legacy.activeSessionId : null,
    project,
    selectedModel: legacy.selectedModel,
  }
}

function readLegacyPersistedUiState(stateFile: string): PersistedUiState | null {
  try {
    return normalizePersistedUiState(
      JSON.parse(readFileSync(stateFile, "utf8")) as unknown
    )
  } catch (error) {
    if ((error as { code?: unknown }).code === "ENOENT") {
      return null
    }

    return null
  }
}

function parseJsonValue<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

function normalizePersistedUiState(value: unknown): PersistedUiState | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const projects = Array.isArray(record.projects)
    ? record.projects
        .map(normalizePersistedProject)
        .filter((project): project is PersistedProject => Boolean(project))
    : []

  return {
    version: 1,
    activeProjectId: optionalString(record.activeProjectId),
    activeSessionId: optionalString(record.activeSessionId),
    projects,
    selectedModel: normalizeModelSelection(record.selectedModel, {
      id: DEFAULT_MODEL,
    }),
  }
}

function normalizePersistedProject(
  value: unknown
): PersistedProject | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const cwd = optionalString(record.cwd)
  if (!cwd) {
    return null
  }

  return {
    id: optionalString(record.id) ?? createEntityId("project"),
    cwd,
    name: optionalString(record.name) ?? (path.basename(cwd) || cwd),
    sessions: Array.isArray(record.sessions)
      ? record.sessions
          .map(normalizePersistedSession)
          .filter((session): session is PersistedSession => Boolean(session))
      : [],
  }
}

function normalizePersistedSession(
  value: unknown
): PersistedSession | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const agentState = normalizeAgentSnapshot(record.agentState)

  return {
    id: optionalString(record.id) ?? createEntityId("session"),
    agentState,
    changeBaselineTree: optionalString(record.changeBaselineTree) ?? undefined,
    changeResultTree: optionalString(record.changeResultTree) ?? undefined,
    createdAt: finiteTimestampOrNow(record.createdAt),
    messages: normalizeUiMessages(record.messages),
    title: optionalString(record.title) ?? "新会话",
    updatedAt: finiteTimestampOrNow(record.updatedAt),
  }
}

function normalizeAgentSnapshot(value: unknown): CodingAgentSessionSnapshot {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const contextSummary = optionalString(record.contextSummary) ?? ""
  const history = Array.isArray(record.history)
    ? record.history
        .filter(isPersistedContextEntry)
        .map((entry) => ({ role: entry.role, text: entry.text }))
    : []

  return {
    contextSummary,
    executionMode:
      record.executionMode === "cloud" || record.executionMode === "local"
        ? record.executionMode
        : "local",
    history,
    memory: normalizeSessionMemorySnapshot(record.memory, {
      history,
      summaryText: contextSummary,
    }),
    model: normalizeModelSelection(record.model, { id: DEFAULT_MODEL }),
  }
}

function isPersistedContextEntry(
  value: unknown
): value is CodingAgentSessionSnapshot["history"][number] {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Record<string, unknown>
  return isContextEntryRole(record.role) && typeof record.text === "string"
}

function isContextEntryRole(
  value: unknown
): value is CodingAgentSessionSnapshot["history"][number]["role"] {
  return (
    value === "assistant" ||
    value === "result" ||
    value === "status" ||
    value === "task" ||
    value === "tool" ||
    value === "user"
  )
}

function isMeaningfulUiMessage(message: UiMessage) {
  const tokens = message.kind.split(/\s+/).filter(Boolean)
  return tokens.some((token) =>
    ["activity", "assistant", "multi", "queued", "user"].includes(token)
  )
}

function isMeaningfulContextEntry(
  entry: CodingAgentSessionSnapshot["history"][number]
) {
  return Boolean(entry.text.trim())
}

function normalizeUiMessages(value: unknown): UiMessage[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (message): message is UiMessage =>
        Boolean(message) &&
        typeof message === "object" &&
        typeof (message as UiMessage).kind === "string" &&
        typeof (message as UiMessage).text === "string"
    )
    .map((message) => ({
      kind: message.kind.slice(0, 40),
      text: message.text,
    }))
}

function normalizeModelSelection(
  value: unknown,
  fallback: ModelSelection
): ModelSelection {
  if (!value || typeof value !== "object") {
    return cloneModelSelection(fallback)
  }

  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || !record.id.trim()) {
    return cloneModelSelection(fallback)
  }

  const params = Array.isArray(record.params)
    ? record.params
        .filter(
          (param): param is { id: string; value: string } =>
            Boolean(param) &&
            typeof param === "object" &&
            typeof (param as { id?: unknown }).id === "string" &&
            typeof (param as { value?: unknown }).value === "string"
        )
        .map((param) => ({ id: param.id, value: param.value }))
    : undefined

  return params && params.length > 0
    ? { id: record.id.trim(), params }
    : { id: record.id.trim() }
}

function normalizeSessionWorkspace(
  value: unknown,
  projectCwd: string
): SessionWorkspace {
  const fallback = createLocalSessionWorkspace(projectCwd)
  if (!value || typeof value !== "object") {
    return fallback
  }

  const record = value as Partial<SessionWorkspace>
  const mode = record.mode === "worktree" ? "worktree" : "local"
  const sourceCwd =
    typeof record.sourceCwd === "string" && record.sourceCwd.trim()
      ? path.resolve(record.sourceCwd)
      : path.resolve(projectCwd)
  const cwd =
    typeof record.cwd === "string" && record.cwd.trim()
      ? path.resolve(record.cwd)
      : mode === "local"
        ? sourceCwd
        : fallback.cwd
  const worktreePath =
    typeof record.worktreePath === "string" && record.worktreePath.trim()
      ? path.resolve(record.worktreePath)
      : mode === "worktree"
        ? cwd
        : undefined

  if (mode === "worktree" && worktreePath && isUsableWorkspacePath(worktreePath)) {
    return {
      baseRef: optionalString(record.baseRef) ?? undefined,
      createdAt: finiteTimestampOrNow(record.createdAt),
      cwd: worktreePath,
      mode,
      sourceCwd,
      worktreePath,
    }
  }

  return fallback
}

function createLocalSessionWorkspace(projectCwd: string): SessionWorkspace {
  const cwd = path.resolve(projectCwd)
  return {
    cwd,
    mode: "local",
    sourceCwd: cwd,
  }
}

function publicSessionWorkspace(session: UiAgentSession) {
  return {
    ...session.workspace,
    label: sessionWorkspaceLabel(session),
  }
}

function sessionWorkspaceCwd(session: UiAgentSession) {
  return path.resolve(session.workspace.cwd || session.agent.workspaceCwd)
}

function workspaceHasUncommittedChanges(cwd: string) {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    return readGit(cwd, ["status", "--porcelain"]).trim().length > 0
  } catch {
    return false
  }
}

function sessionWorkspaceLabel(session: UiAgentSession) {
  return session.workspace.mode === "worktree" ? "Worktree" : "Local"
}

function isReadableFile(filePath: string) {
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null
}

function sameWorkspacePath(left: string, right: string) {
  return comparableWorkspacePath(left) === comparableWorkspacePath(right)
}

function isInsidePath(root: string, target: string) {
  const relative = path.relative(
    comparableResolvedPath(root),
    comparableResolvedPath(target)
  )
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function comparableWorkspacePath(value: string) {
  const resolved = path.resolve(value)
  let canonical = resolved
  try {
    canonical = realpathSync.native(resolved)
  } catch {
    canonical = resolved
  }

  return process.platform === "win32" ? canonical.toLowerCase() : canonical
}

function comparableResolvedPath(value: string) {
  const resolved = path.resolve(value)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values))
}

function finiteTimestampOrNow(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Date.now()
}

function isUsableWorkspacePath(cwd: string) {
  try {
    return existsSync(cwd) && statSync(cwd).isDirectory()
  } catch {
    return false
  }
}

function setProcessWorkspaceCwd(cwd: string) {
  const resolved = validateWorkspacePath(cwd)

  try {
    process.chdir(resolved)
  } catch (error) {
    throw new Error(
      `无法把工具工作目录切换到项目：${resolved}。${getErrorMessage(error)}`
    )
  }

  return resolved
}

function assertWorkspaceReady(cwd: string) {
  const resolved = validateWorkspacePath(cwd)

  try {
    accessSync(resolved, fsConstants.R_OK | fsConstants.X_OK)
  } catch (error) {
    throw new Error(
      `项目目录不可读或不可进入：${resolved}。${getErrorMessage(error)}`
    )
  }

  try {
    if (process.platform === "win32") {
      execFileSync("cmd.exe", ["/d", "/s", "/c", "cd"], {
        cwd: resolved,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
    } else {
      execFileSync("sh", ["-lc", "pwd >/dev/null"], {
        cwd: resolved,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
    }
  } catch (error) {
    throw new Error(
      `无法在项目目录执行本地命令：${resolved}。${getErrorMessage(error)}`
    )
  }
}

function openBrowser(url: string) {
  const command =
    process.platform === "win32"
      ? "cmd"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open"
  const args =
    process.platform === "win32"
      ? ["/c", "start", "", url]
      : [url]

  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  })
  child.unref()
}

function hostForBrowser(host: string) {
  return host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function summarizeMultiAgentRun(state: MultiAgentRunState) {
  const lines = [
    `Multi-agent run: ${state.title}`,
    `Status: ${state.status}${state.message ? ` - ${state.message}` : ""}`,
  ]

  for (const task of state.tasks) {
    lines.push("")
    lines.push(`Task ${task.id} (${task.status}): ${task.title}`)
    if (task.errorMessage) {
      lines.push(`Error: ${task.errorMessage}`)
    }
    if (task.resultText) {
      lines.push(truncateText(task.resultText, 1200))
    }
  }

  return lines.join("\n")
}

function truncateText(text: string, maxChars: number) {
  return text.length <= maxChars
    ? text
    : `${text.slice(0, maxChars)}\n[...truncated...]`
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

function isSdkTransportError(error: unknown) {
  const text = getErrorText(error).toLowerCase()

  return (
    text.includes("nghttp2_frame_size_error") ||
    text.includes("err_http2_stream_error") ||
    text.includes("stream closed with error code") ||
    text.includes("connecterror") && text.includes("network error") ||
    isSdkCancellationErrorText(text)
  )
}

function isSdkCancellationErrorText(text: string) {
  return (
    text.includes("connecterror") &&
    text.includes("canceled") &&
    text.includes("operation was aborted")
  ) || (
    text.includes("aborterror") &&
    text.includes("operation was aborted")
  )
}

function getFriendlyRuntimeErrorMessage(error: unknown) {
  if (isSdkCancellationErrorText(getErrorText(error).toLowerCase())) {
    return "任务已取消。"
  }

  if (isSdkTransportError(error)) {
    return "Cursor SDK 网络连接中断，请重试。若持续出现，请检查网络、代理或稍后再试。"
  }

  return getErrorMessage(error)
}

function installSdkTransportErrorGuard() {
  const globalState = globalThis as typeof globalThis & {
    __codingAgentSdkTransportGuardInstalled?: boolean
  }

  if (globalState.__codingAgentSdkTransportGuardInstalled) {
    return
  }

  globalState.__codingAgentSdkTransportGuardInstalled = true
  const shouldLog =
    process.env.CURSOR_SDK_DEBUG_ERRORS === "1" ||
    process.env.CURSOR_SDK_DEBUG_ERRORS === "true"
  const handleKnownSdkError = (error: unknown) => {
    if (isSdkTransportError(error)) {
      if (shouldLog) {
        console.warn(
          `[cursor-sdk] ${getFriendlyRuntimeErrorMessage(error)}`
        )
      }

      return true
    }

    return false
  }

  process.on("unhandledRejection", (reason) => {
    if (!handleKnownSdkError(reason)) {
      throw reason
    }
  })
  process.on("uncaughtException", (error) => {
    if (!handleKnownSdkError(error)) {
      throw error
    }
  })
}

function createEntityId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function findModelChoice(choices: ModelChoice[], model: ModelSelection) {
  return (
    choices.find((choice) => modelSelectionEquals(choice.value, model)) ??
    choices.find(
      (choice) => choice.value.id === model.id && !choice.value.params?.length
    ) ??
    choices.find((choice) => choice.value.id === model.id)
  )
}

function modelSelectionEquals(left: ModelSelection, right: ModelSelection) {
  return modelSelectionKey(left) === modelSelectionKey(right)
}

function modelSelectionKey(model: ModelSelection) {
  const params = [...(model.params ?? [])]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((param) => `${param.id}=${param.value}`)
    .join("&")

  return params ? `${model.id}?${params}` : model.id
}

function cloneModelSelection(model: ModelSelection): ModelSelection {
  return JSON.parse(JSON.stringify(model)) as ModelSelection
}

function validateWorkspacePath(rawPath: string) {
  const resolved = resolveWorkspacePath(rawPath)

  if (!existsSync(resolved)) {
    throw new Error(`项目路径不存在：${resolved}`)
  }

  if (!statSync(resolved).isDirectory()) {
    throw new Error(`项目路径不是目录：${resolved}`)
  }

  return resolved
}

function pickWorkspaceDirectory(initialDirectory = "") {
  const initial = getExistingDirectory(initialDirectory) ?? os.homedir()

  if (process.platform === "darwin") {
    try {
      return pickWorkspaceDirectoryMac(initial)
    } catch {
      return null
    }
  }

  if (process.platform === "win32") {
    return pickWorkspaceDirectoryWindows(initial)
  }

  try {
    return pickWorkspaceDirectoryLinux(initial)
  } catch {
    return null
  }
}

function pickWorkspaceDirectoryMac(initialDirectory: string) {
  const script = [
    `set selectedFolder to choose folder with prompt "选择项目目录" default location POSIX file ${appleScriptString(initialDirectory)}`,
    "POSIX path of selectedFolder",
  ].join("\n")
  const output = execFileSync("osascript", ["-e", script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()

  return output ? validateWorkspacePath(output) : null
}

function pickWorkspaceDirectoryWindows(initialDirectory: string) {
  const outputDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-picker-"))
  const outputFile = path.join(outputDir, "selected-path.txt")
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = '选择项目目录'",
    "$dialog.ShowNewFolderButton = $false",
    "if ($env:CODE_AGENT_INITIAL_DIRECTORY -and (Test-Path -LiteralPath $env:CODE_AGENT_INITIAL_DIRECTORY)) { $dialog.SelectedPath = $env:CODE_AGENT_INITIAL_DIRECTORY }",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [System.IO.File]::WriteAllBytes($env:CODE_AGENT_PICKER_OUTPUT, [System.Text.Encoding]::UTF8.GetBytes($dialog.SelectedPath)) }",
  ].join("; ")
  const env = {
    ...process.env,
    CODE_AGENT_INITIAL_DIRECTORY: initialDirectory,
    CODE_AGENT_PICKER_OUTPUT: outputFile,
  }
  const args = ["-NoProfile", "-STA", "-Command", script]

  try {
    try {
      execFileSync("powershell.exe", args, {
        env,
        stdio: ["ignore", "ignore", "ignore"],
      })
    } catch {
      execFileSync("pwsh", args, {
        env,
        stdio: ["ignore", "ignore", "ignore"],
      })
    }

    const output = readFileSync(outputFile, "utf8").trim()

    return output ? validateWorkspacePath(output) : null
  } catch (error) {
    if ((error as { code?: unknown }).code === "ENOENT") {
      return null
    }

    throw error
  } finally {
    rmSync(outputDir, { force: true, recursive: true })
  }
}

function pickWorkspaceDirectoryLinux(initialDirectory: string) {
  const zenityArgs = [
    "--file-selection",
    "--directory",
    "--title=选择项目目录",
    `--filename=${path.join(initialDirectory, path.sep)}`,
  ]
  const zenity = tryDirectoryPickerCommand("zenity", zenityArgs)
  if (zenity) {
    return validateWorkspacePath(zenity)
  }

  const kdialog = tryDirectoryPickerCommand("kdialog", [
    "--title",
    "选择项目目录",
    "--getexistingdirectory",
    initialDirectory,
  ])

  return kdialog ? validateWorkspacePath(kdialog) : null
}

function tryDirectoryPickerCommand(command: string, args: string[]) {
  try {
    const output = execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return output || null
  } catch {
    return null
  }
}

function getExistingDirectory(rawPath: string) {
  try {
    const resolved = resolveWorkspacePath(rawPath)
    return existsSync(resolved) && statSync(resolved).isDirectory()
      ? resolved
      : null
  } catch {
    return null
  }
}

function appleScriptString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function resolveWorkspacePath(rawPath: string) {
  const trimmed = rawPath.trim()
  const expanded =
    trimmed === "~"
      ? os.homedir()
      : trimmed.startsWith("~/")
        ? path.join(os.homedir(), trimmed.slice(2))
        : trimmed

  return path.resolve(expanded)
}

function isDefaultSessionTitle(title: string) {
  return /^新会话(?:\s+\d+)?$/.test(title)
}

function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim()
  const title = compact.length > 28 ? `${compact.slice(0, 28)}...` : compact
  return title || "新会话"
}

function printHelp() {
  console.log(`Coding Agent Web UI

Usage:
  code-agent-ui [options]

Config:
  coding-agent.config.json may define apiKey and port. --port overrides config.

Options:
  -C, --cwd <path>       Startup directory for project picker shortcuts. Defaults to cwd.
  -m, --model <id>      Model id. Defaults to CURSOR_MODEL or composer-2.
      --host <host>     Host to bind. Defaults to 127.0.0.1.
      --port <port>     Port to bind. Defaults to config port, CURSOR_UI_PORT, or 3030.
      --open            Open the browser automatically after startup.
      --no-open         Keep the browser closed after startup. Default.
      --dev-reload      Enable browser auto-reload after dev server restarts.
      --no-dev-reload   Disable browser auto-reload.
      --force           Expire a stuck active local run before starting. Default.
      --no-force        Do not expire a stuck active local run automatically.
      --no-sandbox      Disable Cursor's local shell sandbox for tool calls. Default.
      --sandbox <mode>  Set sandbox mode: enabled or disabled.
      --no-auto-compact Disable automatic conversation compaction.
      --context-max-chars <n>
                        Compact before estimated history exceeds n chars.
      --context-retain-chars <n>
                        Keep this many recent chars outside the summary.
      --context-summary-chars <n>
                        Maximum compressed-memory summary size.
  -h, --help            Show this help.
`)
}


main().catch((error) => {
  console.error(`Error: ${getErrorMessage(error)}`)
  process.exitCode = 1
})
