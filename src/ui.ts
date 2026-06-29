#!/usr/bin/env bun
import { execFileSync, spawn } from "node:child_process"
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs"
import * as fs from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Database } from "bun:sqlite"

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
import { normalizeSessionMemorySnapshot } from "./session-memory.js"
import type { ModelSelection } from "@cursor/sdk"
import { renderCodexAppHtml } from "./web/codex-app/render.js"

type UiOptions = {
  context: ContextCompactionOptions
  cwd: string
  force: boolean
  help: boolean
  host: string
  model: string
  open: boolean
  port: number
  sandboxOptions?: LocalSandboxOptions
}

type ChangedFile = {
  additions?: number
  deletions?: number
  diffLines?: DiffLine[]
  diffTruncated?: boolean
  label: string
  path: string
  status: string
}

type DiffLine = {
  kind: "add" | "context" | "del" | "hunk" | "meta"
  newLine?: number
  oldLine?: number
  text: string
}

type WorkspaceChanges = {
  available: boolean
  files: ChangedFile[]
  message: string
}

type UiProject = {
  id: string
  cwd: string
  name: string
  sessions: UiAgentSession[]
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
}

type UiMessage = {
  kind: string
  text: string
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
}

const DEFAULT_MODEL = process.env.CURSOR_MODEL ?? "composer-2"
const DEFAULT_UI_PORT = readPort(process.env.CURSOR_UI_PORT ?? "3030", "CURSOR_UI_PORT")

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  installSdkTransportErrorGuard()

  let apiKey = process.env.CURSOR_API_KEY ?? ""
  let modelChoices: ModelChoice[] = []
  let modelsLoaded = false
  let selectedModel: ModelSelection = { id: options.model }
  let activeProjectId: string | null = null
  let activeSessionId: string | null = null
  const runningSessions = new Map<
    string,
    { multiRun?: MultiAgentRunner; projectId: string }
  >()
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

  const hasRunningSessions = () => runningSessions.size > 0

  const isSessionRunning = (sessionId?: string | null) =>
    Boolean(sessionId && runningSessions.has(sessionId))

  const isProjectRunning = (projectId: string) =>
    Array.from(runningSessions.values()).some((run) => run.projectId === projectId)

  const runningSessionIds = () => Array.from(runningSessions.keys())

  const hasRunningSessionsOutsideProject = (projectId: string) =>
    Array.from(runningSessions.values()).some((run) => run.projectId !== projectId)

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
    if (sameWorkspacePath(session.agent.workspaceCwd, project.cwd)) {
      return false
    }

    const snapshot = session.agent.snapshot()
    const model = normalizeModelSelection(snapshot.model, selectedModel)
    await session.agent.dispose().catch(() => {})
    session.agent = new CodingAgentSession({
      apiKey,
      context: options.context,
      cwd: project.cwd,
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
    contextUsage: session.agent.contextUsage(),
    id: session.id,
    createdAt: session.createdAt,
    messages: session.messages,
    model: session.agent.model,
    modelLabel: formatModelLabel(session.agent.model),
    projectId: session.projectId,
    running: isSessionRunning(session.id),
    title: session.title,
    updatedAt: session.updatedAt,
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
      autoCompact: options.context.enabled,
      busy: hasRunningSessions(),
      cwd: activeProject?.cwd ?? "",
      hasApiKey: Boolean(apiKey),
      launchCwd: options.cwd,
      message,
      model: formatModelLabel(model),
      modelsLoaded: areModelsReady(),
      platform: process.platform,
      canPersistApiKey: process.platform === "win32",
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

  const createSession = (project: UiProject) => {
    const now = Date.now()
    const session: UiAgentSession = {
      id: createEntityId("session"),
      agent: new CodingAgentSession({
        apiKey,
        context: options.context,
        cwd: project.cwd,
        force: options.force,
        model: cloneModelSelection(selectedModel),
        sandboxOptions: options.sandboxOptions,
      }),
      createdAt: now,
      messages: [],
      projectId: project.id,
      title: `新会话 ${project.sessions.length + 1}`,
      updatedAt: now,
    }

    project.sessions.unshift(session)
    activeProjectId = project.id
    activeSessionId = session.id
    return session
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

    return {
      id: persisted.id || createEntityId("session"),
      agent: new CodingAgentSession({
        apiKey,
        context: options.context,
        cwd: project.cwd,
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
    }
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

      if (request.method === "GET" && url.pathname === "/api/changes") {
        const sessionId = url.searchParams.get("sessionId")?.trim() ?? ""
        const target = getRequestedSession(sessionId)
        sendJson(
          response,
          target
            ? getSessionChanges(target.project.cwd, target.session)
            : { available: false, files: [], message: "请先在项目中新建会话。" }
        )
        return
      }

      if (request.method === "GET" && url.pathname === "/api/models") {
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

        const choices = await loadModelChoices(apiKey)
        applyLoadedModelChoices(choices)
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
        process.env.CURSOR_API_KEY = nextApiKey
        applyLoadedModelChoices(choices)

        for (const item of allSessions()) {
          await item.agent.setApiKey(nextApiKey)
        }

        let saveMessage = "仅当前服务生效。"
        if (save) {
          try {
            persistApiKey(nextApiKey)
            saveMessage = "并保存到 Windows 用户环境变量。"
          } catch (error) {
            saveMessage = `当前服务已生效，但未保存到环境变量：${getErrorMessage(error)}`
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
        const project = getActiveProject()
        if (!project) {
          sendJson(response, { error: "请先打开项目。" }, 400)
          return
        }

        if (!areModelsReady()) {
          sendJson(response, { error: "请先设置 API Key 并加载可用模型。" }, 400)
          return
        }

        const session = createSession(project)
        await persistState()
        sendJson(response, {
          ...buildState(),
          message: `已在 ${project.name} 中创建 ${session.title}。`,
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

      if (request.method === "POST" && url.pathname === "/api/cancel") {
        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim() || activeSessionId || ""
        const running = sessionId ? runningSessions.get(sessionId) : null
        const target = getRequestedSession(sessionId)

        if (!target || !running) {
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

      if (request.method === "POST" && url.pathname === "/api/run") {
        const body = await readJsonBody(request)
        const prompt = stringField(body, "prompt").trim()
        const multiAgent = booleanField(body, "multiAgent")
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

          if (isSessionRunning(activeSession.id)) {
            send({ type: "error", message: "当前会话已有任务在执行。" })
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

          if (!prompt) {
            send({ type: "error", message: "请输入任务内容。" })
            return
          }

          runningSessions.set(activeSession.id, { projectId: activeProject.id })

          try {
            activeSession.changeBaselineTree = createWorkspaceTree(activeProject.cwd)
            activeSession.changeResultTree = undefined
            if (await rebindSessionWorkspace(activeProject, activeSession)) {
              await persistState().catch(() => {})
            }
          } catch (error) {
            send({ type: "error", message: getErrorMessage(error) })
            runningSessions.delete(activeSession.id)
            return
          }

          try {
            const activeCwd = setProcessWorkspaceCwd(activeProject.cwd)
            assertWorkspaceReady(activeCwd)
          } catch (error) {
            send({ type: "error", message: getErrorMessage(error) })
            runningSessions.delete(activeSession.id)
            return
          }

          activeSession.updatedAt = Date.now()
          if (isDefaultSessionTitle(activeSession.title)) {
            activeSession.title = titleFromPrompt(prompt)
          }
          send({ type: "started", mode: multiAgent ? "multi" : "single" })

          try {
            if (multiAgent) {
              const model = cloneModelSelection(activeSession.agent.model)
              const runner = new MultiAgentRunner({
                apiKey,
                cwd: activeProject.cwd,
                force: options.force,
                model,
                modelLabel: formatModelLabel(model),
                prompt,
                sandboxOptions: options.sandboxOptions,
                onEvent: (event) => send({ type: "multi", state: event.state }),
              })
              runningSessions.set(activeSession.id, {
                projectId: activeProject.id,
                multiRun: runner,
              })
              const finalState = await runner.run()
              activeSession.agent.addExternalSummary(
                summarizeMultiAgentRun(finalState)
              )
            } else {
              await activeSession.agent.sendPrompt({
                prompt,
                onEvent: (event) => send({ type: "agent", event }),
              })
            }
            activeSession.updatedAt = Date.now()
            recordSessionChangeResult(activeProject.cwd, activeSession)
            send({ type: "finished" })
          } catch (error) {
            send({ type: "error", message: getFriendlyRuntimeErrorMessage(error) })
          } finally {
            recordSessionChangeResult(activeProject.cwd, activeSession)
            runningSessions.delete(activeSession.id)
            await persistState().catch(() => {})
          }
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

function parseArgs(argv: string[]): UiOptions {
  let context = readContextOptionsFromEnv()
  let cwd = process.cwd()
  let force = readBooleanEnv("CURSOR_FORCE", true)
  let help = false
  let host = "127.0.0.1"
  let model = DEFAULT_MODEL
  let open = false
  let port = DEFAULT_UI_PORT
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

function streamEvents(
  response: ServerResponse,
  handler: (send: (event: unknown) => void) => Promise<void>
) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  })

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

function persistApiKey(apiKey: string) {
  if (process.platform === "win32") {
    execFileSync("setx", ["CURSOR_API_KEY", apiKey], { stdio: "ignore" })
    return
  }

  throw new Error("保存密钥目前只支持 Windows。")
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

  const db = new Database(storage.dbFile)
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
        },
        []
      >(
        [
          "SELECT id, agent_state, change_baseline_tree, change_result_tree, created_at, title, updated_at",
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

  const db = new Database(storage.dbFile, { create: true })
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
          "(id, position, title, created_at, updated_at, agent_state, change_baseline_tree, change_result_tree)",
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
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
          session.changeResultTree ?? null
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
      change_result_tree TEXT
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

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null
}

function sameWorkspacePath(left: string, right: string) {
  return path.resolve(left) === path.resolve(right)
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

function getWorkspaceChanges(cwd: string): WorkspaceChanges {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    const statsByPath = parseGitNumstat(
      readGit(cwd, ["diff", "--numstat", "HEAD", "--"])
    )
    const diffByPath = parseGitDiff(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--no-ext-diff",
        "--no-color",
        "--unified=4",
        "HEAD",
        "--",
      ])
    )
    const files = parseGitStatus(
      readGit(cwd, ["status", "--short"]),
      statsByPath
    )
    attachDiffLines(cwd, files, diffByPath)

    return {
      available: true,
      files,
      message:
        files.length === 0
          ? "当前没有代码变更。"
          : `当前有 ${files.length} 个文件变更。`,
    }
  } catch {
    return {
      available: false,
      files: [],
      message: "当前目录不是 Git 仓库，无法显示代码变更。",
    }
  }
}

function getSessionChanges(cwd: string, session: UiAgentSession): WorkspaceChanges {
  if (!session.changeBaselineTree) {
    return {
      available: true,
      files: [],
      message: "当前会话还没有本次聊天变更。",
    }
  }

  return getWorkspaceChangesSinceTree(
    cwd,
    session.changeBaselineTree,
    session.changeResultTree
  )
}

function recordSessionChangeResult(cwd: string, session: UiAgentSession) {
  if (!session.changeBaselineTree) {
    return
  }

  try {
    session.changeResultTree = createWorkspaceTree(cwd)
  } catch {
    session.changeResultTree = undefined
  }
}

function getWorkspaceChangesSinceTree(
  cwd: string,
  baselineTree: string,
  resultTree?: string
): WorkspaceChanges {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    const currentTree = resultTree || createWorkspaceTree(cwd)

    if (currentTree === baselineTree) {
      return {
        available: true,
        files: [],
        message: "本次聊天没有代码变更。",
      }
    }

    const statsByPath = parseGitNumstat(
      readGit(cwd, ["diff", "--numstat", baselineTree, currentTree, "--"])
    )
    const diffByPath = parseGitDiff(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--no-ext-diff",
        "--no-color",
        "--unified=4",
        baselineTree,
        currentTree,
        "--",
      ])
    )
    const files = parseGitNameStatus(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--name-status",
        baselineTree,
        currentTree,
        "--",
      ]),
      statsByPath
    )
    attachDiffLines(cwd, files, diffByPath)

    return {
      available: true,
      files,
      message:
        files.length === 0
          ? "本次聊天没有代码变更。"
          : `本次聊天有 ${files.length} 个文件变更。`,
    }
  } catch {
    return {
      available: false,
      files: [],
      message: "无法计算本次聊天变更，可能当前目录不是 Git 仓库或基线已失效。",
    }
  }
}

function createWorkspaceTree(cwd: string) {
  readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
  const indexDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-index-"))
  const indexFile = path.join(indexDir, "index")
  const env = { ...process.env, GIT_INDEX_FILE: indexFile }

  try {
    try {
      readGitWithEnv(cwd, ["read-tree", "HEAD"], env)
    } catch {
      readGitWithEnv(cwd, ["read-tree", "--empty"], env)
    }

    readGitWithEnv(cwd, ["add", "-A", "--", "."], env)
    return readGitWithEnv(cwd, ["write-tree"], env).trim()
  } finally {
    rmSync(indexDir, { force: true, recursive: true })
  }
}

function readGit(cwd: string, args: string[]) {
  return readGitWithEnv(cwd, args, process.env)
}

function readGitWithEnv(cwd: string, args: string[], env: NodeJS.ProcessEnv) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "ignore"],
  })
}

const MAX_DIFF_LINES_PER_FILE = 520
const MAX_UNTRACKED_PREVIEW_BYTES = 180_000

function attachDiffLines(
  cwd: string,
  files: ChangedFile[],
  diffByPath: Map<string, DiffLine[]>
) {
  for (const file of files) {
    let diffLines = diffByPath.get(file.path) ?? []

    if (file.status === "??") {
      const preview = createUntrackedDiffPreview(cwd, file.path)
      if (preview) {
        diffLines = preview.lines
        file.additions = file.additions ?? preview.additions
        file.deletions = file.deletions ?? 0
      }
    }

    file.diffTruncated = diffLines.length > MAX_DIFF_LINES_PER_FILE
    file.diffLines = file.diffTruncated
      ? diffLines.slice(0, MAX_DIFF_LINES_PER_FILE)
      : diffLines
  }
}

function parseGitDiff(output: string) {
  const diffByPath = new Map<string, DiffLine[]>()
  let currentPath = ""
  let oldPath = ""
  let lines: DiffLine[] = []
  let oldLine = 0
  let newLine = 0

  const flush = () => {
    if (currentPath) {
      diffByPath.set(currentPath, lines)
    }
    currentPath = ""
    oldPath = ""
    lines = []
    oldLine = 0
    newLine = 0
  }

  for (const rawLine of output.split(/\r?\n/)) {
    if (rawLine.startsWith("diff --git ")) {
      flush()
      continue
    }

    if (rawLine.startsWith("--- ")) {
      oldPath = parseDiffPath(rawLine.slice(4))
      continue
    }

    if (rawLine.startsWith("+++ ")) {
      const newPath = parseDiffPath(rawLine.slice(4))
      currentPath = newPath === "/dev/null" ? oldPath : newPath
      continue
    }

    const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(rawLine)
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1])
      newLine = Number(hunkMatch[2])
      lines.push({
        kind: "hunk",
        text: rawLine,
      })
      continue
    }

    if (!currentPath || rawLine.length === 0) {
      continue
    }

    if (rawLine.startsWith("+")) {
      lines.push({
        kind: "add",
        newLine,
        text: rawLine.slice(1),
      })
      newLine += 1
      continue
    }

    if (rawLine.startsWith("-")) {
      lines.push({
        kind: "del",
        oldLine,
        text: rawLine.slice(1),
      })
      oldLine += 1
      continue
    }

    if (rawLine.startsWith(" ")) {
      lines.push({
        kind: "context",
        newLine,
        oldLine,
        text: rawLine.slice(1),
      })
      oldLine += 1
      newLine += 1
      continue
    }

    if (rawLine.startsWith("\\")) {
      lines.push({
        kind: "meta",
        text: rawLine,
      })
    }
  }

  flush()
  return diffByPath
}

