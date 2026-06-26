#!/usr/bin/env bun
import { execFileSync, spawn } from "node:child_process"
import { accessSync, constants as fsConstants, existsSync, statSync } from "node:fs"
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import * as fs from "node:fs/promises"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  CodingAgentSession,
  DEFAULT_CONTEXT_COMPACTION_OPTIONS,
  formatModelLabel,
  formatDuration,
  type AgentEvent,
  type CodingAgentSessionSnapshot,
  type ContextCompactionOptions,
  type LocalSandboxOptions,
} from "./agent.js"
import { MultiAgentRunner, type MultiAgentRunState } from "./multi-agent.js"
import type { ModelSelection } from "@cursor/sdk"

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
  label: string
  path: string
  status: string
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

type PersistedProject = {
  id: string
  cwd: string
  name: string
  sessions: PersistedSession[]
}

type PersistedSession = {
  id: string
  agentState: CodingAgentSessionSnapshot
  createdAt: number
  messages: UiMessage[]
  title: string
  updatedAt: number
}

const DEFAULT_MODEL = process.env.CURSOR_MODEL ?? "composer-2"

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  installSdkTransportErrorGuard()

  let apiKey = process.env.CURSOR_API_KEY ?? ""
  let activeMultiRun: MultiAgentRunner | null = null
  let busy = false
  let selectedModel: ModelSelection = { id: options.model }
  let activeProjectId: string | null = null
  let activeSessionId: string | null = null
  const projects = new Map<string, UiProject>()
  const projectIdsByPath = new Map<string, string>()
  const sessionStorage = getSessionStoragePaths()
  const instanceLock = acquireUiInstanceLock(sessionStorage)
  process.once("exit", () => instanceLock.release())

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

  const getActiveProject = () =>
    activeProjectId ? projects.get(activeProjectId) ?? null : null

  const getActiveSession = () => {
    if (!activeProjectId || !activeSessionId) {
      return null
    }

    const project = projects.get(activeProjectId)
    return project?.sessions.find((session) => session.id === activeSessionId) ?? null
  }

  const publicSession = (session: UiAgentSession) => ({
    id: session.id,
    createdAt: session.createdAt,
    messages: session.messages,
    model: session.agent.model,
    modelLabel: formatModelLabel(session.agent.model),
    projectId: session.projectId,
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
      autoCompact: options.context.enabled,
      busy,
      cwd: activeProject?.cwd ?? "",
      hasApiKey: Boolean(apiKey),
      launchCwd: options.cwd,
      message,
      model: formatModelLabel(model),
      projects: Array.from(projects.values()).map(publicProject),
      selectedModel: model,
    }
  }

  const createProject = (cwd: string): UiProject => {
    const project: UiProject = {
      id: createEntityId("project"),
      cwd,
      name: path.basename(cwd) || cwd,
      sessions: [],
    }
    projects.set(project.id, project)
    projectIdsByPath.set(cwd, project.id)
    return project
  }

  const openProject = (rawCwd: string) => {
    const cwd = setProcessWorkspaceCwd(rawCwd)
    const existingProjectId = projectIdsByPath.get(cwd)
    const project = existingProjectId
      ? projects.get(existingProjectId) ?? createProject(cwd)
      : createProject(cwd)

    activeProjectId = project.id
    activeSessionId = null
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

  const restorePersistedState = async () => {
    const persisted = await readPersistedUiState(sessionStorage.stateFile)
    if (!persisted) {
      return
    }

    selectedModel = normalizeModelSelection(persisted.selectedModel, selectedModel)

    for (const persistedProject of persisted.projects) {
      if (!isUsableWorkspacePath(persistedProject.cwd)) {
        continue
      }

      const cwd = path.resolve(persistedProject.cwd)
      const project: UiProject = {
        id: persistedProject.id || createEntityId("project"),
        cwd,
        name: persistedProject.name?.trim() || path.basename(cwd) || cwd,
        sessions: [],
      }

      projects.set(project.id, project)
      projectIdsByPath.set(project.cwd, project.id)
      project.sessions = persistedProject.sessions.map((session) =>
        createPersistedSession(project, session)
      )
    }

    activeProjectId = null
    activeSessionId = null
  }

  const persistState = async () => {
    const persisted: PersistedUiState = {
      version: 1,
      activeProjectId,
      activeSessionId,
      projects: Array.from(projects.values()).map((project) => ({
        id: project.id,
        cwd: project.cwd,
        name: project.name,
        sessions: project.sessions.map((session) => ({
          id: session.id,
          agentState: session.agent.snapshot(),
          createdAt: session.createdAt,
          messages: session.messages,
          title: session.title,
          updatedAt: session.updatedAt,
        })),
      })),
      selectedModel,
    }

    await writePersistedUiState(sessionStorage, persisted)
  }

  await restorePersistedState()
  const startupProject = openProject(options.cwd)
  await persistState().catch(() => {})

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
        const project = getActiveProject()
        sendJson(
          response,
          project
            ? getWorkspaceChanges(project.cwd)
            : { available: false, files: [], message: "请先打开项目。" }
        )
        return
      }

      if (request.method === "GET" && url.pathname === "/api/models") {
        const activeSession = getActiveSession()
        const currentModel = activeSession?.agent.model ?? selectedModel

        if (!apiKey) {
          sendJson(response, {
            available: false,
            choices: [
              {
                description: "当前默认模型",
                label: formatModelLabel(currentModel),
                value: currentModel,
              },
            ],
            current: currentModel,
            currentLabel: formatModelLabel(currentModel),
            message: "请先设置 CURSOR_API_KEY 后加载可用模型。",
          })
          return
        }

        if (!activeSession) {
          sendJson(response, {
            available: false,
            choices: [
              {
                description: "打开项目并新建会话后可切换模型",
                label: formatModelLabel(currentModel),
                value: currentModel,
              },
            ],
            current: currentModel,
            currentLabel: formatModelLabel(currentModel),
            message: "打开项目并新建会话后可加载可用模型。",
          })
          return
        }

        const choices = await activeSession.agent.listModels()
        sendJson(response, {
          available: true,
          choices,
          current: activeSession.agent.model,
          currentLabel: formatModelLabel(activeSession.agent.model),
          message: `已加载 ${choices.length} 个可用模型。`,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/projects/pick") {
        if (busy) {
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

        const project = openProject(pickedPath)
        await persistState()
        sendJson(response, {
          ...buildState(`已打开项目 ${project.name}。`),
          cancelled: false,
          selectedPath: project.cwd,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/projects/open") {
        if (busy) {
          sendJson(response, { error: "当前任务执行中，结束后再打开项目。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const cwd = stringField(body, "cwd").trim()

        if (!cwd) {
          sendJson(response, { error: "项目路径不能为空。" }, 400)
          return
        }

        const project = openProject(cwd)
        await persistState()
        sendJson(response, buildState(`已打开项目 ${project.name}。`))
        return
      }

      if (request.method === "POST" && url.pathname === "/api/projects/select") {
        if (busy) {
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
        activeSessionId = null
        await persistState()
        sendJson(response, buildState(`已切换到项目 ${project.name}。`))
        return
      }

      if (request.method === "POST" && url.pathname === "/api/sessions/select") {
        if (busy) {
          sendJson(response, { error: "当前任务执行中，结束后再切换会话。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const sessionId = stringField(body, "sessionId").trim()
        const result = findSession(sessionId)

        if (!result) {
          sendJson(response, { error: "会话不存在。" }, 404)
          return
        }

        setProcessWorkspaceCwd(result.project.cwd)
        activeProjectId = result.project.id
        activeSessionId = result.session.id
        await persistState()
        sendJson(response, buildState(`已切换到 ${result.session.title}。`))
        return
      }

      if (request.method === "DELETE" && url.pathname === "/api/sessions") {
        if (busy) {
          sendJson(response, { error: "当前任务执行中，结束后再删除会话。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const bodySessionId = stringField(body, "sessionId").trim()
        const querySessionId = url.searchParams.get("sessionId")?.trim() ?? ""
        const sessionId = bodySessionId || querySessionId

        if (!sessionId) {
          sendJson(response, { error: "sessionId 不能为空。" }, 400)
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
        if (busy) {
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

        for (const item of allSessions()) {
          await item.agent.setApiKey(nextApiKey)
        }

        if (save) {
          persistApiKey(nextApiKey)
        }

        apiKey = nextApiKey
        process.env.CURSOR_API_KEY = nextApiKey
        await persistState()
        sendJson(response, {
          ...buildState(),
          message: save
            ? "密钥已更新，并保存到 Windows 用户环境变量。"
            : "密钥已更新，仅当前会话生效。",
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/model") {
        if (busy) {
          sendJson(response, { error: "当前任务执行中，结束后再切换模型。" }, 409)
          return
        }

        const body = await readJsonBody(request)
        const model = modelSelectionField(body, "model")
        selectedModel = cloneModelSelection(model)
        const activeSession = getActiveSession()

        if (activeSession) {
          activeSession.agent.setModel(model)
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

      if (request.method === "POST" && url.pathname === "/api/reset") {
        if (busy) {
          sendJson(response, { error: "当前任务执行中，结束后再重置。" }, 409)
          return
        }

        const activeSession = getActiveSession()
        if (!activeSession) {
          sendJson(response, { error: "请先在项目中新建会话。" }, 400)
          return
        }

        await activeSession.agent.reset()
        activeSession.messages = []
        activeSession.updatedAt = Date.now()
        await persistState()
        sendJson(response, { ...buildState(), message: "会话已重置。" })
        return
      }

      if (
        request.method === "POST" &&
        (url.pathname === "/api/new-session" || url.pathname === "/api/sessions")
      ) {
        if (busy) {
          sendJson(response, { error: "当前任务执行中，结束后再新建会话。" }, 409)
          return
        }

        const project = getActiveProject()
        if (!project) {
          sendJson(response, { error: "请先打开项目。" }, 400)
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
        if (activeMultiRun) {
          await activeMultiRun.cancel()
          sendJson(response, {
            message: "已请求取消当前多 Agent 任务。",
            cancelled: true,
          })
          return
        }

        const activeSession = getActiveSession()

        if (!activeSession) {
          sendJson(response, { error: "当前没有可取消的会话。" }, 400)
          return
        }

        const result = await activeSession.agent.cancelCurrentRun()
        sendJson(response, {
          message: result.cancelled ? "已请求取消当前任务。" : result.reason,
          cancelled: result.cancelled,
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/compact") {
        streamEvents(response, async (send) => {
          if (busy) {
            send({ type: "error", message: "当前任务执行中，结束后再压缩上下文。" })
            return
          }

          const activeSession = getActiveSession()
          if (!activeSession) {
            send({ type: "error", message: "请先在项目中新建会话。" })
            return
          }

          busy = true
          try {
            await activeSession.agent.compactContext({
              force: true,
              reason: "manual UI compact",
              onEvent: (event) => send({ type: "agent", event }),
            })
            activeSession.updatedAt = Date.now()
            send({ type: "finished" })
          } catch (error) {
            send({ type: "error", message: getFriendlyRuntimeErrorMessage(error) })
          } finally {
            busy = false
            await persistState().catch(() => {})
          }
        })
        return
      }

      if (request.method === "POST" && url.pathname === "/api/run") {
        const body = await readJsonBody(request)
        const prompt = stringField(body, "prompt").trim()
        const multiAgent = booleanField(body, "multiAgent")

        streamEvents(response, async (send) => {
          if (busy) {
            send({ type: "error", message: "当前已有任务在执行。" })
            return
          }

          const activeProject = getActiveProject()
          if (!activeProject) {
            send({ type: "error", message: "请先打开项目。" })
            return
          }

          const activeSession = getActiveSession()
          if (!activeSession) {
            send({ type: "error", message: "请先在项目中新建会话。" })
            return
          }

          if (activeSession.projectId !== activeProject.id) {
            send({
              type: "error",
              message: "当前会话不属于当前项目，请在当前项目中新建会话。",
            })
            activeSessionId = null
            await persistState().catch(() => {})
            return
          }

          if (!apiKey) {
            send({ type: "error", message: "请先设置 CURSOR_API_KEY。" })
            return
          }

          if (!prompt) {
            send({ type: "error", message: "请输入任务内容。" })
            return
          }

          try {
            const activeCwd = setProcessWorkspaceCwd(activeProject.cwd)
            assertWorkspaceReady(activeCwd)
          } catch (error) {
            send({ type: "error", message: getErrorMessage(error) })
            return
          }

          busy = true
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
              activeMultiRun = runner
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
            send({ type: "finished" })
          } catch (error) {
            send({ type: "error", message: getFriendlyRuntimeErrorMessage(error) })
          } finally {
            activeMultiRun = null
            busy = false
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

  const address = server.address()
  const port = typeof address === "object" && address ? address.port : options.port
  const url = `http://${hostForBrowser(options.host)}:${port}/`

  console.log(`Coding Agent UI: ${url}`)
  console.log(`Startup project: ${startupProject.cwd}`)
  console.log(`Process cwd: ${process.cwd()}`)
  console.log("Press Ctrl+C to stop.")

  if (options.open) {
    openBrowser(url)
  }

  const shutdown = async () => {
    server.close()
    for (const item of allSessions()) {
      await item.agent.dispose().catch(() => {})
    }
    instanceLock.release()
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
  let open = true
  let port = 0
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

function booleanField(body: Record<string, unknown>, name: string) {
  return body[name] === true
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

type SessionStoragePaths = {
  dir: string
  lockFile: string
  stateFile: string
}

function getSessionStoragePaths(): SessionStoragePaths {
  const appRoot = getAppRoot()
  const dir = path.join(appRoot, ".session")

  return {
    dir,
    lockFile: path.join(dir, "ui.lock"),
    stateFile: path.join(dir, "sessions.json"),
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

type UiInstanceLock = {
  release: () => void
}

function acquireUiInstanceLock(storage: SessionStoragePaths): UiInstanceLock {
  mkdirSync(storage.dir, { recursive: true })

  const acquire = () => {
    const fd = openSync(storage.lockFile, "wx")
    const metadata = {
      createdAt: new Date().toISOString(),
      host: os.hostname(),
      pid: process.pid,
    }
    let released = false

    writeFileSync(fd, `${JSON.stringify(metadata, null, 2)}\n`, "utf8")

    return {
      release: () => {
        if (released) {
          return
        }

        released = true
        closeLockFile(fd)
        rmSync(storage.lockFile, { force: true })
      },
    }
  }

  try {
    return acquire()
  } catch (error) {
    if ((error as { code?: unknown }).code !== "EEXIST") {
      throw error
    }
  }

  const existing = readUiInstanceLock(storage.lockFile)

  if (existing?.pid && isProcessRunning(existing.pid)) {
    const owner = [
      `pid=${existing.pid}`,
      existing.host ? `host=${existing.host}` : undefined,
      existing.createdAt ? `started=${existing.createdAt}` : undefined,
    ]
      .filter(Boolean)
      .join(", ")

    throw new Error(
      `code-agent-ui is already running for this package (${owner}). Stop it before starting another instance.`
    )
  }

  rmSync(storage.lockFile, { force: true })

  try {
    return acquire()
  } catch (error) {
    if ((error as { code?: unknown }).code === "EEXIST") {
      throw new Error(
        "code-agent-ui is already starting in another process. Stop it before starting another instance."
      )
    }

    throw error
  }
}

function readUiInstanceLock(lockFile: string) {
  try {
    const parsed = JSON.parse(readFileSync(lockFile, "utf8")) as {
      createdAt?: unknown
      host?: unknown
      pid?: unknown
    }

    return {
      createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : null,
      host: typeof parsed.host === "string" ? parsed.host : null,
      pid: typeof parsed.pid === "number" ? parsed.pid : null,
    }
  } catch {
    return null
  }
}

function isProcessRunning(pid: number) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as { code?: unknown }).code === "EPERM"
  }
}

function closeLockFile(fd: number) {
  try {
    closeSync(fd)
  } catch {
    // Best effort cleanup; the process is already exiting.
  }
}

async function readPersistedUiState(
  stateFile: string
): Promise<PersistedUiState | null> {
  try {
    const text = await fs.readFile(stateFile, "utf8")
    const parsed = JSON.parse(text) as unknown
    return normalizePersistedUiState(parsed)
  } catch (error) {
    const code = (error as { code?: unknown }).code
    if (code === "ENOENT") {
      return null
    }

    throw error
  }
}

async function writePersistedUiState(
  storage: SessionStoragePaths,
  state: PersistedUiState
) {
  await fs.mkdir(storage.dir, { recursive: true })
  const tempFile = `${storage.stateFile}.tmp`
  await fs.writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8")
  await fs.rename(tempFile, storage.stateFile)
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
    createdAt: finiteTimestampOrNow(record.createdAt),
    messages: normalizeUiMessages(record.messages),
    title: optionalString(record.title) ?? "新会话",
    updatedAt: finiteTimestampOrNow(record.updatedAt),
  }
}

function normalizeAgentSnapshot(value: unknown): CodingAgentSessionSnapshot {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    contextSummary: optionalString(record.contextSummary) ?? "",
    executionMode:
      record.executionMode === "cloud" || record.executionMode === "local"
        ? record.executionMode
        : "local",
    history: Array.isArray(record.history)
      ? record.history
          .filter(isPersistedContextEntry)
          .map((entry) => ({ role: entry.role, text: entry.text }))
      : [],
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
    const files = parseGitStatus(
      readGit(cwd, ["status", "--short"]),
      statsByPath
    )

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

function readGit(cwd: string, args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
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
  -C, --cwd <path>       Startup workspace directory; opened automatically. Defaults to cwd.
  -m, --model <id>      Model id. Defaults to CURSOR_MODEL or composer-2.
      --host <host>     Host to bind. Defaults to 127.0.0.1.
      --port <port>     Port to bind. Defaults to a free random port.
      --no-open         Do not open the browser automatically.
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

function renderCodexAppHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Coding Agent UI</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --sidebar: #f4f4f3;
      --panel: #ffffff;
      --panel-soft: #f7f7f6;
      --hover: #ececeb;
      --selected: #e4e4e2;
      --text: #1f1f1d;
      --muted: #777772;
      --faint: #aaa9a3;
      --border: #e6e4df;
      --accent: #f05a28;
      --accent-soft: #fff1eb;
      --danger: #b42318;
      --success: #198754;
      --shadow: 0 14px 40px rgba(22, 22, 18, .08);
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #161614;
        --sidebar: #20201d;
        --panel: #1c1c19;
        --panel-soft: #242420;
        --hover: #2a2a26;
        --selected: #30302b;
        --text: #f4f2eb;
        --muted: #aaa79c;
        --faint: #77746a;
        --border: #34342f;
        --accent: #ff7a45;
        --accent-soft: #37241d;
        --danger: #ffb4ab;
        --success: #66d19e;
        --shadow: 0 18px 50px rgba(0, 0, 0, .26);
      }
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      height: 100%;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
    }

    button,
    input,
    select,
    textarea {
      font: inherit;
    }

    button {
      min-height: 32px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      padding: 0 10px;
    }

    button:hover:not(:disabled) {
      background: var(--hover);
    }

    button:disabled,
    input:disabled,
    select:disabled,
    textarea:disabled {
      cursor: not-allowed;
      opacity: .52;
    }

    input,
    select,
    textarea {
      width: 100%;
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      color: var(--text);
      outline: none;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
    }

    .app-shell {
      display: grid;
      grid-template-columns: 326px minmax(0, 1fr);
      height: 100vh;
      min-height: 0;
      overflow: hidden;
    }

    .sidebar {
      display: flex;
      min-height: 0;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--sidebar);
      padding: 12px 8px;
    }

    .window-dots {
      display: flex;
      height: 22px;
      align-items: center;
      gap: 8px;
      padding-left: 8px;
    }

    .dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
    }

    .dot.red {
      background: #ff5f57;
    }

    .dot.yellow {
      background: #ffbd2e;
    }

    .dot.green {
      background: #28c840;
    }

    .nav {
      display: grid;
      gap: 3px;
      padding: 14px 0 16px;
    }

    .nav-button,
    .project-row,
    .session-row {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: flex-start;
      gap: 9px;
      color: var(--text);
      text-align: left;
    }

    .nav-button {
      height: 34px;
      font-weight: 560;
    }

    .icon {
      display: inline-grid;
      width: 18px;
      place-items: center;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 16px;
      line-height: 1;
    }

    .sidebar-heading {
      margin: 12px 10px 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }

    .open-project {
      display: grid;
      gap: 7px;
      padding: 0 8px 12px;
    }

    .open-project input {
      height: 34px;
      padding: 0 10px;
      font-family: var(--mono);
      font-size: 12px;
    }

    .open-project-actions {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px;
    }

    .primary {
      background: var(--text);
      color: var(--bg);
      font-weight: 680;
    }

    .primary:hover:not(:disabled) {
      background: color-mix(in srgb, var(--text) 88%, var(--accent));
    }

    .project-list {
      min-height: 0;
      overflow: auto;
      padding: 0 0 12px;
    }

    .project-group {
      display: grid;
      gap: 2px;
      margin-bottom: 8px;
    }

    .project-row {
      min-height: 38px;
      border-radius: 8px;
      padding: 5px 10px;
    }

    .project-row.active,
    .session-row.active {
      background: var(--selected);
    }

    .project-title,
    .session-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .project-meta {
      display: grid;
      min-width: 0;
      gap: 2px;
    }

    .project-title {
      font-weight: 660;
    }

    .project-path {
      min-width: 0;
      overflow: hidden;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-list {
      display: grid;
      gap: 1px;
      padding-left: 26px;
    }

    .session-item {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 2px;
    }

    .session-row {
      flex: 1;
      min-width: 0;
      min-height: 32px;
      border-radius: 8px;
      padding: 4px 10px;
      color: var(--muted);
      font-size: 13px;
    }

    .session-delete {
      display: grid;
      width: 28px;
      min-height: 28px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 7px;
      color: var(--faint);
      font-size: 16px;
      opacity: .58;
      padding: 0;
    }

    .session-item:hover .session-delete,
    .session-delete:focus-visible {
      opacity: 1;
    }

    .session-delete:hover:not(:disabled) {
      background: color-mix(in srgb, var(--danger) 12%, transparent);
      color: var(--danger);
    }

    .empty-list {
      padding: 7px 10px 7px 36px;
      color: var(--muted);
      font-size: 12px;
    }

    .sidebar-bottom {
      display: grid;
      gap: 10px;
      border-top: 1px solid var(--border);
      padding: 10px 8px 0;
    }

    .settings-grid {
      display: grid;
      gap: 8px;
    }

    .settings-grid label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 12px;
    }

    .settings-grid input,
    .settings-grid select {
      height: 34px;
      padding: 0 9px;
      font-size: 12px;
    }

    .check {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--muted);
      font-size: 12px;
    }

    .check input {
      width: 14px;
      height: 14px;
    }

    .main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 348px;
      min-width: 0;
      min-height: 0;
      background: var(--bg);
    }

    .conversation {
      display: grid;
      grid-template-rows: 52px minmax(0, 1fr) auto;
      min-width: 0;
      min-height: 0;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      border-bottom: 1px solid var(--border);
      padding: 0 18px;
    }

    .title-wrap {
      min-width: 0;
    }

    .page-title {
      overflow: hidden;
      font-size: 15px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .page-subtitle {
      overflow: hidden;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .toolbar {
      display: flex;
      flex-shrink: 0;
      gap: 6px;
    }

    .toolbar button {
      color: var(--muted);
    }

    .messages {
      display: flex;
      min-height: 0;
      flex-direction: column;
      gap: 14px;
      overflow: auto;
      padding: 32px clamp(22px, 12vw, 250px) 140px;
    }

    .message {
      max-width: 100%;
      line-height: 1.65;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .message.user {
      align-self: flex-end;
      max-width: min(620px, 88%);
      border-radius: 16px;
      background: var(--panel-soft);
      padding: 10px 14px;
      font-weight: 560;
    }

    .message.assistant {
      align-self: stretch;
      color: var(--text);
    }

    .message.assistant.markdown {
      white-space: normal;
    }

    .markdown h1,
    .markdown h2,
    .markdown h3,
    .markdown h4,
    .markdown h5,
    .markdown h6 {
      margin: 18px 0 10px;
      color: var(--text);
      font-weight: 760;
      line-height: 1.25;
    }

    .markdown h1 {
      font-size: 26px;
    }

    .markdown h2 {
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      font-size: 22px;
    }

    .markdown h3 {
      font-size: 18px;
    }

    .markdown h4,
    .markdown h5,
    .markdown h6 {
      font-size: 15px;
    }

    .markdown p,
    .markdown ul,
    .markdown ol,
    .markdown blockquote,
    .markdown pre,
    .markdown table {
      margin: 0 0 14px;
    }

    .markdown > :first-child {
      margin-top: 0;
    }

    .markdown > :last-child {
      margin-bottom: 0;
    }

    .markdown ul,
    .markdown ol {
      padding-left: 24px;
    }

    .markdown li {
      margin: 4px 0;
    }

    .markdown blockquote {
      border-left: 3px solid var(--border);
      color: var(--muted);
      padding: 2px 0 2px 14px;
    }

    .markdown code {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel-soft);
      font-family: var(--mono);
      font-size: 0.92em;
      padding: 1px 5px;
    }

    .markdown pre {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel-soft);
      padding: 12px 14px;
      line-height: 1.55;
    }

    .markdown pre code {
      display: block;
      border: 0;
      background: transparent;
      padding: 0;
      white-space: pre;
    }

    .markdown a {
      color: var(--accent);
      text-decoration: none;
    }

    .markdown a:hover {
      text-decoration: underline;
    }

    .markdown hr {
      height: 1px;
      border: 0;
      background: var(--border);
      margin: 18px 0;
    }

    .markdown table {
      width: 100%;
      border-collapse: collapse;
      overflow-wrap: normal;
      font-size: 13px;
    }

    .markdown th,
    .markdown td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }

    .markdown th {
      background: var(--panel-soft);
      font-weight: 700;
    }

    .message.meta {
      align-self: stretch;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-family: var(--mono);
      font-size: 12px;
      padding-top: 10px;
    }

    .message.error {
      color: var(--danger);
    }

    .activity-group {
      align-self: stretch;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-family: var(--mono);
      font-size: 12px;
      padding: 8px 0;
    }

    .activity-group summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 30px;
      border-radius: 7px;
      cursor: pointer;
      list-style: none;
      padding: 0 4px;
      user-select: none;
    }

    .activity-group summary::-webkit-details-marker {
      display: none;
    }

    .activity-group summary:hover {
      background: var(--panel-soft);
    }

    .activity-title {
      color: var(--muted);
      font-weight: 650;
    }

    .activity-latest {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .activity-count {
      flex-shrink: 0;
      color: var(--faint);
    }

    .activity-items {
      display: grid;
      gap: 0;
      padding-top: 6px;
    }

	    .activity-item {
	      border-top: 1px solid var(--border);
	      line-height: 1.55;
	      overflow-wrap: anywhere;
	      padding: 8px 4px;
	      white-space: pre-wrap;
	    }

	    .multi-run {
	      display: grid;
	      align-self: stretch;
	      gap: 12px;
	      border: 1px solid var(--border);
	      border-radius: 8px;
	      background: var(--panel);
	      padding: 14px;
	    }

	    .multi-run-header {
	      display: flex;
	      align-items: flex-start;
	      justify-content: space-between;
	      gap: 12px;
	    }

	    .multi-run-title {
	      display: grid;
	      gap: 4px;
	      min-width: 0;
	    }

	    .multi-run-name {
	      overflow: hidden;
	      font-weight: 760;
	      text-overflow: ellipsis;
	      white-space: nowrap;
	    }

	    .multi-run-meta {
	      color: var(--muted);
	      font-family: var(--mono);
	      font-size: 11px;
	      overflow-wrap: anywhere;
	    }

	    .multi-status {
	      flex: 0 0 auto;
	      border-radius: 999px;
	      background: var(--panel-soft);
	      color: var(--muted);
	      font-family: var(--mono);
	      font-size: 11px;
	      font-weight: 760;
	      padding: 5px 8px;
	    }

	    .multi-status.finished,
	    .multi-task-status.finished {
	      color: var(--success);
	    }

	    .multi-status.error,
	    .multi-status.cancelled,
	    .multi-task-status.error,
	    .multi-task-status.cancelled {
	      color: var(--danger);
	    }

	    .multi-task-grid {
	      display: grid;
	      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
	      gap: 10px;
	    }

	    .multi-task {
	      display: grid;
	      gap: 8px;
	      min-width: 0;
	      border: 1px solid var(--border);
	      border-radius: 8px;
	      background: var(--panel-soft);
	      padding: 10px;
	    }

	    .multi-task-top {
	      display: flex;
	      align-items: flex-start;
	      justify-content: space-between;
	      gap: 8px;
	    }

	    .multi-task-title {
	      min-width: 0;
	      overflow-wrap: anywhere;
	      font-weight: 700;
	    }

	    .multi-task-status {
	      flex: 0 0 auto;
	      font-family: var(--mono);
	      font-size: 11px;
	      font-weight: 760;
	    }

	    .multi-task-deps,
	    .multi-task-model {
	      color: var(--muted);
	      font-family: var(--mono);
	      font-size: 11px;
	      overflow-wrap: anywhere;
	    }

	    .multi-task-output {
	      max-height: 168px;
	      overflow: auto;
	      border-top: 1px solid var(--border);
	      color: var(--text);
	      font-family: var(--mono);
	      font-size: 11px;
	      line-height: 1.5;
	      padding-top: 8px;
	      white-space: pre-wrap;
	    }

    .empty-state {
      display: grid;
      min-height: 100%;
      place-items: center;
      color: var(--muted);
      text-align: center;
    }

    .empty-state-inner {
      display: grid;
      max-width: 420px;
      gap: 14px;
      justify-items: center;
    }

    .empty-title {
      color: var(--text);
      font-size: 20px;
      font-weight: 760;
    }

    .empty-copy {
      line-height: 1.7;
    }

    .composer-wrap {
      display: grid;
      justify-items: center;
      padding: 0 22px 20px;
      background: linear-gradient(to top, var(--bg) 70%, transparent);
    }

    .composer {
      display: grid;
      width: min(812px, 100%);
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 12px;
    }

    .composer textarea {
      min-height: 54px;
      max-height: 190px;
      resize: vertical;
      border: 0;
      padding: 4px 4px 0;
      line-height: 1.55;
    }

    .composer textarea:focus {
      box-shadow: none;
    }

    .composer-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

	    .composer-actions {
	      display: flex;
	      width: auto;
	      align-items: center;
	      justify-content: flex-end;
	      gap: 8px;
	      margin-left: auto;
	    }

	    .composer-mode {
	      display: inline-flex;
	      align-items: center;
	      gap: 6px;
	      color: var(--muted);
	      font-size: 12px;
	      font-weight: 560;
	      white-space: nowrap;
	    }

	    .composer-mode input {
	      width: 14px;
	      height: 14px;
	    }

	    .composer-actions select {
	      width: clamp(112px, 16vw, 176px);
      min-height: 34px;
      border-radius: 999px;
      border-color: transparent;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 13px;
      font-weight: 560;
      padding: 0 10px;
    }

    .send {
      width: 34px;
      min-height: 34px;
      border-radius: 999px;
      padding: 0;
      font-size: 18px;
    }

    .side-panel {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      border-left: 1px solid var(--border);
      padding: 66px 18px 18px;
    }

    .info-card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--panel);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .info-section {
      display: grid;
      gap: 10px;
      border-bottom: 1px solid var(--border);
      padding: 16px 18px;
    }

    .info-section:last-child {
      border-bottom: 0;
    }

    .info-heading {
      color: var(--muted);
      font-size: 15px;
      font-weight: 720;
    }

    .info-text {
      color: var(--muted);
      line-height: 1.55;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .changes-card {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-height: 0;
      margin-top: 16px;
    }

    .changes-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 0 2px 10px;
    }

    .changes-title {
      color: var(--muted);
      font-weight: 720;
    }

    .changes-summary {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      padding-bottom: 8px;
    }

    .changes-list {
      display: grid;
      align-content: start;
      gap: 8px;
      min-height: 0;
      overflow: auto;
    }

    .change-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel);
      padding: 9px;
    }

    .change-status {
      border-radius: 6px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 11px;
      font-weight: 760;
      min-width: 40px;
      padding: 5px 6px;
      text-align: center;
    }

    .change-path {
      overflow-wrap: anywhere;
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.4;
    }

    .change-stats {
      display: flex;
      gap: 8px;
      margin-top: 4px;
      font-family: var(--mono);
      font-size: 11px;
    }

    .change-add {
      color: var(--success);
    }

    .change-del {
      color: var(--danger);
    }

    .toast {
      min-height: 16px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .toast.error {
      color: var(--danger);
    }

    .small-muted {
      color: var(--muted);
      font-size: 12px;
    }

    @media (max-width: 1180px) {
      .main {
        grid-template-columns: minmax(0, 1fr);
      }

      .side-panel {
        display: none;
      }
    }

    @media (max-width: 760px) {
      .app-shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        max-height: 42vh;
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }

      .messages {
        padding: 22px 18px 120px;
      }

      .composer-actions select {
        width: clamp(96px, 34vw, 148px);
      }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="window-dots" aria-hidden="true">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
      </div>

      <nav class="nav" aria-label="Main">
        <button class="nav-button" id="newSessionBtn" type="button">
          <span class="icon">+</span>
          <span>新对话</span>
        </button>
        <button class="nav-button" type="button" disabled>
          <span class="icon">/</span>
          <span>搜索</span>
        </button>
        <button class="nav-button" type="button" disabled>
          <span class="icon">*</span>
          <span>插件</span>
        </button>
        <button class="nav-button" type="button" disabled>
          <span class="icon">o</span>
          <span>自动化</span>
        </button>
      </nav>

      <div class="sidebar-heading">打开项目</div>
      <form class="open-project" id="openProjectForm">
        <input id="projectPath" autocomplete="off" placeholder="可手动输入路径，或点击打开项目选择目录">
        <div class="open-project-actions">
          <button class="primary" id="openProjectBtn" type="button">打开项目</button>
          <button id="useLaunchCwdBtn" type="button">当前目录</button>
        </div>
        <div class="toast" id="projectToast"></div>
      </form>

      <div class="sidebar-heading">项目</div>
      <div class="project-list" id="projectList"></div>

      <div class="sidebar-bottom">
        <div class="settings-grid">
          <label>
            <span>CURSOR_API_KEY</span>
            <input id="apiKey" type="password" autocomplete="off" placeholder="crsr_...">
          </label>
          <label class="check">
            <input id="saveKey" type="checkbox" checked>
            <span>保存到 Windows 用户环境变量</span>
          </label>
          <button id="saveKeyBtn" class="primary" type="button">设置密钥</button>
          <div class="toast" id="keyToast"></div>
        </div>
      </div>
    </aside>

    <main class="main">
      <section class="conversation">
        <header class="topbar">
          <div class="title-wrap">
            <div class="page-title" id="pageTitle">打开项目</div>
            <div class="page-subtitle" id="cwd">启动时未指定项目</div>
          </div>
          <div class="toolbar">
            <button id="compactBtn" type="button">压缩上下文</button>
            <button id="resetBtn" type="button">重置会话</button>
            <button id="cancelBtn" type="button">取消任务</button>
          </div>
        </header>

        <div class="messages" id="messages"></div>

        <div class="composer-wrap">
          <form class="composer" id="composer">
	            <textarea id="prompt" placeholder="要求后续变更"></textarea>
	            <div class="composer-footer">
	              <div class="composer-actions">
	                <label class="composer-mode">
	                  <input id="multiAgentMode" type="checkbox">
	                  <span>多 Agent</span>
	                </label>
	                <select id="modelSelect" aria-label="模型"></select>
	                <button class="send primary" id="sendBtn" type="submit" aria-label="发送">↑</button>
	              </div>
            </div>
          </form>
        </div>
      </section>

      <aside class="side-panel">
        <div class="info-card">
          <section class="info-section">
            <div class="info-heading">输出</div>
            <div class="info-text" id="outputInfo">暂无产物</div>
          </section>
          <section class="info-section">
            <div class="info-heading">来源</div>
            <div class="info-text" id="sourceInfo">暂无来源</div>
          </section>
        </div>

        <section class="changes-card">
          <div class="changes-header">
            <div class="changes-title">代码变更</div>
            <button id="refreshChangesBtn" type="button">刷新</button>
          </div>
          <div class="changes-summary" id="changesSummary">请先打开项目。</div>
          <div class="changes-list" id="changesList"></div>
        </section>
      </aside>
    </main>
  </div>

  <script>
    const els = {
      apiKey: document.getElementById("apiKey"),
      cancelBtn: document.getElementById("cancelBtn"),
      changesList: document.getElementById("changesList"),
      changesSummary: document.getElementById("changesSummary"),
      compactBtn: document.getElementById("compactBtn"),
      composer: document.getElementById("composer"),
      cwd: document.getElementById("cwd"),
      keyToast: document.getElementById("keyToast"),
	      messages: document.getElementById("messages"),
	      modelSelect: document.getElementById("modelSelect"),
	      multiAgentMode: document.getElementById("multiAgentMode"),
	      newSessionBtn: document.getElementById("newSessionBtn"),
      openProjectBtn: document.getElementById("openProjectBtn"),
      openProjectForm: document.getElementById("openProjectForm"),
      outputInfo: document.getElementById("outputInfo"),
      pageTitle: document.getElementById("pageTitle"),
      projectList: document.getElementById("projectList"),
      projectPath: document.getElementById("projectPath"),
      projectToast: document.getElementById("projectToast"),
      prompt: document.getElementById("prompt"),
      refreshChangesBtn: document.getElementById("refreshChangesBtn"),
      resetBtn: document.getElementById("resetBtn"),
      saveKey: document.getElementById("saveKey"),
      saveKeyBtn: document.getElementById("saveKeyBtn"),
      sendBtn: document.getElementById("sendBtn"),
      sourceInfo: document.getElementById("sourceInfo"),
      useLaunchCwdBtn: document.getElementById("useLaunchCwdBtn"),
    }

    let state = {
      activeProject: null,
      activeProjectId: null,
      activeSession: null,
      activeSessionId: null,
      busy: false,
      hasApiKey: false,
      launchCwd: "",
      model: "-",
      projects: [],
      selectedModel: null,
    }
	    const messagesBySession = Object.create(null)
	    let streamingAssistant = null
	    let streamingMultiRun = null
	    let persistMessagesTimer = 0
    const openActivityGroups = new Set()

    function setToast(element, text, isError) {
      element.textContent = text || ""
      element.classList.toggle("error", Boolean(isError))
    }

    function applyState(nextState) {
      state = Object.assign({}, state, nextState || {})
      const liveSessionIds = new Set()
      for (const project of state.projects || []) {
        for (const session of project.sessions || []) {
          liveSessionIds.add(session.id)
          if (!messagesBySession[session.id]) {
            messagesBySession[session.id] = Array.isArray(session.messages)
              ? session.messages.map((message) => ({
                  kind: String(message.kind || "meta"),
                  text: String(message.text || ""),
                }))
              : []
          }
        }
      }
      for (const sessionId of Object.keys(messagesBySession)) {
        if (!liveSessionIds.has(sessionId)) {
          delete messagesBySession[sessionId]
        }
      }
      renderSidebar()
      renderHeader()
      renderMessages()
      renderSideInfo()
      updateControls()
    }

    function activeMessages() {
      if (!state.activeSessionId) return []
      if (!messagesBySession[state.activeSessionId]) {
        messagesBySession[state.activeSessionId] = []
      }
      return messagesBySession[state.activeSessionId]
    }

    function schedulePersistMessages() {
      if (!state.activeSessionId) return
      if (persistMessagesTimer) window.clearTimeout(persistMessagesTimer)
      persistMessagesTimer = window.setTimeout(persistActiveMessages, 300)
    }

    async function persistActiveMessages() {
      const sessionId = state.activeSessionId
      persistMessagesTimer = 0
      if (!sessionId) return

      await postJson("/api/sessions/messages", {
        sessionId,
        messages: messagesBySession[sessionId] || [],
      }).catch(() => {})
    }

    function updateControls() {
      const hasProject = Boolean(state.activeProjectId)
      const hasSession = Boolean(state.activeSessionId)
      const busy = Boolean(state.busy)
      els.newSessionBtn.disabled = busy || !hasProject
      els.compactBtn.disabled = busy || !hasSession
      els.resetBtn.disabled = busy || !hasSession
	      els.cancelBtn.disabled = !hasSession
	      els.modelSelect.disabled = busy || !hasSession
	      els.multiAgentMode.disabled = busy || !hasSession
	      els.prompt.disabled = busy || !hasSession
      els.sendBtn.disabled = busy || !hasSession || !els.prompt.value.trim()
      els.openProjectBtn.disabled = busy
      els.useLaunchCwdBtn.disabled = busy || !state.launchCwd
      els.saveKeyBtn.disabled = busy || !els.apiKey.value.trim()
    }

    function renderSidebar() {
      els.projectList.textContent = ""
      const projects = state.projects || []

      if (projects.length === 0) {
        const empty = document.createElement("div")
        empty.className = "empty-list"
        empty.textContent = "暂无项目"
        els.projectList.appendChild(empty)
        return
      }

      for (const project of projects) {
        const group = document.createElement("div")
        group.className = "project-group"

        const projectButton = document.createElement("button")
        projectButton.type = "button"
        projectButton.className =
          "project-row" + (project.id === state.activeProjectId ? " active" : "")
        projectButton.addEventListener("click", () => selectProject(project.id))

        const icon = document.createElement("span")
        icon.className = "icon"
        icon.textContent = "▣"
        projectButton.appendChild(icon)

        const projectText = document.createElement("span")
        projectText.className = "project-meta"
        const title = document.createElement("span")
        title.className = "project-title"
        title.textContent = project.name
        const path = document.createElement("span")
        path.className = "project-path"
        path.textContent = project.cwd
        projectText.appendChild(title)
        projectText.appendChild(path)
        projectButton.appendChild(projectText)
        group.appendChild(projectButton)

        const sessions = document.createElement("div")
        sessions.className = "session-list"
        if (!project.sessions || project.sessions.length === 0) {
          const empty = document.createElement("div")
          empty.className = "empty-list"
          empty.textContent = "还没有会话"
          sessions.appendChild(empty)
        } else {
          for (const session of project.sessions) {
            const sessionItem = document.createElement("div")
            sessionItem.className = "session-item"
            const sessionButton = document.createElement("button")
            sessionButton.type = "button"
            sessionButton.className =
              "session-row" + (session.id === state.activeSessionId ? " active" : "")
            sessionButton.addEventListener("click", () => selectSession(session.id))
            const marker = document.createElement("span")
            marker.className = "icon"
            marker.textContent = "·"
            const label = document.createElement("span")
            label.className = "session-title"
            label.textContent = session.title
            sessionButton.appendChild(marker)
            sessionButton.appendChild(label)

            const deleteButton = document.createElement("button")
            deleteButton.type = "button"
            deleteButton.className = "session-delete"
            deleteButton.title = "删除会话"
            deleteButton.setAttribute("aria-label", "删除会话 " + session.title)
            deleteButton.textContent = "×"
            deleteButton.disabled = Boolean(state.busy)
            deleteButton.addEventListener("click", (event) => {
              event.stopPropagation()
              void deleteSession(session.id, session.title)
            })

            sessionItem.appendChild(sessionButton)
            sessionItem.appendChild(deleteButton)
            sessions.appendChild(sessionItem)
          }
        }
        group.appendChild(sessions)
        els.projectList.appendChild(group)
      }
    }

    function renderHeader() {
      if (state.activeSession) {
        els.pageTitle.textContent = state.activeSession.title
        els.cwd.textContent = state.activeProject ? state.activeProject.cwd : ""
        return
      }

      if (state.activeProject) {
        els.pageTitle.textContent = state.activeProject.name
        els.cwd.textContent = state.activeProject.cwd
        return
      }

      els.pageTitle.textContent = "打开项目"
      els.cwd.textContent = "当前没有打开项目"
    }

    function renderSideInfo() {
      if (state.activeSession && state.activeProject) {
        els.outputInfo.textContent = "暂无产物"
        els.sourceInfo.textContent =
          state.activeProject.name + "\\n" +
          state.activeProject.cwd + "\\n" +
          state.activeSession.title + "\\n" +
          (state.activeSession.modelLabel || state.model || "-")
        return
      }

      if (state.activeProject) {
        els.outputInfo.textContent = "暂无产物"
        els.sourceInfo.textContent = state.activeProject.name + "\\n" + state.activeProject.cwd
        return
      }

      els.outputInfo.textContent = "暂无产物"
      els.sourceInfo.textContent = "暂无来源"
    }

    function renderMessages() {
      els.messages.textContent = ""

      if (!state.activeProject) {
        renderEmptyState("打开一个项目", "当前没有打开项目。先输入项目目录，再在项目中新建会话。", true)
        return
      }

      if (!state.activeSession) {
        renderEmptyState("在项目中新建会话", "当前项目已经打开，点击左侧新对话开始一次独立的 agent 会话。", false)
        return
      }

      const messages = activeMessages()
      if (messages.length === 0) {
        renderEmptyState("新会话已准备好", "输入任务后，输出、工具调用和代码变更会显示在这个页面里。", false)
        return
      }

      let activityGroup = []
      let activityGroupIndex = 0
      const flushActivityGroup = () => {
        if (activityGroup.length === 0) return
        appendActivityGroup(activityGroup, activityGroupIndex)
        activityGroup = []
        activityGroupIndex += 1
      }

      for (const message of messages) {
        if (isActivityMessage(message)) {
          activityGroup.push(message)
          continue
        }

        flushActivityGroup()
        appendRenderedMessage(message)
      }
      flushActivityGroup()
      els.messages.scrollTop = els.messages.scrollHeight
    }

	    function appendRenderedMessage(message) {
	      if (message.kind === "multi") {
	        appendMultiAgentRun(message)
	        return
	      }

	      const node = document.createElement("div")
	      if (message.kind === "assistant") {
	        node.className = "message assistant markdown"
        renderMarkdownInto(node, message.text)
      } else {
        node.className = "message " + message.kind
        node.textContent = message.text
	      }
	      els.messages.appendChild(node)
	    }

	    function appendMultiAgentRun(message) {
	      let run
	      try {
	        run = JSON.parse(message.text || "{}")
	      } catch {
	        const fallback = document.createElement("div")
	        fallback.className = "message meta error"
	        fallback.textContent = "[多 Agent] 状态数据无法解析"
	        els.messages.appendChild(fallback)
	        return
	      }

	      const wrapper = document.createElement("div")
	      wrapper.className = "multi-run"

	      const header = document.createElement("div")
	      header.className = "multi-run-header"
	      const titleWrap = document.createElement("div")
	      titleWrap.className = "multi-run-title"
	      const title = document.createElement("div")
	      title.className = "multi-run-name"
	      title.textContent = run.title || "多 Agent 任务"
	      const meta = document.createElement("div")
	      meta.className = "multi-run-meta"
	      meta.textContent = [
	        run.message || "",
	        Array.isArray(run.tasks) ? run.tasks.length + " agents" : "",
	        run.finishedAt && run.startedAt ? formatDuration(run.finishedAt - run.startedAt) : "",
	      ].filter(Boolean).join(" · ")
	      titleWrap.appendChild(title)
	      titleWrap.appendChild(meta)

	      const status = document.createElement("div")
	      status.className = "multi-status " + String(run.status || "").toLowerCase()
	      status.textContent = run.status || "-"
	      header.appendChild(titleWrap)
	      header.appendChild(status)
	      wrapper.appendChild(header)

	      const grid = document.createElement("div")
	      grid.className = "multi-task-grid"
	      for (const task of Array.isArray(run.tasks) ? run.tasks : []) {
	        grid.appendChild(renderMultiAgentTask(task))
	      }
	      wrapper.appendChild(grid)
	      els.messages.appendChild(wrapper)
	    }

	    function renderMultiAgentTask(task) {
	      const card = document.createElement("div")
	      card.className = "multi-task"

	      const top = document.createElement("div")
	      top.className = "multi-task-top"
	      const title = document.createElement("div")
	      title.className = "multi-task-title"
	      title.textContent = task.title || task.id || "Subagent"
	      const status = document.createElement("div")
	      status.className = "multi-task-status " + String(task.status || "").toLowerCase()
	      status.textContent = task.status || "-"
	      top.appendChild(title)
	      top.appendChild(status)
	      card.appendChild(top)

	      const model = document.createElement("div")
	      model.className = "multi-task-model"
	      model.textContent = [
	        task.id || "",
	        task.modelLabel || "",
	        task.durationMs ? formatDuration(task.durationMs) : "",
	      ].filter(Boolean).join(" · ")
	      card.appendChild(model)

	      const deps = document.createElement("div")
	      deps.className = "multi-task-deps"
	      deps.textContent =
	        task.dependsOn && task.dependsOn.length
	          ? "depends: " + task.dependsOn.join(", ")
	          : "depends: none"
	      card.appendChild(deps)

	      const outputText = task.errorMessage || task.resultText || task.prompt || ""
	      if (outputText) {
	        const output = document.createElement("div")
	        output.className = "multi-task-output"
	        output.textContent = compactTaskOutput(outputText)
	        card.appendChild(output)
	      }

	      return card
	    }

	    function compactTaskOutput(text) {
	      const value = String(text || "").trim()
	      return value.length > 1600 ? value.slice(0, 1600) + "\\n[...]" : value
	    }

	    function renderMarkdownInto(container, text) {
      container.textContent = ""
      const lines = String(text || "").replace(/\\r\\n?/g, "\\n").split("\\n")
      let index = 0

      while (index < lines.length) {
        const line = lines[index]
        if (!line.trim()) {
          index += 1
          continue
        }

        const fence = getFenceMarker(line)
        if (fence) {
          const pre = document.createElement("pre")
          const code = document.createElement("code")
          const content = []
          index += 1
          while (index < lines.length && !lines[index].trimStart().startsWith(fence)) {
            content.push(lines[index])
            index += 1
          }
          if (index < lines.length) index += 1
          code.textContent = content.join("\\n")
          pre.appendChild(code)
          container.appendChild(pre)
          continue
        }

        if (isTableStart(lines, index)) {
          index = appendMarkdownTable(container, lines, index)
          continue
        }

        const heading = line.match(/^(#{1,6})\\s+(.+)$/)
        if (heading) {
          const level = String(heading[1]).length
          const node = document.createElement("h" + level)
          appendInlineContent(node, heading[2])
          container.appendChild(node)
          index += 1
          continue
        }

        if (/^\\s*([-*_])(?:\\s*\\1){2,}\\s*$/.test(line)) {
          container.appendChild(document.createElement("hr"))
          index += 1
          continue
        }

        if (/^\\s*>\\s?/.test(line)) {
          const quote = document.createElement("blockquote")
          const quoteLines = []
          while (index < lines.length && /^\\s*>\\s?/.test(lines[index])) {
            quoteLines.push(lines[index].replace(/^\\s*>\\s?/, ""))
            index += 1
          }
          renderMarkdownInto(quote, quoteLines.join("\\n"))
          container.appendChild(quote)
          continue
        }

        const unordered = line.match(/^\\s*[-+*]\\s+(.+)$/)
        const ordered = line.match(/^\\s*\\d+[.)]\\s+(.+)$/)
        if (unordered || ordered) {
          const list = document.createElement(ordered ? "ol" : "ul")
          const pattern = ordered ? /^\\s*\\d+[.)]\\s+(.+)$/ : /^\\s*[-+*]\\s+(.+)$/
          while (index < lines.length) {
            const item = lines[index].match(pattern)
            if (!item) break
            const li = document.createElement("li")
            appendInlineContent(li, item[1])
            list.appendChild(li)
            index += 1
          }
          container.appendChild(list)
          continue
        }

        const paragraphLines = []
        while (
          index < lines.length &&
          lines[index].trim() &&
          !isMarkdownBlockStart(lines, index)
        ) {
          paragraphLines.push(lines[index].trim())
          index += 1
        }

        if (paragraphLines.length > 0) {
          const paragraph = document.createElement("p")
          appendInlineContent(paragraph, paragraphLines.join(" "))
          container.appendChild(paragraph)
          continue
        }

        const fallback = document.createElement("p")
        fallback.textContent = line
        container.appendChild(fallback)
        index += 1
      }
    }

    function getFenceMarker(line) {
      const trimmed = String(line || "").trimStart()
      const tickFence = String.fromCharCode(96).repeat(3)
      if (trimmed.startsWith(tickFence)) return tickFence
      if (trimmed.startsWith("~~~")) return "~~~"
      return ""
    }

    function isMarkdownBlockStart(lines, index) {
      const line = lines[index] || ""
      return (
        Boolean(getFenceMarker(line)) ||
        isTableStart(lines, index) ||
        /^(#{1,6})\\s+/.test(line) ||
        /^\\s*([-*_])(?:\\s*\\1){2,}\\s*$/.test(line) ||
        /^\\s*>\\s?/.test(line) ||
        /^\\s*[-+*]\\s+/.test(line) ||
        /^\\s*\\d+[.)]\\s+/.test(line)
      )
    }

    function isTableStart(lines, index) {
      const header = lines[index] || ""
      const divider = lines[index + 1] || ""
      return header.includes("|") && isTableDivider(divider)
    }

    function isTableDivider(line) {
      const cells = parseTableCells(line)
      return (
        cells.length > 1 &&
        cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
      )
    }

    function parseTableCells(line) {
      let value = String(line || "").trim()
      if (value.startsWith("|")) value = value.slice(1)
      if (value.endsWith("|")) value = value.slice(0, -1)
      return value.split("|").map((cell) => cell.trim())
    }

    function appendMarkdownTable(container, lines, index) {
      const table = document.createElement("table")
      const thead = document.createElement("thead")
      const headerRow = document.createElement("tr")
      for (const cell of parseTableCells(lines[index])) {
        const th = document.createElement("th")
        appendInlineContent(th, cell)
        headerRow.appendChild(th)
      }
      thead.appendChild(headerRow)
      table.appendChild(thead)

      const tbody = document.createElement("tbody")
      index += 2
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        const row = document.createElement("tr")
        for (const cell of parseTableCells(lines[index])) {
          const td = document.createElement("td")
          appendInlineContent(td, cell)
          row.appendChild(td)
        }
        tbody.appendChild(row)
        index += 1
      }
      table.appendChild(tbody)
      container.appendChild(table)
      return index
    }

    function appendInlineContent(parent, text) {
      const value = String(text || "")
      let index = 0

      while (index < value.length) {
        const token = findInlineToken(value, index)
        if (!token) {
          appendText(parent, value.slice(index))
          return
        }

        if (token.start > index) {
          appendText(parent, value.slice(index, token.start))
        }

        if (token.type === "code") {
          const code = document.createElement("code")
          code.textContent = token.text
          parent.appendChild(code)
        } else if (token.type === "strong") {
          const strong = document.createElement("strong")
          appendInlineContent(strong, token.text)
          parent.appendChild(strong)
        } else if (token.type === "em") {
          const em = document.createElement("em")
          appendInlineContent(em, token.text)
          parent.appendChild(em)
        } else if (token.type === "link") {
          const href = sanitizeMarkdownUrl(token.href)
          if (href) {
            const anchor = document.createElement("a")
            anchor.href = href
            anchor.rel = "noreferrer"
            if (/^https?:\\/\\//i.test(href)) anchor.target = "_blank"
            appendInlineContent(anchor, token.text)
            parent.appendChild(anchor)
          } else {
            appendText(parent, token.raw)
          }
        }

        index = token.end
      }
    }

    function findInlineToken(text, start) {
      const tick = String.fromCharCode(96)
      for (let index = start; index < text.length; index += 1) {
        if (text.charCodeAt(index) === 96) {
          const close = text.indexOf(tick, index + 1)
          if (close > index + 1) {
            return {
              type: "code",
              start: index,
              end: close + 1,
              text: text.slice(index + 1, close),
            }
          }
        }

        if (text.startsWith("**", index)) {
          const close = text.indexOf("**", index + 2)
          if (close > index + 2) {
            return {
              type: "strong",
              start: index,
              end: close + 2,
              text: text.slice(index + 2, close),
            }
          }
        }

        if (text.charAt(index) === "*" && text.charAt(index + 1) !== "*") {
          const close = text.indexOf("*", index + 1)
          if (close > index + 1) {
            return {
              type: "em",
              start: index,
              end: close + 1,
              text: text.slice(index + 1, close),
            }
          }
        }

        if (text.charAt(index) === "[") {
          const labelEnd = text.indexOf("]", index + 1)
          if (labelEnd > index + 1 && text.charAt(labelEnd + 1) === "(") {
            const hrefEnd = text.indexOf(")", labelEnd + 2)
            if (hrefEnd > labelEnd + 2) {
              return {
                type: "link",
                start: index,
                end: hrefEnd + 1,
                text: text.slice(index + 1, labelEnd),
                href: text.slice(labelEnd + 2, hrefEnd),
                raw: text.slice(index, hrefEnd + 1),
              }
            }
          }
        }
      }

      return null
    }

    function appendText(parent, text) {
      if (text) parent.appendChild(document.createTextNode(text))
    }

    function sanitizeMarkdownUrl(href) {
      const value = String(href || "").trim()
      const lowered = value.toLowerCase()
      if (
        lowered.startsWith("javascript:") ||
        lowered.startsWith("data:") ||
        lowered.startsWith("vbscript:")
      ) {
        return ""
      }
      return value
    }

    function appendActivityGroup(messages, index) {
      const groupKey = String(state.activeSessionId || "") + ":" + index
      const details = document.createElement("details")
      details.className = "activity-group"
      details.open = openActivityGroups.has(groupKey)
      details.addEventListener("toggle", () => {
        if (details.open) {
          openActivityGroups.add(groupKey)
        } else {
          openActivityGroups.delete(groupKey)
        }
      })

      const summary = document.createElement("summary")
      const title = document.createElement("span")
      title.className = "activity-title"
      title.textContent = "处理过程"
      const latest = document.createElement("span")
      latest.className = "activity-latest"
      latest.textContent = summarizeActivity(messages)
      const count = document.createElement("span")
      count.className = "activity-count"
      count.textContent = String(messages.length) + " 条"
      summary.appendChild(title)
      summary.appendChild(latest)
      summary.appendChild(count)

      const items = document.createElement("div")
      items.className = "activity-items"
      for (const message of messages) {
        const item = document.createElement("div")
        item.className = "activity-item"
        item.textContent = message.text
        items.appendChild(item)
      }

      details.appendChild(summary)
      details.appendChild(items)
      els.messages.appendChild(details)
    }

    function summarizeActivity(messages) {
      const latest = messages[messages.length - 1]
      return latest ? latest.text : ""
    }

    function isActivityMessage(message) {
      if (message.kind === "activity") return true
      if (message.kind !== "meta") return false
      return isActivityText(message.text)
    }

    function isActivityText(text) {
      const value = String(text || "")
      return (
        value.startsWith("[工具]") ||
        value.startsWith("[思考]") ||
        value.startsWith("[状态]") ||
        value.startsWith("[任务]") ||
        value.startsWith("[上下文]")
      )
    }

    function renderEmptyState(title, copy, showOpenButton) {
      const wrapper = document.createElement("div")
      wrapper.className = "empty-state"
      const inner = document.createElement("div")
      inner.className = "empty-state-inner"
      const titleNode = document.createElement("div")
      titleNode.className = "empty-title"
      titleNode.textContent = title
      const copyNode = document.createElement("div")
      copyNode.className = "empty-copy"
      copyNode.textContent = copy
      inner.appendChild(titleNode)
      inner.appendChild(copyNode)

      if (!showOpenButton && state.activeProject) {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "primary"
        button.textContent = "新建会话"
        button.disabled = Boolean(state.busy)
        button.addEventListener("click", createNewSession)
        inner.appendChild(button)
      }

      wrapper.appendChild(inner)
      els.messages.appendChild(wrapper)
    }

    function appendMessage(kind, text) {
      const messages = activeMessages()
      messages.push({ kind, text })
      renderMessages()
      schedulePersistMessages()
    }

    function appendMeta(text, isError) {
      appendMessage(isError ? "meta error" : "meta", text)
    }

	    function appendAssistant(text) {
	      const messages = activeMessages()
	      if (!streamingAssistant || messages.indexOf(streamingAssistant) === -1) {
	        streamingAssistant = { kind: "assistant", text: "" }
	        messages.push(streamingAssistant)
      }
      streamingAssistant.text += text
	      renderMessages()
	      schedulePersistMessages()
	    }

	    function updateMultiAgentRun(run) {
	      const messages = activeMessages()
	      if (!streamingMultiRun || messages.indexOf(streamingMultiRun) === -1) {
	        streamingMultiRun = { kind: "multi", text: "{}" }
	        messages.push(streamingMultiRun)
	      }
	      streamingMultiRun.text = JSON.stringify(run || {})
	      renderMessages()
	      schedulePersistMessages()
	    }

	    function formatAgentEvent(event) {
      if (event.type === "assistant_delta") return ""
      if (event.type === "thinking") return "[思考] " + compactText(event.text)
      if (event.type === "tool") {
        return "[工具] " + [event.status, event.name].filter(Boolean).join(" ")
      }
      if (event.type === "status") {
        if (event.status === "FINISHED") return ""
        return "[状态] " + [event.status, event.message].filter(Boolean).join(" ")
      }
      if (event.type === "task") {
        return "[任务] " + [event.status, event.text].filter(Boolean).join(" ")
      }
      if (event.type === "compaction") {
        return "[上下文] " + [event.status, event.message].filter(Boolean).join(" ")
      }
      if (event.type === "result") {
        const details = [
          "status=" + event.status,
          event.durationMs ? "duration=" + formatDuration(event.durationMs) : "",
          event.usage && event.usage.inputTokens ? "input=" + event.usage.inputTokens : "",
          event.usage && event.usage.outputTokens ? "output=" + event.usage.outputTokens : "",
        ].filter(Boolean)
        return "[完成] " + details.join(" ")
      }
      return ""
    }

    function renderAgentEvent(event) {
      if (event.type === "assistant_delta") {
        appendAssistant(event.text)
        return
      }

      const text = formatAgentEvent(event)
      if (text) appendMessage(isActivityEvent(event) ? "activity" : "meta", text)
    }

    function isActivityEvent(event) {
      return (
        event.type === "thinking" ||
        event.type === "tool" ||
        event.type === "status" ||
        event.type === "task" ||
        event.type === "compaction"
      )
    }

    function compactText(text) {
      return String(text || "").replace(/[ \\t\\r\\n]+/g, " ").trim()
    }

    function formatDuration(ms) {
      if (ms < 1000) return ms + "ms"
      return (ms / 1000).toFixed(1) + "s"
    }

    async function refreshStatus() {
      const response = await fetch("/api/status")
      const result = await response.json()
      applyState(result)
      if (!els.projectPath.value && result.launchCwd) {
        els.projectPath.placeholder = result.launchCwd
      }
    }

    async function refreshModels() {
      const response = await fetch("/api/models")
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "加载模型失败")
      renderModelOptions(result.choices || [], result.current)
    }

    function renderModelOptions(choices, current) {
      const currentKey = JSON.stringify(current || {})
      els.modelSelect.textContent = ""
      for (const choice of choices) {
        const option = document.createElement("option")
        option.value = JSON.stringify(choice.value)
        option.textContent = choice.label || "Model"
        option.title = choice.description || choice.label || ""
        option.selected = option.value === currentKey
        els.modelSelect.appendChild(option)
      }
      if (choices.length === 0) {
        const option = document.createElement("option")
        option.value = ""
        option.textContent = state.model || "暂无可用模型"
        els.modelSelect.appendChild(option)
      }
    }

    async function refreshChanges() {
      const response = await fetch("/api/changes")
      const changes = await response.json()
      renderChanges(changes)
    }

    function renderChanges(changes) {
      els.changesSummary.textContent = changes.message || ""
      els.changesList.textContent = ""

      if (!changes.available || !changes.files || changes.files.length === 0) {
        const empty = document.createElement("div")
        empty.className = "small-muted"
        empty.textContent = changes.message || "当前没有代码变更。"
        els.changesList.appendChild(empty)
        return
      }

      for (const file of changes.files) {
        const item = document.createElement("div")
        item.className = "change-item"
        const status = document.createElement("div")
        status.className = "change-status"
        status.textContent = file.label
        const body = document.createElement("div")
        const filePath = document.createElement("div")
        filePath.className = "change-path"
        filePath.textContent = file.path
        body.appendChild(filePath)
        const statsText = formatChangeStats(file)
        if (statsText) {
          const stats = document.createElement("div")
          stats.className = "change-stats"
          const add = document.createElement("span")
          add.className = "change-add"
          add.textContent = statsText.add
          const del = document.createElement("span")
          del.className = "change-del"
          del.textContent = statsText.del
          stats.appendChild(add)
          stats.appendChild(del)
          body.appendChild(stats)
        }
        item.appendChild(status)
        item.appendChild(body)
        els.changesList.appendChild(item)
      }
    }

    function formatChangeStats(file) {
      const additions = Number.isFinite(file.additions) ? file.additions : null
      const deletions = Number.isFinite(file.deletions) ? file.deletions : null
      if (additions === null && deletions === null) return null
      return {
        add: "+" + (additions || 0),
        del: "-" + (deletions || 0),
      }
    }

    async function postJson(path, body) {
      return requestJson(path, "POST", body)
    }

    async function deleteJson(path, body) {
      return requestJson(path, "DELETE", body)
    }

    async function requestJson(path, method, body) {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "请求失败")
      return result
    }

    async function streamPost(path, body) {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })
      if (!response.body) throw new Error("当前浏览器不支持流式读取。")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const read = await reader.read()
        if (read.done) break
        buffer += decoder.decode(read.value, { stream: true })
        const lines = buffer.split("\\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (!line.trim()) continue
          handleStreamEvent(JSON.parse(line))
        }
      }
      if (buffer.trim()) handleStreamEvent(JSON.parse(buffer))
    }

	    function handleStreamEvent(payload) {
	      if (payload.type === "agent") {
	        renderAgentEvent(payload.event)
	        return
	      }
	      if (payload.type === "multi") {
	        updateMultiAgentRun(payload.state)
	        return
	      }
	      if (payload.type === "error") {
	        appendMeta("[错误] " + payload.message, true)
        return
      }
	      if (payload.type === "started") {
	        appendMeta(payload.mode === "multi" ? "[开始] 多 Agent 任务已提交" : "[开始] 任务已提交")
	        return
	      }
      if (payload.type === "finished") {
        appendMeta("[完成] 流式输出结束")
      }
    }

    async function openProject(path) {
      setToast(els.projectToast, "正在打开...")
      try {
	        const result = await postJson("/api/projects/open", { cwd: path })
	        streamingAssistant = null
	        streamingMultiRun = null
	        applyState(result)
        setToast(els.projectToast, result.message || "项目已打开。")
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        setToast(els.projectToast, error.message, true)
      }
    }

    async function pickProject() {
      setToast(els.projectToast, "请选择项目目录...")
      try {
        const result = await postJson("/api/projects/pick", {
          initialDirectory: els.projectPath.value.trim() || state.launchCwd || "",
        })

        if (result.cancelled) {
          setToast(els.projectToast, result.message || "已取消选择项目。")
          return
        }

	        if (result.selectedPath) {
	          els.projectPath.value = result.selectedPath
	        }

	        streamingAssistant = null
	        streamingMultiRun = null
	        applyState(result)
        setToast(els.projectToast, result.message || "项目已打开。")
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        setToast(els.projectToast, error.message, true)
      }
    }

    async function selectProject(projectId) {
      try {
	        const result = await postJson("/api/projects/select", { projectId })
	        streamingAssistant = null
	        streamingMultiRun = null
	        applyState(result)
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        setToast(els.projectToast, error.message, true)
      }
    }

    async function selectSession(sessionId) {
      try {
	        const result = await postJson("/api/sessions/select", { sessionId })
	        streamingAssistant = null
	        streamingMultiRun = null
	        applyState(result)
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    }

    async function deleteSession(sessionId, title) {
      if (state.busy) return

      const label = title || "此会话"
      if (!window.confirm("删除会话「" + label + "」？此操作会移除本地会话记录。")) {
        return
      }

      const wasActive = sessionId === state.activeSessionId
      if (wasActive && persistMessagesTimer) {
        window.clearTimeout(persistMessagesTimer)
        persistMessagesTimer = 0
      }

      try {
	        const result = await deleteJson("/api/sessions", { sessionId })
	        delete messagesBySession[sessionId]
	        streamingAssistant = null
	        streamingMultiRun = null
	        applyState(result)
        setToast(els.projectToast, result.message || "会话已删除。")
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        if (state.activeSessionId) appendMeta("[错误] " + error.message, true)
        else setToast(els.projectToast, error.message, true)
      }
    }

    async function createNewSession() {
      try {
	        const result = await postJson("/api/sessions")
	        applyState(result)
	        streamingAssistant = null
	        streamingMultiRun = null
	        messagesBySession[result.activeSessionId] = []
        appendMeta("[新会话] " + result.message)
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        if (state.activeSessionId) appendMeta("[错误] " + error.message, true)
        else setToast(els.projectToast, error.message, true)
      }
    }

    els.openProjectForm.addEventListener("submit", (event) => {
      event.preventDefault()
      const path = els.projectPath.value.trim()
      if (!path) {
        void pickProject()
        return
      }
      void openProject(path)
    })

    els.openProjectBtn.addEventListener("click", pickProject)

    els.useLaunchCwdBtn.addEventListener("click", () => {
      if (state.launchCwd) {
        els.projectPath.value = state.launchCwd
        void openProject(state.launchCwd)
      }
    })

    els.newSessionBtn.addEventListener("click", createNewSession)

    els.saveKeyBtn.addEventListener("click", async () => {
      setToast(els.keyToast, "正在设置...")
      try {
        const result = await postJson("/api/key", {
          apiKey: els.apiKey.value,
          save: els.saveKey.checked,
        })
        els.apiKey.value = ""
        applyState(result)
        setToast(els.keyToast, result.message)
        await refreshModels().catch(() => {})
      } catch (error) {
        setToast(els.keyToast, error.message, true)
      } finally {
        updateControls()
      }
    })

    els.modelSelect.addEventListener("change", async () => {
      if (!els.modelSelect.value || state.busy) return
      try {
        const result = await postJson("/api/model", {
          model: JSON.parse(els.modelSelect.value),
        })
        applyState(result)
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
        await refreshModels().catch(() => {})
      }
    })

    els.resetBtn.addEventListener("click", async () => {
      try {
	        const result = await postJson("/api/reset")
	        if (state.activeSessionId) messagesBySession[state.activeSessionId] = []
	        streamingAssistant = null
	        streamingMultiRun = null
	        applyState(result)
        appendMeta("[重置] " + result.message)
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    })

    els.cancelBtn.addEventListener("click", async () => {
      try {
        const result = await postJson("/api/cancel")
        appendMeta("[取消] " + result.message)
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    })

    els.compactBtn.addEventListener("click", async () => {
	      state.busy = true
	      updateControls()
	      streamingAssistant = null
	      streamingMultiRun = null
      try {
        await streamPost("/api/compact")
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        state.busy = false
        await refreshStatus()
        await refreshChanges()
      }
    })

    els.refreshChangesBtn.addEventListener("click", async () => {
      try {
        await refreshChanges()
      } catch (error) {
        els.changesSummary.textContent = error.message
      }
    })

    els.composer.addEventListener("submit", async (event) => {
      event.preventDefault()
      const prompt = els.prompt.value.trim()
      if (!prompt || state.busy || !state.activeSessionId) return

	      appendMessage("user", prompt)
	      els.prompt.value = ""
	      streamingAssistant = null
	      streamingMultiRun = null
	      state.busy = true
	      updateControls()

	      try {
	        await streamPost("/api/run", {
	          prompt,
	          multiAgent: els.multiAgentMode.checked,
	        })
	      } catch (error) {
        appendMeta("[错误] " + error.message, true)
	      } finally {
	        streamingAssistant = null
	        streamingMultiRun = null
	        state.busy = false
        await refreshStatus()
        await refreshChanges()
      }
    })

    els.prompt.addEventListener("input", updateControls)
    els.apiKey.addEventListener("input", updateControls)
    els.prompt.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault()
        els.composer.requestSubmit()
      }
    })

    Promise.all([refreshStatus(), refreshModels(), refreshChanges()]).catch((error) => {
      setToast(els.projectToast, error.message, true)
    })
  </script>
</body>
</html>`
}

function renderAppHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Coding Agent UI</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --panel-2: #eef1f4;
      --text: #17191c;
      --muted: #626a73;
      --border: #d8dde3;
      --accent: #0f766e;
      --accent-strong: #0b5f59;
      --danger: #b42318;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #101214;
        --panel: #181b1f;
        --panel-2: #22272d;
        --text: #eef1f4;
        --muted: #a0a7b0;
        --border: #333942;
        --accent: #2dd4bf;
        --accent-strong: #5eead4;
        --danger: #ffb4ab;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      font-size: 14px;
    }

    button,
    input,
    select,
    textarea {
      font: inherit;
    }

    button {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      color: var(--text);
      cursor: pointer;
      min-height: 34px;
      padding: 0 12px;
    }

    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
      font-weight: 650;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: .55;
    }

    input,
    select,
    textarea {
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--panel);
      color: var(--text);
      outline: none;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
    }

    .app {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-height: 100vh;
    }

    .topbar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      padding: 12px 18px;
    }

    .title {
      display: flex;
      align-items: baseline;
      gap: 12px;
      min-width: 0;
    }

    .title h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 750;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .meta {
      color: var(--muted);
      font-family: var(--mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
    }

    .main {
      display: grid;
      grid-template-columns: minmax(240px, 300px) minmax(0, 1fr) minmax(260px, 340px);
      gap: 16px;
      min-height: 0;
      padding: 16px;
    }

    .sidebar,
    .changes,
    .workspace {
      min-height: 0;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section {
      padding: 14px;
    }

    .section h2 {
      margin: 0 0 10px;
      font-size: 13px;
      letter-spacing: 0;
    }

    .field {
      display: grid;
      gap: 6px;
      margin-bottom: 10px;
    }

    .field label {
      color: var(--muted);
      font-size: 12px;
    }

    .field input,
    .field select {
      min-width: 0;
      padding: 8px 10px;
    }

    .check {
      display: flex;
      gap: 8px;
      align-items: center;
      color: var(--muted);
      margin: 8px 0 12px;
    }

    .check input {
      width: 16px;
      height: 16px;
    }

    .status-list {
      display: grid;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }

    .status-list code {
      color: var(--text);
      font-family: var(--mono);
      word-break: break-all;
    }

    .workspace {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
    }

    .changes {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .changes-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: start;
      border-bottom: 1px solid var(--border);
      padding: 12px 14px;
    }

    .changes-header h2 {
      margin: 0 0 4px;
      font-size: 13px;
      letter-spacing: 0;
    }

    .changes-summary {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }

    .changes-list {
      display: grid;
      align-content: start;
      gap: 8px;
      overflow: auto;
      padding: 12px;
    }

    .change-item {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 8px;
      align-items: start;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      padding: 9px;
    }

    .change-status {
      border-radius: 4px;
      background: var(--panel-2);
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      min-width: 42px;
      padding: 5px 6px;
      text-align: center;
    }

    .change-path {
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .change-stats {
      color: var(--muted);
      display: flex;
      gap: 8px;
      font-family: var(--mono);
      font-size: 12px;
      margin-top: 5px;
    }

    .change-add {
      color: #17803d;
    }

    .change-del {
      color: var(--danger);
    }

    .empty-state {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
      padding: 2px;
    }

    .messages {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
      overflow: auto;
      padding: 16px;
    }

    .message {
      max-width: min(980px, 100%);
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      padding: 10px 12px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .message.user {
      align-self: flex-end;
      background: var(--panel-2);
    }

    .message.assistant {
      align-self: flex-start;
    }

    .message.meta {
      align-self: stretch;
      max-width: 100%;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 12px;
      padding: 7px 10px;
    }

    .message.error {
      border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
      color: var(--danger);
    }

    .composer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      border-top: 1px solid var(--border);
      background: var(--panel);
      padding: 12px 16px;
    }

    .composer textarea {
      min-height: 52px;
      max-height: 180px;
      resize: vertical;
      padding: 10px 12px;
      line-height: 1.45;
    }

    .composer-actions {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .toast {
      min-height: 20px;
      color: var(--muted);
      font-size: 13px;
      margin-top: 8px;
    }

    .toast.error {
      color: var(--danger);
    }

    @media (max-width: 860px) {
      .topbar,
      .main,
      .composer {
        grid-template-columns: 1fr;
      }

      .toolbar,
      .composer-actions {
        justify-content: flex-start;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="title">
        <h1>Coding Agent UI</h1>
        <div class="meta" id="cwd">加载中...</div>
      </div>
      <div class="toolbar">
        <button id="compactBtn">压缩上下文</button>
        <button id="newSessionBtn">新建会话</button>
        <button id="resetBtn">重置会话</button>
        <button id="cancelBtn">取消任务</button>
      </div>
    </header>

    <main class="main">
      <aside class="sidebar">
        <section class="panel section">
          <h2>密钥</h2>
          <div class="field">
            <label for="apiKey">CURSOR_API_KEY</label>
            <input id="apiKey" type="password" autocomplete="off" placeholder="crsr_...">
          </div>
          <label class="check">
            <input id="saveKey" type="checkbox" checked>
            <span>保存到 Windows 用户环境变量</span>
          </label>
          <button class="primary" id="saveKeyBtn">设置密钥</button>
          <div class="toast" id="keyToast"></div>
        </section>

        <section class="panel section">
          <h2>状态</h2>
          <div class="field">
            <label for="modelSelect">模型</label>
            <select id="modelSelect"></select>
          </div>
          <div class="toast" id="modelToast"></div>
          <div class="status-list">
            <div>当前模型：<code id="model">-</code></div>
            <div>密钥：<code id="keyStatus">-</code></div>
            <div>自动压缩：<code id="compactStatus">-</code></div>
            <div>运行状态：<code id="runStatus">空闲</code></div>
          </div>
        </section>
      </aside>

      <section class="workspace panel">
        <div class="messages" id="messages"></div>
      </section>

      <aside class="changes panel">
        <div class="changes-header">
          <div>
            <h2>代码变更</h2>
            <div class="changes-summary" id="changesSummary">加载中...</div>
          </div>
          <button id="refreshChangesBtn" type="button">刷新</button>
        </div>
        <div class="changes-list" id="changesList"></div>
      </aside>
    </main>

    <form class="composer" id="composer">
      <textarea id="prompt" placeholder="输入任务，例如：分析这个项目的登录逻辑"></textarea>
      <div class="composer-actions">
        <button type="submit" class="primary" id="sendBtn">发送</button>
      </div>
    </form>
  </div>

  <script>
    const els = {
      apiKey: document.getElementById("apiKey"),
      cancelBtn: document.getElementById("cancelBtn"),
      changesList: document.getElementById("changesList"),
      changesSummary: document.getElementById("changesSummary"),
      compactBtn: document.getElementById("compactBtn"),
      compactStatus: document.getElementById("compactStatus"),
      composer: document.getElementById("composer"),
      cwd: document.getElementById("cwd"),
      keyStatus: document.getElementById("keyStatus"),
      keyToast: document.getElementById("keyToast"),
      messages: document.getElementById("messages"),
      model: document.getElementById("model"),
      modelSelect: document.getElementById("modelSelect"),
      modelToast: document.getElementById("modelToast"),
      newSessionBtn: document.getElementById("newSessionBtn"),
      prompt: document.getElementById("prompt"),
      refreshChangesBtn: document.getElementById("refreshChangesBtn"),
      resetBtn: document.getElementById("resetBtn"),
      runStatus: document.getElementById("runStatus"),
      saveKey: document.getElementById("saveKey"),
      saveKeyBtn: document.getElementById("saveKeyBtn"),
      sendBtn: document.getElementById("sendBtn"),
    }

    let assistantMessage = null
    let busy = false
    let modelChoices = []

    function setBusy(nextBusy) {
      busy = nextBusy
      els.sendBtn.disabled = nextBusy
      els.compactBtn.disabled = nextBusy
      els.newSessionBtn.disabled = nextBusy
      els.resetBtn.disabled = nextBusy
      els.modelSelect.disabled = nextBusy
      els.runStatus.textContent = nextBusy ? "执行中" : "空闲"
    }

    function setToast(element, text, isError = false) {
      element.textContent = text
      element.classList.toggle("error", isError)
    }

    function appendMessage(kind, text) {
      const node = document.createElement("div")
      node.className = "message " + kind
      node.textContent = text
      els.messages.appendChild(node)
      els.messages.scrollTop = els.messages.scrollHeight
      return node
    }

    function appendMeta(text, isError = false) {
      appendMessage(isError ? "meta error" : "meta", text)
    }

    function appendAssistant(text) {
      if (!assistantMessage) {
        assistantMessage = appendMessage("assistant", "")
      }
      assistantMessage.textContent += text
      els.messages.scrollTop = els.messages.scrollHeight
    }

    function formatAgentEvent(event) {
      if (event.type === "thinking") {
        return "[思考] " + compactText(event.text)
      }
      if (event.type === "tool") {
        return "[工具] " + [event.status, event.name].filter(Boolean).join(" ")
      }
      if (event.type === "status") {
        if (event.status === "FINISHED") return ""
        return "[状态] " + [event.status, event.message].filter(Boolean).join(" ")
      }
      if (event.type === "task") {
        return "[任务] " + [event.status, event.text].filter(Boolean).join(" ")
      }
      if (event.type === "compaction") {
        return "[上下文] " + [event.status, event.message].filter(Boolean).join(" ")
      }
      if (event.type === "result") {
        const details = [
          "status=" + event.status,
          event.durationMs ? "duration=" + formatDuration(event.durationMs) : "",
          event.usage && event.usage.inputTokens ? "input=" + event.usage.inputTokens : "",
          event.usage && event.usage.outputTokens ? "output=" + event.usage.outputTokens : "",
        ].filter(Boolean)
        return "[完成] " + details.join(" ")
      }
      return ""
    }

    function renderAgentEvent(event) {
      if (event.type === "assistant_delta") {
        appendAssistant(event.text)
        return
      }

      const text = formatAgentEvent(event)
      if (text) appendMeta(text)
    }

    function compactText(text) {
      return String(text || "").replace(/\\s+/g, " ").trim()
    }

    function formatDuration(ms) {
      if (ms < 1000) return ms + "ms"
      return (ms / 1000).toFixed(1) + "s"
    }

    async function refreshStatus() {
      const response = await fetch("/api/status")
      const status = await response.json()
      els.cwd.textContent = status.cwd
      els.model.textContent = status.model
      els.keyStatus.textContent = status.hasApiKey ? "已设置" : "未设置"
      els.compactStatus.textContent = status.autoCompact ? "开启" : "关闭"
      setBusy(Boolean(status.busy))
    }

    async function refreshModels() {
      const response = await fetch("/api/models")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "加载模型失败")
      }

      modelChoices = result.choices || []
      renderModelOptions(modelChoices, result.current)
      els.model.textContent = result.currentLabel || "-"
      setToast(els.modelToast, result.message || "")
    }

    function renderModelOptions(choices, current) {
      const currentKey = JSON.stringify(current || {})
      els.modelSelect.textContent = ""

      for (const group of groupModelChoices(choices, currentKey)) {
        if (group.choices.length === 1 && group.choices[0].optionLabel === group.label) {
          els.modelSelect.appendChild(createModelOption(group.choices[0], currentKey))
          continue
        }

        const optgroup = document.createElement("optgroup")
        optgroup.label = group.label

        for (const choice of group.choices) {
          optgroup.appendChild(createModelOption(choice, currentKey))
        }

        els.modelSelect.appendChild(optgroup)
      }

      if (choices.length === 0) {
        const option = document.createElement("option")
        option.value = ""
        option.textContent = "暂无可用模型"
        els.modelSelect.appendChild(option)
      }
    }

    function createModelOption(choice, currentKey) {
      const option = document.createElement("option")
      const value = JSON.stringify(choice.value)
      option.value = value
      option.textContent = choice.optionLabel
      option.title = choice.fullLabel
      option.selected = value === currentKey
      return option
    }

    function groupModelChoices(choices, currentKey) {
      const groups = []
      const byLabel = new Map()

      for (const choice of choices) {
        const display = formatModelChoiceDisplay(choice)
        let group = byLabel.get(display.groupLabel)

        if (!group) {
          group = { label: display.groupLabel, choices: [] }
          byLabel.set(display.groupLabel, group)
          groups.push(group)
        }

        const modelChoice = {
          ...choice,
          fullLabel: choice.description
            ? choice.label + " - " + choice.description
            : choice.label,
          optionLabel: display.optionLabel,
        }
        const value = JSON.stringify(choice.value)
        const duplicateIndex = group.choices.findIndex(
          (item) => item.optionLabel === modelChoice.optionLabel
        )

        if (duplicateIndex >= 0) {
          if (value === currentKey) {
            group.choices[duplicateIndex] = modelChoice
          }
          continue
        }

        group.choices.push(modelChoice)
      }

      return groups
    }

    function formatModelChoiceDisplay(choice) {
      const split = splitModelLabel(choice.label)
      const paramsLabel = formatModelParams(choice.value && choice.value.params)
      const variantLabel = cleanVariantLabel(split.variantLabel)
      const optionLabel =
        paramsLabel || variantLabel || (split.variantLabel ? "默认" : split.groupLabel)

      return {
        groupLabel: split.groupLabel,
        optionLabel,
      }
    }

    function splitModelLabel(label) {
      const parts = String(label || "").split(" - ")
      return {
        groupLabel: parts[0] || label || "Model",
        variantLabel: parts.slice(1).join(" - "),
      }
    }

    function cleanVariantLabel(label) {
      const text = String(label || "").trim()

      if (!text) {
        return ""
      }

      const parts = text
        .split(",")
        .map((part) => part.trim())
        .filter((part) => {
          const [, value] = part.split(":").map((item) => item.trim())
          return !value || !isFalseValue(value)
        })

      return parts.join(" · ")
    }

    function formatModelParams(params) {
      if (!Array.isArray(params) || params.length === 0) {
        return ""
      }

      const parts = []

      for (const param of params) {
        const id = String(param.id || "")
        const value = String(param.value || "")

        if (!id || !value || isFalseValue(value)) {
          continue
        }

        if (isTrueValue(value)) {
          parts.push(labelFromId(id))
          continue
        }

        parts.push(labelFromId(id) + " " + labelFromId(value))
      }

      return parts.join(" · ")
    }

    function isTrueValue(value) {
      return ["1", "true", "yes", "on"].includes(value.toLowerCase())
    }

    function isFalseValue(value) {
      return ["0", "false", "no", "off"].includes(value.toLowerCase())
    }

    function labelFromId(value) {
      return String(value || "")
        .replace(/[-_]+/g, " ")
        .replace(/\\b\\w/g, (letter) => letter.toUpperCase())
    }

    async function refreshChanges() {
      const response = await fetch("/api/changes")
      const changes = await response.json()
      renderChanges(changes)
    }

    function renderChanges(changes) {
      els.changesSummary.textContent = changes.message || ""
      els.changesList.textContent = ""

      if (!changes.available || !changes.files || changes.files.length === 0) {
        const empty = document.createElement("div")
        empty.className = "empty-state"
        empty.textContent = changes.message || "当前没有代码变更。"
        els.changesList.appendChild(empty)
        return
      }

      for (const file of changes.files) {
        const item = document.createElement("div")
        item.className = "change-item"

        const status = document.createElement("div")
        status.className = "change-status"
        status.textContent = file.label

        const body = document.createElement("div")

        const filePath = document.createElement("div")
        filePath.className = "change-path"
        filePath.textContent = file.path
        body.appendChild(filePath)

        const statsText = formatChangeStats(file)
        if (statsText) {
          const stats = document.createElement("div")
          stats.className = "change-stats"

          const add = document.createElement("span")
          add.className = "change-add"
          add.textContent = statsText.add
          stats.appendChild(add)

          const del = document.createElement("span")
          del.className = "change-del"
          del.textContent = statsText.del
          stats.appendChild(del)

          body.appendChild(stats)
        }

        item.appendChild(status)
        item.appendChild(body)
        els.changesList.appendChild(item)
      }
    }

    function formatChangeStats(file) {
      const additions = Number.isFinite(file.additions) ? file.additions : null
      const deletions = Number.isFinite(file.deletions) ? file.deletions : null

      if (additions === null && deletions === null) {
        return null
      }

      return {
        add: "+" + (additions || 0),
        del: "-" + (deletions || 0),
      }
    }

    async function postJson(path, body) {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || "请求失败")
      }
      return result
    }

    async function streamPost(path, body) {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })

      if (!response.body) {
        throw new Error("当前浏览器不支持流式读取。")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const read = await reader.read()
        if (read.done) break

        buffer += decoder.decode(read.value, { stream: true })
        const lines = buffer.split("\\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.trim()) continue
          handleStreamEvent(JSON.parse(line))
        }
      }

      if (buffer.trim()) {
        handleStreamEvent(JSON.parse(buffer))
      }
    }

    function handleStreamEvent(payload) {
      if (payload.type === "agent") {
        renderAgentEvent(payload.event)
        return
      }
      if (payload.type === "error") {
        appendMeta("[错误] " + payload.message, true)
        return
      }
      if (payload.type === "started") {
        appendMeta("[开始] 任务已提交")
        return
      }
      if (payload.type === "finished") {
        appendMeta("[完成] 流式输出结束")
      }
    }

    els.saveKeyBtn.addEventListener("click", async () => {
      setToast(els.keyToast, "正在设置...")
      try {
        const result = await postJson("/api/key", {
          apiKey: els.apiKey.value,
          save: els.saveKey.checked,
        })
        els.apiKey.value = ""
        setToast(els.keyToast, result.message)
        await refreshStatus()
        await refreshModels()
      } catch (error) {
        setToast(els.keyToast, error.message, true)
      }
    })

    els.modelSelect.addEventListener("change", async () => {
      if (!els.modelSelect.value || busy) return

      try {
        setToast(els.modelToast, "正在切换模型...")
        const result = await postJson("/api/model", {
          model: JSON.parse(els.modelSelect.value),
        })
        els.model.textContent = result.currentLabel
        setToast(els.modelToast, result.message)
      } catch (error) {
        setToast(els.modelToast, error.message, true)
        await refreshModels().catch(() => {})
      }
    })

    els.resetBtn.addEventListener("click", async () => {
      try {
        const result = await postJson("/api/reset")
        assistantMessage = null
        els.messages.textContent = ""
        appendMeta("[重置] " + result.message)
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    })

    els.newSessionBtn.addEventListener("click", async () => {
      try {
        const result = await postJson("/api/new-session")
        assistantMessage = null
        els.messages.textContent = ""
        els.prompt.value = ""
        appendMeta("[新会话] " + result.message)
        await refreshStatus()
        await refreshModels()
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    })

    els.cancelBtn.addEventListener("click", async () => {
      try {
        const result = await postJson("/api/cancel")
        appendMeta("[取消] " + result.message)
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    })

    els.refreshChangesBtn.addEventListener("click", async () => {
      try {
        await refreshChanges()
      } catch (error) {
        els.changesSummary.textContent = error.message
      }
    })

    els.compactBtn.addEventListener("click", async () => {
      setBusy(true)
      assistantMessage = null
      try {
        await streamPost("/api/compact")
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        setBusy(false)
        await refreshStatus()
        await refreshChanges()
      }
    })

    els.composer.addEventListener("submit", async (event) => {
      event.preventDefault()
      const prompt = els.prompt.value.trim()
      if (!prompt || busy) return

      appendMessage("user", prompt)
      els.prompt.value = ""
      assistantMessage = null
      setBusy(true)

      try {
        await streamPost("/api/run", { prompt })
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        assistantMessage = null
        setBusy(false)
        await refreshStatus()
        await refreshChanges()
      }
    })

    els.prompt.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        els.composer.requestSubmit()
      }
    })

    Promise.all([refreshStatus(), refreshModels(), refreshChanges()]).catch((error) => {
      appendMeta("[错误] " + error.message, true)
    })
  </script>
</body>
</html>`
}

main().catch((error) => {
  console.error(`Error: ${getErrorMessage(error)}`)
  process.exitCode = 1
})