function parseDiffPath(value: string) {
  const withoutMeta = value.split("\t")[0]?.trim() ?? ""
  if (withoutMeta === "/dev/null") {
    return withoutMeta
  }

  return withoutMeta.replace(/^[ab]\//, "")
}

function createUntrackedDiffPreview(cwd: string, filePath: string) {
  try {
    const absolutePath = path.resolve(cwd, filePath)
    const rootPath = path.resolve(cwd)
    if (absolutePath !== rootPath && !absolutePath.startsWith(rootPath + path.sep)) {
      return null
    }

    const stat = statSync(absolutePath)
    if (!stat.isFile() || stat.size > MAX_UNTRACKED_PREVIEW_BYTES) {
      return null
    }

    const buffer = readFileSync(absolutePath)
    if (buffer.includes(0)) {
      return null
    }

    const text = buffer.toString("utf8").replace(/\r\n?/g, "\n")
    const rawLines =
      text.length === 0
        ? []
        : text.endsWith("\n")
          ? text.slice(0, -1).split("\n")
          : text.split("\n")
    const lines = rawLines.map((line, index) => ({
      kind: "add" as const,
      newLine: index + 1,
      text: line,
    }))

    return {
      additions: rawLines.length,
      lines,
    }
  } catch {
    return null
  }
}

function parseGitNumstat(output: string) {
  const statsByPath = new Map<string, { additions?: number; deletions?: number }>()

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const [additionsRaw, deletionsRaw, ...pathParts] = line.split("\t")
    const filePath = normalizeGitRenamePath(pathParts.join("\t"))

    if (!filePath) {
      continue
    }

    statsByPath.set(filePath, {
      additions: parseGitStatNumber(additionsRaw),
      deletions: parseGitStatNumber(deletionsRaw),
    })
  }

  return statsByPath
}

function parseGitStatus(
  output: string,
  statsByPath: Map<string, { additions?: number; deletions?: number }>
) {
  const files: ChangedFile[] = []

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const status = line.slice(0, 2)
    const rawPath = line.slice(3).trim()
    const filePath = normalizeGitRenamePath(rawPath)
    const stats = statsByPath.get(filePath) ?? statsByPath.get(rawPath)

    files.push({
      path: filePath,
      status: status.trim() || status,
      label: gitStatusLabel(status),
      additions: stats?.additions,
      deletions: stats?.deletions,
    })
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function parseGitNameStatus(
  output: string,
  statsByPath: Map<string, { additions?: number; deletions?: number }>
) {
  const files: ChangedFile[] = []

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const [statusRaw, ...pathParts] = line.split("\t")
    const rawPath = pathParts.length > 1 ? pathParts[pathParts.length - 1] : pathParts[0]
    const filePath = normalizeGitRenamePath(rawPath || "")
    const stats = statsByPath.get(filePath) ?? statsByPath.get(rawPath || "")

    if (!filePath) {
      continue
    }

    files.push({
      path: filePath,
      status: statusRaw.trim(),
      label: gitStatusLabel(statusRaw.trim()),
      additions: stats?.additions,
      deletions: stats?.deletions,
    })
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function normalizeGitRenamePath(filePath: string) {
  const match = /^(.*) -> (.*)$/.exec(filePath)
  return (match?.[2] ?? filePath).trim()
}

function parseGitStatNumber(value: string | undefined) {
  if (!value || value === "-") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function gitStatusLabel(status: string) {
  if (status === "??") {
    return "未跟踪"
  }

  if (status.includes("U") || status === "AA" || status === "DD") {
    return "冲突"
  }

  if (status.includes("R")) {
    return "重命名"
  }

  if (status.includes("C")) {
    return "复制"
  }

  if (status.includes("A")) {
    return "新增"
  }

  if (status.includes("D")) {
    return "删除"
  }

  if (status.includes("M")) {
    return "修改"
  }

  return "变更"
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
    text.includes("connecterror") && text.includes("network error")
  )
}

function getFriendlyRuntimeErrorMessage(error: unknown) {
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

  try {
    if (process.platform === "darwin") {
      return pickWorkspaceDirectoryMac(initial)
    }

    if (process.platform === "win32") {
      return pickWorkspaceDirectoryWindows(initial)
    }

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
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$dialog.Description = '选择项目目录'",
    "$dialog.ShowNewFolderButton = $false",
    "if ($env:CODE_AGENT_INITIAL_DIRECTORY -and (Test-Path -LiteralPath $env:CODE_AGENT_INITIAL_DIRECTORY)) { $dialog.SelectedPath = $env:CODE_AGENT_INITIAL_DIRECTORY }",
    "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }",
  ].join("; ")
  const env = {
    ...process.env,
    CODE_AGENT_INITIAL_DIRECTORY: initialDirectory,
  }
  const args = ["-NoProfile", "-STA", "-Command", script]

  let output = ""
  try {
    output = execFileSync("powershell.exe", args, {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    output = execFileSync("pwsh", args, {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  }

  return output ? validateWorkspacePath(output) : null
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

Options:
  -C, --cwd <path>       Startup directory for project picker shortcuts. Defaults to cwd.
  -m, --model <id>      Model id. Defaults to CURSOR_MODEL or composer-2.
      --host <host>     Host to bind. Defaults to 127.0.0.1.
      --port <port>     Port to bind. Defaults to CURSOR_UI_PORT or 3030.
      --open            Open the browser automatically after startup.
      --no-open         Keep the browser closed after startup. Default.
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
