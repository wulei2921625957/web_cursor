export const codexAppClientScript = `    const els = {
      appShell: document.querySelector(".app-shell"),
      artifactForm: document.getElementById("artifactForm"),
      artifactPath: document.getElementById("artifactPath"),
      artifactPreview: document.getElementById("artifactPreview"),
      artifactPreviewBtn: document.getElementById("artifactPreviewBtn"),
      artifactsTab: document.getElementById("artifactsTab"),
      artifactsWorkspace: document.getElementById("artifactsWorkspace"),
      approvalPanel: document.getElementById("approvalPanel"),
      attachmentBtn: document.getElementById("attachmentBtn"),
      attachmentInput: document.getElementById("attachmentInput"),
      attachmentList: document.getElementById("attachmentList"),
      authApiKey: document.getElementById("authApiKey"),
      authForm: document.getElementById("authForm"),
      authSaveKey: document.getElementById("authSaveKey"),
      authSaveKeyRow: document.getElementById("authSaveKeyRow"),
      authScreen: document.getElementById("authScreen"),
      authStatus: document.getElementById("authStatus"),
      authSubmitBtn: document.getElementById("authSubmitBtn"),
      authToast: document.getElementById("authToast"),
      automationCreateBtn: document.getElementById("automationCreateBtn"),
      automationCron: document.getElementById("automationCron"),
      automationForm: document.getElementById("automationForm"),
      automationInterval: document.getElementById("automationInterval"),
      automationPermission: document.getElementById("automationPermission"),
      automationPrompt: document.getElementById("automationPrompt"),
      automationScheduleMode: document.getElementById("automationScheduleMode"),
      automationSchedulePreview: document.getElementById("automationSchedulePreview"),
      automationsList: document.getElementById("automationsList"),
      automationsTab: document.getElementById("automationsTab"),
      automationTitle: document.getElementById("automationTitle"),
      automationsWorkspace: document.getElementById("automationsWorkspace"),
      browserAnnotateBtn: document.getElementById("browserAnnotateBtn"),
      browserComments: document.getElementById("browserComments"),
      browserFeedback: document.getElementById("browserFeedback"),
      browserFeedbackBtn: document.getElementById("browserFeedbackBtn"),
      browserFeedbackForm: document.getElementById("browserFeedbackForm"),
      browserFrame: document.getElementById("browserFrame"),
      browserForm: document.getElementById("browserForm"),
      browserInspectBtn: document.getElementById("browserInspectBtn"),
      browserInspection: document.getElementById("browserInspection"),
      browserMcpBtn: document.getElementById("browserMcpBtn"),
      browserOpenBtn: document.getElementById("browserOpenBtn"),
      browserOverlay: document.getElementById("browserOverlay"),
      browserStage: document.getElementById("browserStage"),
      browserTab: document.getElementById("browserTab"),
      browserUrl: document.getElementById("browserUrl"),
      browserWorkspace: document.getElementById("browserWorkspace"),
      changesFilter: document.getElementById("changesFilter"),
      changesFloat: document.getElementById("changesFloat"),
      changesFloatAdd: document.getElementById("changesFloatAdd"),
      changesFloatDel: document.getElementById("changesFloatDel"),
      changesFloatLabel: document.getElementById("changesFloatLabel"),
      changesList: document.getElementById("changesList"),
      changesSummary: document.getElementById("changesSummary"),
      changesTab: document.getElementById("changesTab"),
      changeTree: document.getElementById("changeTree"),
      composer: document.getElementById("composer"),
      composerWrap: document.querySelector(".composer-wrap"),
      conversation: document.getElementById("conversation"),
      conversationTurnNav: document.getElementById("conversationTurnNav"),
      conversationTurnPreview: document.getElementById("conversationTurnPreview"),
      conversationTurnPreviewBody: document.getElementById("conversationTurnPreviewBody"),
      conversationTurnPreviewTitle: document.getElementById("conversationTurnPreviewTitle"),
      conversationTurnTrack: document.getElementById("conversationTurnTrack"),
      contextMeter: document.getElementById("contextMeter"),
      contextMeterText: document.getElementById("contextMeterText"),
      contextPopoverPercent: document.getElementById("contextPopoverPercent"),
      contextPopoverTitle: document.getElementById("contextPopoverTitle"),
      contextPopoverTokens: document.getElementById("contextPopoverTokens"),
      cwd: document.getElementById("cwd"),
      discardSessionBtn: document.getElementById("discardSessionBtn"),
      extensionsConfigPath: document.getElementById("extensionsConfigPath"),
      extensionsList: document.getElementById("extensionsList"),
      extensionsRefreshBtn: document.getElementById("extensionsRefreshBtn"),
      extensionsTab: document.getElementById("extensionsTab"),
      extensionsWorkspace: document.getElementById("extensionsWorkspace"),
      main: document.getElementById("main"),
      memoryActions: document.querySelector(".memory-actions"),
      memoryClearBtn: document.getElementById("memoryClearBtn"),
      memoryEditor: document.getElementById("memoryEditor"),
      memoryEnabled: document.getElementById("memoryEnabled"),
      memoryFacts: document.getElementById("memoryFacts"),
      memoryPath: document.getElementById("memoryPath"),
      memoryPreferences: document.getElementById("memoryPreferences"),
      memoryRefreshBtn: document.getElementById("memoryRefreshBtn"),
      memoryResults: document.getElementById("memoryResults"),
      memorySaveBtn: document.getElementById("memorySaveBtn"),
      memoryScope: document.getElementById("memoryScope"),
      memorySearchBtn: document.getElementById("memorySearchBtn"),
      memorySearchForm: document.getElementById("memorySearchForm"),
      memorySearchQuery: document.getElementById("memorySearchQuery"),
      memoryStructuredApplyBtn: document.getElementById("memoryStructuredApplyBtn"),
      memoryTab: document.getElementById("memoryTab"),
      memoryTodos: document.getElementById("memoryTodos"),
      memoryWorkspace: document.getElementById("memoryWorkspace"),
	      messages: document.getElementById("messages"),
	      modelList: document.getElementById("modelList"),
	      modelMenu: document.getElementById("modelMenu"),
	      modelPicker: document.getElementById("modelPicker"),
	      modelParamList: document.getElementById("modelParamList"),
	      modelParamPopover: document.getElementById("modelParamPopover"),
	      modelParamToggle: document.getElementById("modelParamToggle"),
	      modelSearch: document.getElementById("modelSearch"),
	      modelSelect: document.getElementById("modelSelect"),
      gitCommitBar: document.getElementById("gitCommitBar"),
      gitCommitBtn: document.getElementById("gitCommitBtn"),
      gitCommitMessage: document.getElementById("gitCommitMessage"),
      gitPrBtn: document.getElementById("gitPrBtn"),
      gitPushBtn: document.getElementById("gitPushBtn"),
      gitSuggestCommitBtn: document.getElementById("gitSuggestCommitBtn"),
      moveWorkspaceBtn: document.getElementById("moveWorkspaceBtn"),
	      guideModeBtn: document.getElementById("guideModeBtn"),
	      multiAgentMode: document.getElementById("multiAgentMode"),
	      newSessionBtn: document.getElementById("newSessionBtn"),
      newWorktreeSessionBtn: document.getElementById("newWorktreeSessionBtn"),
      openProjectBtn: document.getElementById("openProjectBtn"),
      openProjectForm: document.getElementById("openProjectForm"),
      pageTitle: document.getElementById("pageTitle"),
      permissionModeButton: document.getElementById("permissionModeButton"),
      permissionModeLabel: document.getElementById("permissionModeLabel"),
      permissionModeMenu: document.getElementById("permissionModeMenu"),
      permissionModePicker: document.getElementById("permissionModePicker"),
      popoutBtn: document.getElementById("popoutBtn"),
      projectList: document.getElementById("projectList"),
	      projectToast: document.getElementById("projectToast"),
	      prompt: document.getElementById("prompt"),
	      queuedRunList: document.getElementById("queuedRunList"),
      reviewCollapseBtn: document.getElementById("reviewCollapseBtn"),
      reviewResizeHandle: document.getElementById("reviewResizeHandle"),
      reviewToggleBtn: document.getElementById("reviewToggleBtn"),
      reviewWorkspace: document.getElementById("reviewWorkspace"),
      refreshChangesBtn: document.getElementById("refreshChangesBtn"),
      scrollBottomBtn: document.getElementById("scrollBottomBtn"),
      sendBtn: document.getElementById("sendBtn"),
      sessionSearch: document.getElementById("sessionSearch"),
      sessionShowArchived: document.getElementById("sessionShowArchived"),
      sessionMemoryPanel: document.getElementById("sessionMemoryPanel"),
      sidePanel: document.getElementById("sidePanel"),
      terminalCommand: document.getElementById("terminalCommand"),
      terminalCopyBtn: document.getElementById("terminalCopyBtn"),
      terminalForm: document.getElementById("terminalForm"),
      terminalInput: document.getElementById("terminalInput"),
      terminalInputBtn: document.getElementById("terminalInputBtn"),
      terminalInputForm: document.getElementById("terminalInputForm"),
      terminalOutput: document.getElementById("terminalOutput"),
      terminalRunList: document.getElementById("terminalRunList"),
      terminalRunBtn: document.getElementById("terminalRunBtn"),
      terminalSearchClearBtn: document.getElementById("terminalSearchClearBtn"),
      terminalSearchQuery: document.getElementById("terminalSearchQuery"),
      terminalSearchResult: document.getElementById("terminalSearchResult"),
      terminalStopBtn: document.getElementById("terminalStopBtn"),
      terminalTab: document.getElementById("terminalTab"),
      terminalWorkspace: document.getElementById("terminalWorkspace"),
      themeModeSelect: document.getElementById("themeModeSelect"),
      workspaceBadge: document.getElementById("workspaceBadge"),
    }

    const conversationPopoutMode =
      new URLSearchParams(window.location.search).get("popout") === "conversation"
    const windowSyncId =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)
    let windowSyncChannel = null

    let state = {
      activeProject: null,
      activeProjectId: null,
      activeRunSessionIds: [],
      activeSession: null,
      activeSessionId: null,
      activeSessionRunning: false,
      busy: false,
      canPersistApiKey: false,
      devReload: false,
      hasApiKey: false,
      launchCwd: "",
      model: "-",
      modelsLoaded: false,
      pendingApprovals: [],
      permissionMode: "full_access",
      projects: [],
      runningSessionIds: [],
      selectedModel: null,
    }
	    const messagesBySession = Object.create(null)
    const queuedRunsBySession = Object.create(null)
	    let authBusy = false
    let gitBusy = false
    const streamingAssistants = new Map()
    const streamingAssistantQueues = new Map()
    const streamingMultiRuns = new Map()
    const streamingRunTimers = new Map()
    const streamingThoughts = new Map()
    const assistantBoundarySessions = new Set()
    const localSessionRunRefs = new Map()
    const persistMessagesTimers = new Map()
    const ASSISTANT_STREAM_FRAME_MS = 32
    const ASSISTANT_STREAM_MAX_CHUNK = 96
    const ASSISTANT_STREAM_MIN_CHUNK = 18
	    const MAX_ATTACHMENTS = 8
	    const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
	    const MAX_ATTACHMENTS_TOTAL_BYTES = 20 * 1024 * 1024
	    const LONG_PASTE_ATTACHMENT_MIN_CHARS = 1200
	    const LONG_PASTE_ATTACHMENT_MIN_LINES = 12
	    const PASTE_ATTACHMENT_PREVIEW_CHARS = 180
	    const MESSAGES_BOTTOM_THRESHOLD = 72
    let messagesAutoFollow = true
    let scheduledMessagesRender = 0
    let scrollingToBottom = false
    let conversationTurnNavItems = []
    const openActivityGroups = new Set()
    let latestChanges = { available: false, files: [], message: "请先打开项目。" }
    let selectedChangePath = ""
    let modelChoices = []
    let modelSearchQuery = ""
    let currentModel = null
    let pendingAttachments = []
    let attachmentIdCounter = 0
    let guideMode = false
    let runIdCounter = 0
    let terminalPollTimer = 0
    let approvalPollTimer = 0
    let approvalBusy = false
    let activeTerminalId = ""
    let latestTerminals = []
    const sessionListDisplayCounts = new Map()
    const terminalLastLineIds = Object.create(null)
    const USER_ATTACHMENT_MESSAGE_PREFIX = "[[coding-agent-user-message-v1]]"
    const REVIEW_PANEL_STORAGE_KEY = "coding-agent-review-panel"
    const THEME_MODE_STORAGE_KEY = "coding-agent-theme-mode"
    const PROMPT_HISTORY_STORAGE_KEY = "coding-agent-prompt-history"
    const PROMPT_HISTORY_MAX_ITEMS = 80
    const SESSION_LIST_COLLAPSED_COUNT = 5
    const SESSION_LIST_EXPAND_STEP = 10
    const REVIEW_PANEL_MIN_WIDTH = 360
    const REVIEW_PANEL_MAX_WIDTH = 780
    const REVIEW_PANEL_MIN_CONVERSATION_WIDTH = 520
    const READABLE_PARAGRAPH_MIN_CHARS = 180
    const READABLE_PARAGRAPH_TARGET_CHARS = 110
    const READABLE_PARAGRAPH_MAX_CHARS = 150
    const MODEL_SWITCH_SESSION_WARNING = "当前会话记忆会保留并带入后续请求，但不同模型可能对既有上下文的理解不同。是否继续切换？"
    const PERMISSION_MODE_DETAILS = {
      read_only: { label: "请求批准", icon: "?" },
      auto: { label: "替我审批", icon: "⌁" },
      full_access: { label: "完全访问", icon: "!" },
    }
    let reviewPanelHidden = false
    let reviewPanelWidth = 0
    let reviewResizeState = null
    let reviewMode = "changes"
    let themeMode = loadThemeMode()
    let activeDiffCommentPath = ""
    let artifactBusy = false
    let browserAnnotating = false
    let browserCommentId = 0
    let browserComments = []
    let browserDraftPoint = null
    let latestBrowserInspection = null
    let latestExtensions = null
    let extensionBusy = false
    let latestMemories = []
    let latestMemoryResults = []
    let latestSessionMemory = null
    let memoryBusy = false
    let memoryDirty = false
    let memoryError = ""
    let latestAutomations = []
    let automationBusy = false
    let automationPreviewTimer = null
    let devReloadReady = false
    let devReloadSource = null
    let promptHistory = loadPromptHistory()
    let promptHistoryCursor = -1
    let promptHistoryDraft = ""

    function setToast(element, text, isError) {
      element.textContent = text || ""
      element.classList.toggle("error", Boolean(isError))
    }

    function loadReviewPanelPrefs() {
      try {
        const prefs = JSON.parse(window.localStorage.getItem(REVIEW_PANEL_STORAGE_KEY) || "{}")
        reviewPanelHidden = Boolean(prefs.hidden)
        reviewPanelWidth = Number.isFinite(prefs.width) ? prefs.width : 0
        reviewMode = normalizeReviewMode(prefs.mode)
      } catch {
        reviewPanelHidden = false
        reviewPanelWidth = 0
        reviewMode = "changes"
      }
      applyReviewPanelLayout()
    }

    function persistReviewPanelPrefs() {
      try {
        window.localStorage.setItem(
          REVIEW_PANEL_STORAGE_KEY,
          JSON.stringify({
            hidden: reviewPanelHidden,
            mode: reviewMode,
            width: reviewPanelWidth || null,
          })
        )
      } catch {}
    }

    function normalizeReviewMode(mode) {
      return mode === "browser" ||
        mode === "artifacts" ||
        mode === "terminal" ||
        mode === "extensions" ||
        mode === "memory" ||
        mode === "automations"
        ? mode
        : "changes"
    }

    function normalizeThemeMode(mode) {
      return mode === "light" || mode === "dark" ? mode : "system"
    }

    function loadThemeMode() {
      try {
        return normalizeThemeMode(window.localStorage.getItem(THEME_MODE_STORAGE_KEY))
      } catch {
        return "system"
      }
    }

    function persistThemeMode() {
      try {
        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode)
      } catch {}
    }

    function applyThemeMode() {
      if (themeMode === "system") {
        document.documentElement.removeAttribute("data-theme")
      } else {
        document.documentElement.setAttribute("data-theme", themeMode)
      }
      els.themeModeSelect.value = themeMode
    }

    function setThemeMode(mode) {
      themeMode = normalizeThemeMode(mode)
      applyThemeMode()
      persistThemeMode()
    }

    function applyWindowMode() {
      document.body.classList.toggle("conversation-popout", conversationPopoutMode)
      els.popoutBtn.hidden = conversationPopoutMode
      els.reviewToggleBtn.hidden = conversationPopoutMode
    }

    function openConversationPopout() {
      const url = new URL(window.location.href)
      url.searchParams.set("popout", "conversation")
      window.open(
        url.toString(),
        "coding-agent-conversation",
        "popup,width=1120,height=900"
      )
    }

    function setupWindowSync() {
      if (!("BroadcastChannel" in window)) return
      try {
        windowSyncChannel = new BroadcastChannel("coding-agent-window-sync")
        windowSyncChannel.addEventListener("message", (event) => {
          const message = event.data || {}
          if (message.source === windowSyncId) return
          if (message.kind === "stream_event" && message.payload) {
            handleStreamEvent(
              message.payload,
              message.sessionId || state.activeSessionId,
              message.requestRunId || "",
              true
            )
          }
          if (message.kind === "multi_state" && message.state) {
            updateMultiAgentRun(message.state, message.sessionId || state.activeSessionId)
          }
        })
      } catch {
        windowSyncChannel = null
      }
    }

    function publishWindowSync(message) {
      if (!windowSyncChannel) return
      try {
        windowSyncChannel.postMessage(Object.assign({ source: windowSyncId }, message))
      } catch {}
    }

    function loadPromptHistory() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(PROMPT_HISTORY_STORAGE_KEY) || "[]")
        return Array.isArray(parsed)
          ? parsed.map((item) => String(item || "").trim()).filter(Boolean).slice(0, PROMPT_HISTORY_MAX_ITEMS)
          : []
      } catch {
        return []
      }
    }

    function savePromptHistory() {
      try {
        window.localStorage.setItem(
          PROMPT_HISTORY_STORAGE_KEY,
          JSON.stringify(promptHistory.slice(0, PROMPT_HISTORY_MAX_ITEMS))
        )
      } catch {}
    }

    function recordPromptHistory(prompt) {
      const text = String(prompt || "").trim()
      if (!text || text.startsWith("/")) return
      promptHistory = [text, ...promptHistory.filter((item) => item !== text)].slice(
        0,
        PROMPT_HISTORY_MAX_ITEMS
      )
      promptHistoryCursor = -1
      promptHistoryDraft = ""
      savePromptHistory()
    }

    function matchingPromptHistory(query) {
      const normalized = normalizeTextForSearch(query)
      const items = normalized
        ? promptHistory.filter((item) => normalizeTextForSearch(item).includes(normalized))
        : promptHistory
      return items.slice(0, 10)
    }

    function navigatePromptHistory(direction) {
      if (promptHistory.length === 0) return false
      const selectionStart = els.prompt.selectionStart || 0
      const atTop = selectionStart === 0
      const atBottom = selectionStart === els.prompt.value.length
      if (direction < 0 && els.prompt.value && !atTop && promptHistoryCursor < 0) return false
      if (direction > 0 && !atBottom) return false

      if (promptHistoryCursor < 0) {
        promptHistoryDraft = els.prompt.value
      }

      const nextCursor =
        promptHistoryCursor < 0 && direction < 0
          ? 0
          : promptHistoryCursor + (direction < 0 ? 1 : -1)
      promptHistoryCursor = Math.max(-1, Math.min(promptHistory.length - 1, nextCursor))
      els.prompt.value =
        promptHistoryCursor >= 0 ? promptHistory[promptHistoryCursor] : promptHistoryDraft
      resizePrompt()
      updateControls()
      return true
    }

    function normalizeTextForSearch(text) {
      return String(text || "").toLowerCase().replace(/[\\s\\t\\r\\n]+/g, " ").trim()
    }

    function clampReviewPanelWidth(width) {
      const mainWidth = els.main.getBoundingClientRect().width || window.innerWidth
      const maxWidth = Math.max(
        REVIEW_PANEL_MIN_WIDTH,
        Math.min(REVIEW_PANEL_MAX_WIDTH, mainWidth - REVIEW_PANEL_MIN_CONVERSATION_WIDTH)
      )
      const defaultWidth = Math.min(
        Math.max(Math.round(mainWidth * 0.39), REVIEW_PANEL_MIN_WIDTH),
        maxWidth
      )
      const desired = Number.isFinite(width) && width > 0 ? width : defaultWidth
      return Math.round(Math.min(Math.max(desired, REVIEW_PANEL_MIN_WIDTH), maxWidth))
    }

    function applyReviewPanelLayout() {
      els.main.classList.toggle("review-hidden", reviewPanelHidden)
      els.reviewToggleBtn.setAttribute("aria-pressed", reviewPanelHidden ? "false" : "true")
      els.reviewToggleBtn.setAttribute(
        "aria-label",
        reviewPanelHidden ? "显示审查" : "隐藏审查"
      )
      els.reviewToggleBtn.title = reviewPanelHidden ? "显示审查" : "隐藏审查"
      els.reviewCollapseBtn.disabled = reviewPanelHidden

      if (!reviewPanelHidden) {
        reviewPanelWidth = clampReviewPanelWidth(reviewPanelWidth)
        els.main.style.setProperty("--review-panel-width", reviewPanelWidth + "px")
      }
      updateChangesFloat()
    }

    function setReviewPanelHidden(hidden) {
      reviewPanelHidden = Boolean(hidden)
      applyReviewPanelLayout()
      persistReviewPanelPrefs()
    }

    function setReviewPanelWidth(width, shouldPersist) {
      reviewPanelWidth = clampReviewPanelWidth(width)
      els.main.style.setProperty("--review-panel-width", reviewPanelWidth + "px")
      if (shouldPersist) persistReviewPanelPrefs()
    }

    function startReviewResize(event) {
      if (reviewPanelHidden || event.button !== 0) return
      event.preventDefault()
      reviewResizeState = {
        startX: event.clientX,
        startWidth: els.sidePanel.getBoundingClientRect().width,
      }
      document.body.classList.add("resizing-review")
    }

    function moveReviewResize(event) {
      if (!reviewResizeState) return
      const nextWidth = reviewResizeState.startWidth + reviewResizeState.startX - event.clientX
      setReviewPanelWidth(nextWidth, false)
    }

    function finishReviewResize() {
      if (!reviewResizeState) return
      reviewResizeState = null
      document.body.classList.remove("resizing-review")
      persistReviewPanelPrefs()
    }

    function applyState(nextState) {
      state = Object.assign({}, state, nextState || {})
      if (state.selectedModel) {
        currentModel = state.selectedModel
      }
      updateAuthGate()
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
          delete queuedRunsBySession[sessionId]
        }
      }
      renderSidebar()
      renderHeader()
      renderMessages()
      renderQueuedRunList()
      renderApprovals()
      renderModelPicker()
      updateControls()
      syncApprovalPolling()
    }

    function renderApprovals() {
      const approvals = Array.isArray(state.pendingApprovals)
        ? state.pendingApprovals
        : []
      els.approvalPanel.hidden = approvals.length === 0
      els.approvalPanel.innerHTML = ""
      if (approvals.length === 0) return

      const header = document.createElement("div")
      header.className = "approval-panel-header"
      const title = document.createElement("strong")
      title.textContent = "待审批命令"
      const count = document.createElement("span")
      count.textContent = String(approvals.length)
      header.appendChild(title)
      header.appendChild(count)
      els.approvalPanel.appendChild(header)

      for (const approval of approvals) {
        const row = document.createElement("div")
        row.className = "approval-card risk-" + String(approval.risk || "medium")

        const body = document.createElement("div")
        body.className = "approval-card-body"

        const command = document.createElement("code")
        command.textContent = approval.command || ""
        body.appendChild(command)

        const meta = document.createElement("div")
        meta.className = "approval-meta"
        const sessionTitle = findSessionTitle(approval.sessionId)
        meta.textContent = [
          approval.risk ? "风险：" + approval.risk : "",
          approval.source ? "来源：" + approval.source : "",
          sessionTitle ? "会话：" + sessionTitle : "",
          approval.cwd ? "目录：" + shortenInline(approval.cwd, 88) : "",
          approval.reason ? "原因：" + approval.reason : "",
          approval.createdAt ? "时间：" + formatTime(approval.createdAt) : "",
        ]
          .filter(Boolean)
          .join(" · ")
        body.appendChild(meta)

        const actions = document.createElement("div")
        actions.className = "approval-actions"
        actions.appendChild(
          approvalButton("批准一次", approval.id, "approve_once")
        )
        actions.appendChild(
          approvalButton("本会话批准", approval.id, "approve_session")
        )
        actions.appendChild(approvalButton("拒绝", approval.id, "deny", true))

        row.appendChild(body)
        row.appendChild(actions)
        els.approvalPanel.appendChild(row)
      }
    }

    function approvalButton(label, approvalId, action, danger) {
      const button = document.createElement("button")
      button.type = "button"
      button.textContent = label
      button.disabled = approvalBusy
      if (danger) button.className = "danger"
      button.addEventListener("click", () => {
        void resolveApproval(approvalId, action)
      })
      return button
    }

    function findSessionTitle(sessionId) {
      for (const project of state.projects || []) {
        for (const session of project.sessions || []) {
          if (session.id === sessionId) {
            return session.title || session.id
          }
        }
      }
      return ""
    }

    async function resolveApproval(approvalId, action) {
      if (!approvalId || approvalBusy) return
      approvalBusy = true
      renderApprovals()
      try {
        const result = await postJson("/api/approvals/resolve", {
          action,
          approvalId,
        })
        applyState(result)
        appendMeta("[权限] " + (result.message || "审批已处理。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        approvalBusy = false
        renderApprovals()
        updateControls()
        syncApprovalPolling()
      }
    }

    function syncApprovalPolling() {
      const pendingCount = Array.isArray(state.pendingApprovals)
        ? state.pendingApprovals.length
        : 0
      const runningCount = Array.isArray(state.runningSessionIds)
        ? state.runningSessionIds.length
        : 0
      const shouldPoll = Boolean(state.busy || runningCount > 0 || pendingCount > 0)
      if (!shouldPoll) {
        if (approvalPollTimer) {
          window.clearTimeout(approvalPollTimer)
          approvalPollTimer = 0
        }
        return
      }
      if (approvalPollTimer) return

      approvalPollTimer = window.setTimeout(async () => {
        approvalPollTimer = 0
        try {
          await refreshStatus()
        } catch {
        } finally {
          syncApprovalPolling()
        }
      }, 1200)
    }

    function activeMessages(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (!targetSessionId) return []
      if (!messagesBySession[targetSessionId]) {
        messagesBySession[targetSessionId] = []
      }
      return messagesBySession[targetSessionId]
    }

    function activeQueuedRuns(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (!targetSessionId) return []
      if (!queuedRunsBySession[targetSessionId]) {
        queuedRunsBySession[targetSessionId] = []
      }
      return queuedRunsBySession[targetSessionId]
    }

    function schedulePersistMessages(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (!targetSessionId) return
      const existingTimer = persistMessagesTimers.get(targetSessionId)
      if (existingTimer) window.clearTimeout(existingTimer)
      persistMessagesTimers.set(
        targetSessionId,
        window.setTimeout(() => persistSessionMessages(targetSessionId), 300)
      )
    }

    async function persistSessionMessages(sessionId) {
      if (!sessionId) return
      persistMessagesTimers.delete(sessionId)

      await postJson("/api/sessions/messages", {
        sessionId,
        messages: messagesBySession[sessionId] || [],
      }).catch(() => {})
    }

    function clearPersistMessagesTimer(sessionId) {
      const timer = persistMessagesTimers.get(sessionId)
      if (timer) window.clearTimeout(timer)
      persistMessagesTimers.delete(sessionId)
    }

    function isSessionRunning(sessionId) {
      if (!sessionId) return false
      if ((state.runningSessionIds || []).includes(sessionId)) return true
      if ((localSessionRunRefs.get(sessionId) || 0) > 0) return true
      for (const project of state.projects || []) {
        for (const session of project.sessions || []) {
          if (session.id === sessionId) return Boolean(session.running)
        }
      }
      return false
    }

    function isSessionActivelyRunning(sessionId) {
      if (!sessionId) return false
      if ((state.activeRunSessionIds || []).includes(sessionId)) return true
      for (const project of state.projects || []) {
        for (const session of project.sessions || []) {
          if (session.id === sessionId) return Boolean(session.activeRun)
        }
      }
      return false
    }

    function isProjectRunning(projectId) {
      const project = (state.projects || []).find((item) => item.id === projectId)
      return Boolean(
        project &&
        (project.sessions || []).some((session) => isSessionRunning(session.id))
      )
    }

    function isActiveSessionRunning() {
      return Boolean(state.activeSessionRunning || isSessionRunning(state.activeSessionId))
    }

    function isActiveSessionActivelyRunning() {
      return isSessionActivelyRunning(state.activeSessionId)
    }

    function addLocalSessionRunRef(sessionId) {
      if (!sessionId) return
      localSessionRunRefs.set(sessionId, (localSessionRunRefs.get(sessionId) || 0) + 1)
      setLocalSessionRunning(sessionId, true)
    }

    function releaseLocalSessionRunRef(sessionId) {
      if (!sessionId) return
      const nextCount = Math.max(0, (localSessionRunRefs.get(sessionId) || 0) - 1)
      if (nextCount > 0) {
        localSessionRunRefs.set(sessionId, nextCount)
        setLocalSessionRunning(sessionId, true)
        return
      }

      localSessionRunRefs.delete(sessionId)
      setLocalSessionRunning(sessionId, false)
    }

    function syncSessionRunningFromLocalRefs(sessionId) {
      if (!sessionId) return
      setLocalSessionRunning(sessionId, (localSessionRunRefs.get(sessionId) || 0) > 0)
    }

    function setLocalSessionRunning(sessionId, running) {
      if (!sessionId) return
      const ids = new Set(state.runningSessionIds || [])
      if (running) ids.add(sessionId)
      else ids.delete(sessionId)
      state.runningSessionIds = Array.from(ids)
      state.busy = state.runningSessionIds.length > 0

      for (const project of state.projects || []) {
        for (const session of project.sessions || []) {
          if (session.id === sessionId) session.running = running
        }
      }
      if (state.activeSession && state.activeSession.id === sessionId) {
        state.activeSession.running = running
      }
      state.activeSessionRunning = isSessionRunning(state.activeSessionId)

      renderSidebar()
      updateControls()
      syncApprovalPolling()
    }

    function setLocalSessionActiveRun(sessionId, active) {
      if (!sessionId) return
      const ids = new Set(state.activeRunSessionIds || [])
      if (active) ids.add(sessionId)
      else ids.delete(sessionId)
      state.activeRunSessionIds = Array.from(ids)

      for (const project of state.projects || []) {
        for (const session of project.sessions || []) {
          if (session.id === sessionId) session.activeRun = active
        }
      }
      if (state.activeSession && state.activeSession.id === sessionId) {
        state.activeSession.activeRun = active
      }

      if (!active && guideMode && sessionId === state.activeSessionId) {
        guideMode = false
      }

      renderSidebar()
      updateControls()
    }

    function setGuideMode(enabled) {
      guideMode = Boolean(enabled && isActiveSessionActivelyRunning())
      els.guideModeBtn.classList.toggle("active", guideMode)
      els.guideModeBtn.setAttribute("aria-pressed", guideMode ? "true" : "false")
      els.guideModeBtn.title = guideMode ? "引导纠正已开启" : "引导纠正"
      updateControls()
    }

    function normalizePermissionModeForUi(mode) {
      return Object.prototype.hasOwnProperty.call(PERMISSION_MODE_DETAILS, mode)
        ? mode
        : "full_access"
    }

    function renderPermissionModeControl(mode) {
      const activeMode = normalizePermissionModeForUi(mode || state.permissionMode)
      const details = PERMISSION_MODE_DETAILS[activeMode]
      els.permissionModeLabel.textContent = details.label
      els.permissionModeButton.dataset.mode = activeMode
      els.permissionModeButton.title = "权限访问：" + details.label
      const icon = els.permissionModeButton.querySelector(".permission-mode-icon")
      if (icon) icon.textContent = details.icon
      for (const option of els.permissionModeMenu.querySelectorAll("[data-permission-mode]")) {
        const selected = option.dataset.permissionMode === activeMode
        option.classList.toggle("active", selected)
        option.setAttribute("aria-checked", selected ? "true" : "false")
      }
    }

    function setPermissionModeMenuOpen(open) {
      const shouldOpen = Boolean(open && !els.permissionModeButton.disabled)
      els.permissionModeMenu.hidden = !shouldOpen
      els.permissionModeButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false")
    }

    function updateControls() {
      const hasProject = Boolean(state.activeProjectId)
      const hasSession = Boolean(state.activeSessionId)
      const busy = Boolean(state.busy)
      const activeBusy = isActiveSessionRunning()
      const activeRunning = isActiveSessionActivelyRunning()
      const hasDraft = Boolean(els.prompt.value.trim() || pendingAttachments.length > 0)
      const sendCancelsRun = activeRunning && !hasDraft
      const modelsLoaded = Boolean(state.modelsLoaded)
      const canPersistApiKey = Boolean(state.canPersistApiKey)
      const changeFiles = Array.isArray(latestChanges.files) ? latestChanges.files : []
      const gitState = latestChanges.git || {}
      const hasStagedChanges =
        changeFiles.some((file) => Boolean(file.staged)) ||
        Boolean(gitState.hasStagedChanges)
      const showGitCommit =
        reviewMode === "changes" &&
        hasSession &&
        Boolean(latestChanges.available) &&
        (changeFiles.length > 0 ||
          Boolean(gitState.canPush) ||
          Boolean(gitState.canCreatePullRequest))
      if (!activeRunning && guideMode) {
        guideMode = false
      }
      els.authSaveKeyRow.hidden = !canPersistApiKey
      els.authSaveKey.disabled = !canPersistApiKey
      if (!canPersistApiKey) {
        els.authSaveKey.checked = false
      }
      els.authForm.classList.toggle("auth-busy", authBusy)
      els.authForm.setAttribute("aria-busy", authBusy ? "true" : "false")
      els.authApiKey.disabled = authBusy
      els.authSaveKey.disabled = authBusy || !canPersistApiKey
      els.authSubmitBtn.classList.toggle("loading", authBusy)
      els.authSubmitBtn.textContent = authBusy ? "正在验证" : "进入工作台"
      els.authStatus.classList.toggle("loading", authBusy)
      els.newSessionBtn.disabled = !hasProject || !modelsLoaded
      els.newWorktreeSessionBtn.disabled = !hasProject || !modelsLoaded || busy
      els.artifactPath.disabled = !hasSession || artifactBusy
      els.artifactPreviewBtn.disabled =
        !hasSession || artifactBusy || !els.artifactPath.value.trim()
      const hasBrowserUrl = Boolean(els.browserUrl.value.trim() || els.browserFrame.src)
      els.browserFeedback.disabled = !hasSession
      els.browserFeedbackBtn.disabled =
        !hasSession || !hasBrowserUrl || !els.browserFeedback.value.trim()
      els.browserAnnotateBtn.disabled = !hasBrowserUrl
      els.browserInspectBtn.disabled = !hasSession || !hasBrowserUrl
      els.browserMcpBtn.disabled = !hasSession
      els.browserOpenBtn.disabled = !els.browserUrl.value.trim()
      els.extensionsRefreshBtn.disabled = !hasSession || extensionBusy
      els.memoryScope.disabled = !hasSession || memoryBusy
      els.memoryEnabled.disabled = !hasSession || memoryBusy
      els.memoryEditor.disabled = !hasSession || memoryBusy
      els.memoryFacts.disabled = !hasSession || memoryBusy
      els.memoryPreferences.disabled = !hasSession || memoryBusy
      els.memoryRefreshBtn.disabled = !hasSession || memoryBusy
      els.memorySaveBtn.disabled = !hasSession || memoryBusy
      els.memoryStructuredApplyBtn.disabled = !hasSession || memoryBusy
      els.memoryTodos.disabled = !hasSession || memoryBusy
      els.memoryClearBtn.disabled =
        !hasSession || memoryBusy || !els.memoryEditor.value.trim()
      els.memorySearchQuery.disabled = !hasSession || memoryBusy
      els.memorySearchBtn.disabled =
        !hasSession || memoryBusy || !els.memorySearchQuery.value.trim()
      const automationCronMode = els.automationScheduleMode.value === "cron"
      els.automationScheduleMode.disabled = !hasSession || automationBusy
      els.automationInterval.hidden = automationCronMode
      els.automationCron.hidden = !automationCronMode
      els.automationInterval.disabled = !hasSession || automationBusy || automationCronMode
      els.automationCron.disabled = !hasSession || automationBusy || !automationCronMode
      els.automationPermission.disabled = !hasSession || automationBusy
      els.automationPrompt.disabled = !hasSession || automationBusy
      els.automationTitle.disabled = !hasSession || automationBusy
      els.automationCreateBtn.disabled =
        !hasSession ||
        automationBusy ||
        !els.automationPrompt.value.trim() ||
        (automationCronMode && !els.automationCron.value.trim())
      els.moveWorkspaceBtn.hidden = !hasSession
      els.discardSessionBtn.hidden = !hasSession
      els.workspaceBadge.hidden = !hasSession
      renderPermissionModeControl()
      els.permissionModeButton.disabled = busy
      for (const control of els.permissionModeMenu.querySelectorAll("[data-permission-mode]")) {
        control.disabled = busy
      }
      if (busy) setPermissionModeMenuOpen(false)
      els.themeModeSelect.value = themeMode
      els.popoutBtn.disabled = conversationPopoutMode
      els.gitCommitBar.hidden = !showGitCommit
      els.gitCommitMessage.disabled = gitBusy || activeBusy || !hasSession
      els.gitCommitBtn.disabled =
        gitBusy ||
        activeBusy ||
        !hasSession ||
        !hasStagedChanges ||
        !els.gitCommitMessage.value.trim()
      els.gitSuggestCommitBtn.disabled =
        gitBusy ||
        activeBusy ||
        !hasSession ||
        !hasStagedChanges
      els.gitPushBtn.disabled =
        gitBusy ||
        activeBusy ||
        !hasSession ||
        !gitState.canPush
      els.gitPrBtn.disabled =
        gitBusy ||
        activeBusy ||
        !hasSession ||
        !gitState.canCreatePullRequest
      const terminalRunning = activeTerminalStatus() === "running"
      els.terminalCommand.disabled = !hasSession
      els.terminalRunBtn.disabled = !hasSession || !els.terminalCommand.value.trim()
      els.terminalStopBtn.disabled = !terminalRunning
      els.terminalCopyBtn.disabled = !activeTerminalId || !els.terminalOutput.textContent.trim()
      els.terminalSearchQuery.disabled = !hasSession || !activeTerminalId
      els.terminalSearchClearBtn.disabled =
        !hasSession || !activeTerminalId || !els.terminalSearchQuery.value.trim()
      els.terminalInput.disabled = !terminalRunning
      els.terminalInputBtn.disabled = !terminalRunning || !els.terminalInput.value.length
      els.moveWorkspaceBtn.disabled = activeBusy || !hasSession
      els.discardSessionBtn.disabled = activeBusy || !hasSession
	      els.modelSelect.disabled = activeBusy || !modelsLoaded
	      els.modelSearch.disabled = activeBusy || !modelsLoaded
	      els.modelParamToggle.disabled = activeBusy || !modelsLoaded || els.modelParamToggle.hidden
      for (const control of els.modelList.querySelectorAll("button")) {
        control.disabled = activeBusy || !modelsLoaded
      }
      for (const control of els.modelParamList.querySelectorAll("button")) {
        control.disabled = activeBusy || !modelsLoaded
      }
	      els.multiAgentMode.disabled = activeBusy || !hasSession || !modelsLoaded
		      els.prompt.disabled = !hasSession || !modelsLoaded
	      els.attachmentBtn.disabled = !hasSession || !modelsLoaded
	      els.guideModeBtn.hidden = true
      els.guideModeBtn.disabled = true
      els.guideModeBtn.classList.toggle("active", guideMode)
      els.guideModeBtn.setAttribute("aria-pressed", guideMode ? "true" : "false")
      els.guideModeBtn.title = guideMode ? "引导纠正已开启" : "引导纠正"
      els.sendBtn.classList.toggle("running", activeBusy)
      els.sendBtn.classList.toggle("cancel-mode", sendCancelsRun)
      els.sendBtn.textContent = sendCancelsRun ? "" : "↑"
      els.sendBtn.setAttribute(
        "aria-label",
        sendCancelsRun ? "取消任务" : activeBusy ? "加入队列" : "发送"
      )
      els.sendBtn.title = sendCancelsRun ? "取消任务" : activeBusy ? "加入队列" : "发送"
      els.sendBtn.disabled =
        !hasSession ||
        !modelsLoaded ||
        (!hasDraft && !activeRunning)
      els.openProjectBtn.disabled = busy
      els.authSubmitBtn.disabled = authBusy || busy || !els.authApiKey.value.trim()
      updateContextMeter()
    }

    function updateAuthGate(message) {
      const authenticated = Boolean(state.modelsLoaded)
      document.body.classList.toggle("authenticated", authenticated)
      els.appShell.setAttribute("aria-hidden", authenticated ? "false" : "true")
      els.authScreen.setAttribute("aria-hidden", authenticated ? "true" : "false")

      if (message) {
        els.authStatus.textContent = message
        return
      }

      if (authenticated) {
        els.authStatus.textContent = "模型已加载"
      } else if (state.hasApiKey) {
        els.authStatus.textContent = "正在加载可用模型..."
      } else {
        els.authStatus.textContent = "等待输入密钥"
      }
    }

    function updateContextMeter() {
      const hasUsage = Boolean(state.activeSession && state.activeSession.contextUsage)
      const usage = getVisibleContextUsage()
      const level =
        usage.percentUsed >= 90 ? "danger" : usage.percentUsed >= 75 ? "warning" : "normal"
      els.contextMeter.style.setProperty("--context-used", usage.percentUsed + "%")
      els.contextMeter.dataset.level = level
      els.contextMeter.setAttribute("aria-disabled", hasUsage ? "false" : "true")
      els.contextMeter.title = hasUsage
        ? contextUsageTitle(usage)
        : "暂无会话"
      els.contextMeterText.textContent = hasUsage ? contextUsagePercentLabel(usage) : "--"
      els.contextPopoverTitle.textContent = hasUsage
        ? usage.contextWindowKind === "model"
          ? "模型上下文预算："
          : "本地上下文预算："
        : "上下文预算："
      els.contextPopoverPercent.textContent = hasUsage ? contextUsagePercentText(usage) : "暂无会话"
      els.contextPopoverTokens.textContent = hasUsage
        ? contextUsageDetailText(usage)
        : "打开项目并新建会话后显示"
    }

    function getVisibleContextUsage() {
      const base = state.activeSession && state.activeSession.contextUsage
      if (!base) {
        return {
          contextWindowKind: "local",
          localBudgetTokens: 0,
          maxTokens: 0,
          modelMaxTokens: 0,
          percentRemaining: 100,
          percentUsed: 0,
          remainingTokens: 0,
          usedTokens: 0,
        }
      }

      const charsPerToken = positiveNumber(base.charsPerToken, 4)
      const maxChars = positiveNumber(base.maxChars, 1)
      const usedChars =
        Math.max(0, Math.ceil(numberOrDefault(base.usedChars, 0))) +
        String(els.prompt.value || "").length
      const remainingChars = Math.max(0, maxChars - usedChars)
      const percentUsed = Math.min(100, Math.round((usedChars / maxChars) * 100))

      return {
        contextWindowKind: base.contextWindowKind === "model" ? "model" : "local",
        localBudgetTokens: Math.ceil(Math.max(0, numberOrDefault(base.localBudgetTokens, 0))),
        maxTokens: estimateTokens(maxChars, charsPerToken),
        modelContextSource: base.modelContextSource || "",
        modelMaxTokens: Math.ceil(Math.max(0, numberOrDefault(base.modelMaxTokens, 0))),
        percentRemaining: Math.max(0, 100 - percentUsed),
        percentUsed,
        usedTokens: estimateTokens(usedChars, charsPerToken),
        remainingTokens: estimateTokens(remainingChars, charsPerToken),
      }
    }

    function contextUsageTitle(usage) {
      const percent = contextUsagePercentLabel(usage)
      return usage.contextWindowKind === "model"
        ? percent + " 已用，可用预算 " + formatTokenCount(usage.maxTokens) +
          "，模型窗口 " + formatTokenCount(usage.modelMaxTokens)
        : percent + " 已用，本地预算 " + formatTokenCount(usage.maxTokens)
    }

    function contextUsagePercentText(usage) {
      const percent = contextUsagePercentLabel(usage)
      if (usage.contextWindowKind === "model") {
        return percent + " 已用（可用预算 " + formatTokenCount(usage.maxTokens) +
          "，剩余 " + formatTokenCount(usage.remainingTokens) +
          "；模型窗口 " + formatTokenCount(usage.modelMaxTokens) + "）"
      }

      return percent + " 已用（剩余 " + usage.percentRemaining + "%）"
    }

    function contextUsagePercentLabel(usage) {
      return usage.usedTokens > 0 && usage.percentUsed === 0
        ? "<1%"
        : usage.percentUsed + "%"
    }

    function contextUsageDetailText(usage) {
      const used = "已用 " + formatTokenCount(usage.usedTokens)
      if (usage.contextWindowKind === "model") {
        const local = usage.localBudgetTokens
          ? "；本地回退预算 " + formatTokenCount(usage.localBudgetTokens)
          : ""
        const source = usage.modelContextSource ? "；来源 " + contextSourceLabel(usage.modelContextSource) : ""
        return used + "，可用预算 " + formatTokenCount(usage.maxTokens) + local + source
      }

      return used + "，本地预算 " + formatTokenCount(usage.maxTokens) +
        "；模型窗口未知"
    }

    function contextSourceLabel(source) {
      if (source === "catalog") return "模型列表"
      if (source === "description") return "模型描述"
      if (source === "model-id") return "模型 ID 规则"
      return "未知"
    }

    function estimateTokens(chars, charsPerToken) {
      return Math.ceil(Math.max(0, chars) / Math.max(1, charsPerToken))
    }

    function positiveNumber(value, fallback) {
      const number = Number(value)
      return Number.isFinite(number) && number > 0 ? number : fallback
    }

    function numberOrDefault(value, fallback) {
      const number = Number(value)
      return Number.isFinite(number) ? number : fallback
    }

    function formatTokenCount(value) {
      const number = Math.max(0, Math.round(Number(value) || 0))
      if (number >= 1000000) return formatCompactNumber(number / 1000000) + "m"
      if (number >= 10000) return Math.round(number / 1000) + "k"
      if (number >= 1000) return formatCompactNumber(number / 1000) + "k"
      return String(number)
    }

    function formatCompactNumber(value) {
      return value.toFixed(1).replace(/\\.0$/, "")
    }

    function formatRelativeSessionTime(value) {
      const timestamp =
        typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : 0
      if (!Number.isFinite(timestamp) || timestamp <= 0) return ""
      const diffMs = Math.max(0, Date.now() - timestamp)
      const minute = 60 * 1000
      const hour = 60 * minute
      const day = 24 * hour
      const month = 30 * day
      const year = 365 * day
      if (diffMs < minute) return "刚刚"
      if (diffMs < hour) return Math.floor(diffMs / minute) + " 分"
      if (diffMs < day) return Math.floor(diffMs / hour) + " 小时"
      if (diffMs < month) return Math.floor(diffMs / day) + " 天"
      if (diffMs < year) return Math.floor(diffMs / month) + " 月"
      return Math.floor(diffMs / year) + " 年"
    }

    function visibleProjectSessions(sessions) {
      const query = els.sessionSearch.value.trim().toLowerCase()
      const showArchived = els.sessionShowArchived.checked
      return (sessions || [])
        .filter((session) => showArchived || !session.archived)
        .filter((session) => {
          if (!query) return true
          return [session.title, session.workspaceCwd, session.workspaceMode]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        })
        .sort((left, right) => {
          if (Boolean(left.pinned) !== Boolean(right.pinned)) {
            return left.pinned ? -1 : 1
          }
          if (Boolean(left.archived) !== Boolean(right.archived)) {
            return left.archived ? 1 : -1
          }
          return (right.updatedAt || 0) - (left.updatedAt || 0)
        })
    }

    function cleanupSessionListDisplayCounts(projects) {
      const projectIds = new Set((projects || []).map((project) => project.id))
      for (const projectId of sessionListDisplayCounts.keys()) {
        if (!projectIds.has(projectId)) sessionListDisplayCounts.delete(projectId)
      }
    }

    function projectSessionDisplayCount(projectId, total) {
      if (total <= SESSION_LIST_COLLAPSED_COUNT) return total
      const stored = Number(sessionListDisplayCounts.get(projectId))
      const requested = Number.isFinite(stored) ? stored : SESSION_LIST_COLLAPSED_COUNT
      return Math.min(total, Math.max(SESSION_LIST_COLLAPSED_COUNT, requested))
    }

    function setProjectSessionDisplayCount(projectId, count) {
      if (!projectId) return
      sessionListDisplayCounts.set(projectId, Math.max(SESSION_LIST_COLLAPSED_COUNT, count))
    }

    function sessionWorkspaceOutsideProject(session, project) {
      return Boolean(
        session &&
          project &&
          session.workspaceCwd &&
          project.cwd &&
          normalizeWorkspacePath(session.workspaceCwd) !== normalizeWorkspacePath(project.cwd)
      )
    }

    function normalizeWorkspacePath(value) {
      return String(value || "").replace(/\\\\/g, "/").replace(/\\/+$/, "")
    }

    function renderSidebar() {
      els.projectList.textContent = ""
      const projects = state.projects || []
      cleanupSessionListDisplayCounts(projects)

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

        const projectItem = document.createElement("div")
        projectItem.className = "project-item"

        const projectButton = document.createElement("button")
        projectButton.type = "button"
        projectButton.className =
          "project-row" + (project.id === state.activeProjectId ? " active" : "")
        projectButton.title = project.cwd || project.name
        projectButton.addEventListener("click", () => selectProject(project.id))

        const icon = document.createElement("span")
        icon.className = "icon"
        icon.textContent = "▤"
        projectButton.appendChild(icon)

        const projectText = document.createElement("span")
        projectText.className = "project-meta"
        const title = document.createElement("span")
        title.className = "project-title"
        title.textContent = project.name
        projectText.appendChild(title)
        projectButton.appendChild(projectText)

        const deleteProjectButton = document.createElement("button")
        deleteProjectButton.type = "button"
        deleteProjectButton.className = "project-delete"
        deleteProjectButton.title = "移除项目"
        deleteProjectButton.setAttribute("aria-label", "移除项目 " + project.name)
        deleteProjectButton.textContent = "×"
        deleteProjectButton.disabled = isProjectRunning(project.id)
        deleteProjectButton.addEventListener("click", (event) => {
          event.stopPropagation()
          void deleteProject(project.id, project.name)
        })

        projectItem.appendChild(projectButton)
        projectItem.appendChild(deleteProjectButton)
        group.appendChild(projectItem)

        const sessions = document.createElement("div")
        sessions.className = "session-list"
        const visibleSessions = visibleProjectSessions(project.sessions)
        const displayedCount = projectSessionDisplayCount(project.id, visibleSessions.length)
        const displayedSessions = visibleSessions.slice(0, displayedCount)
        if (!project.sessions || project.sessions.length === 0) {
          const empty = document.createElement("div")
          empty.className = "empty-list"
          empty.textContent = "还没有会话"
          sessions.appendChild(empty)
        } else if (visibleSessions.length === 0) {
          const empty = document.createElement("div")
          empty.className = "empty-list"
          empty.textContent = "无匹配会话"
          sessions.appendChild(empty)
        } else {
          for (const session of displayedSessions) {
            const sessionItem = document.createElement("div")
            sessionItem.className = "session-item"
            const sessionButton = document.createElement("button")
            sessionButton.type = "button"
            sessionButton.className =
              "session-row" +
              (session.id === state.activeSessionId ? " active" : "") +
              (isSessionRunning(session.id) ? " running" : "") +
              (session.pinned ? " pinned" : "") +
              (session.archived ? " archived" : "")
            sessionButton.title = session.title
            sessionButton.addEventListener("click", () => selectSession(session.id))
            const sessionMain = document.createElement("span")
            sessionMain.className = "session-main"
            const label = document.createElement("span")
            label.className = "session-title"
            label.textContent = session.title
            sessionMain.appendChild(label)
            if (
              session.workspaceMode === "worktree" ||
              sessionWorkspaceOutsideProject(session, project)
            ) {
              const badge = document.createElement("span")
              badge.className = "session-workspace-badge"
              badge.textContent = session.workspaceMode === "worktree" ? "W" : "跨"
              badge.title =
                session.workspaceMode === "worktree"
                  ? session.workspaceCwd || "Worktree"
                  : "实际 workspace：" + (session.workspaceCwd || "")
              sessionMain.appendChild(badge)
            }
            const time = document.createElement("span")
            time.className = "session-time"
            time.textContent = formatRelativeSessionTime(session.updatedAt || session.createdAt)
            sessionButton.appendChild(sessionMain)
            sessionButton.appendChild(time)

            const pinButton = document.createElement("button")
            pinButton.type = "button"
            pinButton.className = "session-pin"
            pinButton.title = session.pinned ? "取消置顶" : "置顶会话"
            pinButton.setAttribute("aria-label", pinButton.title + " " + session.title)
            pinButton.textContent = session.pinned ? "★" : "☆"
            pinButton.addEventListener("click", (event) => {
              event.stopPropagation()
              void updateSessionFlags(session.id, { pinned: !session.pinned })
            })

            const archiveButton = document.createElement("button")
            archiveButton.type = "button"
            archiveButton.className = "session-archive"
            archiveButton.title = session.archived ? "恢复会话" : "归档会话"
            archiveButton.setAttribute("aria-label", archiveButton.title + " " + session.title)
            archiveButton.innerHTML =
              '<svg class="session-archive-icon" viewBox="0 0 24 24" aria-hidden="true">' +
              '<rect x="4" y="5" width="16" height="4" rx="1.4"></rect>' +
              '<path d="M5.5 9h13v9.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V9Z"></path>' +
              '<path d="M9 13h6"></path>' +
              '</svg>'
            archiveButton.disabled = isSessionRunning(session.id)
            archiveButton.addEventListener("click", (event) => {
              event.stopPropagation()
              void updateSessionFlags(session.id, { archived: !session.archived })
            })

            const deleteButton = document.createElement("button")
            deleteButton.type = "button"
            deleteButton.className = "session-delete"
            deleteButton.title = "删除会话"
            deleteButton.setAttribute("aria-label", "删除会话 " + session.title)
            deleteButton.textContent = "×"
            deleteButton.disabled = isSessionRunning(session.id)
            deleteButton.addEventListener("click", (event) => {
              event.stopPropagation()
              void deleteSession(session.id, session.title)
            })

            const sessionActions = document.createElement("div")
            sessionActions.className = "session-actions"
            sessionActions.appendChild(pinButton)
            sessionActions.appendChild(archiveButton)
            sessionActions.appendChild(deleteButton)

            sessionItem.appendChild(sessionButton)
            sessionItem.appendChild(sessionActions)
            sessions.appendChild(sessionItem)
          }
          if (visibleSessions.length > SESSION_LIST_COLLAPSED_COUNT) {
            const controls = document.createElement("div")
            controls.className = "session-list-controls"
            if (displayedCount < visibleSessions.length) {
              const expandButton = document.createElement("button")
              expandButton.type = "button"
              expandButton.className = "session-list-toggle"
              expandButton.textContent = "展开显示"
              expandButton.title = "再显示约 " + SESSION_LIST_EXPAND_STEP + " 个会话"
              expandButton.addEventListener("click", () => {
                setProjectSessionDisplayCount(
                  project.id,
                  Math.min(visibleSessions.length, displayedCount + SESSION_LIST_EXPAND_STEP)
                )
                renderSidebar()
              })
              controls.appendChild(expandButton)
            }
            if (displayedCount > SESSION_LIST_COLLAPSED_COUNT) {
              const collapseButton = document.createElement("button")
              collapseButton.type = "button"
              collapseButton.className = "session-list-toggle"
              collapseButton.textContent = "折叠显示"
              collapseButton.title = "收起到最近会话"
              collapseButton.addEventListener("click", () => {
                setProjectSessionDisplayCount(project.id, SESSION_LIST_COLLAPSED_COUNT)
                renderSidebar()
              })
              controls.appendChild(collapseButton)
            }
            sessions.appendChild(controls)
          }
        }
        group.appendChild(sessions)
        els.projectList.appendChild(group)
      }
    }

    function renderHeader() {
      if (state.activeSession) {
        els.pageTitle.textContent = state.activeSession.title
        els.cwd.textContent =
          state.activeSession.workspaceCwd || (state.activeProject ? state.activeProject.cwd : "")
        const mode = state.activeSession.workspaceMode === "worktree" ? "Worktree" : "Local"
        els.workspaceBadge.textContent = mode
        els.workspaceBadge.dataset.mode = state.activeSession.workspaceMode || "local"
        els.moveWorkspaceBtn.textContent = mode === "Worktree" ? "迁回 Local" : "迁到 Worktree"
        els.moveWorkspaceBtn.title = mode === "Worktree" ? "把会话 diff 应用回 Local 并切换会话工作区" : "创建独立 Git worktree 并切换会话工作区"
        return
      }

      if (state.activeProject) {
        els.pageTitle.textContent = state.activeProject.name
        els.cwd.textContent = state.activeProject.cwd
        els.workspaceBadge.hidden = true
        els.moveWorkspaceBtn.hidden = true
        els.discardSessionBtn.hidden = true
        return
      }

      els.pageTitle.textContent = "打开项目"
      els.cwd.textContent = "当前没有打开项目"
      els.workspaceBadge.hidden = true
      els.moveWorkspaceBtn.hidden = true
      els.discardSessionBtn.hidden = true
    }

    function messagesBottomDistance() {
      return Math.max(
        0,
        els.messages.scrollHeight - els.messages.clientHeight - els.messages.scrollTop
      )
    }

    function isMessagesNearBottom() {
      return messagesBottomDistance() <= MESSAGES_BOTTOM_THRESHOLD
    }

    function updateScrollBottomButton() {
      const hasScrollableContent =
        els.messages.scrollHeight > els.messages.clientHeight + MESSAGES_BOTTOM_THRESHOLD
      els.scrollBottomBtn.hidden = !hasScrollableContent || messagesAutoFollow
      els.conversation.classList.toggle(
        "away-from-bottom",
        hasScrollableContent && !messagesAutoFollow
      )
      els.conversation.classList.toggle("messages-scrolled", els.messages.scrollTop > 8)
      updateConversationTurnNavActive()
    }

    function updateMessagesAutoFollow() {
      const nearBottom = isMessagesNearBottom()
      if (scrollingToBottom) {
        messagesAutoFollow = true
        if (nearBottom) scrollingToBottom = false
      } else {
        messagesAutoFollow = nearBottom
      }
      updateScrollBottomButton()
    }

    function scrollMessagesToBottom(behavior) {
      messagesAutoFollow = true
      scrollingToBottom = behavior === "smooth"
      if (behavior === "smooth" && typeof els.messages.scrollTo === "function") {
        els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: "smooth" })
      } else {
        els.messages.scrollTop = els.messages.scrollHeight
        scrollingToBottom = false
      }
      updateScrollBottomButton()
    }

    function syncComposerReservedSpace() {
      if (!els.composerWrap) return
      const wasNearBottom = isMessagesNearBottom()
      const composerHeight = Math.ceil(els.composerWrap.getBoundingClientRect().height)
      const reservedHeight = Math.max(160, composerHeight + 36)
      els.conversation.style.setProperty("--composer-reserved-height", reservedHeight + "px")
      if (wasNearBottom) {
        window.requestAnimationFrame(() => scrollMessagesToBottom())
      } else {
        updateScrollBottomButton()
      }
    }

    function canScrollElementByDelta(element, deltaY) {
      if (!element || Math.abs(deltaY) < 1) return false
      const maxScrollTop = element.scrollHeight - element.clientHeight
      if (maxScrollTop <= 1) return false
      if (deltaY < 0) return element.scrollTop > 0
      return element.scrollTop < maxScrollTop - 1
    }

    function forwardComposerWheelToMessages(event) {
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return
      const target = event.target instanceof Element ? event.target : null
      const localScroller = target
        ? target.closest("textarea, .attachment-list, .queued-run-list, .permission-menu, .model-list, .model-param-list")
        : null
      if (localScroller && canScrollElementByDelta(localScroller, event.deltaY)) return

      const maxScrollTop = Math.max(0, els.messages.scrollHeight - els.messages.clientHeight)
      if (maxScrollTop <= 0) return
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, els.messages.scrollTop + event.deltaY))
      if (nextScrollTop === els.messages.scrollTop) return
      event.preventDefault()
      els.messages.scrollTop = nextScrollTop
      updateMessagesAutoFollow()
    }

    function resizePrompt() {
      els.prompt.style.height = "auto"
      const nextHeight = Math.min(120, Math.max(40, els.prompt.scrollHeight))
      els.prompt.style.height = nextHeight + "px"
      syncComposerReservedSpace()
    }

	    function addAttachmentFiles(fileList) {
	      addAttachmentItems(Array.from(fileList || []).map((file) => ({ file })))
	    }

	    function addAttachmentItems(items) {
	      if (!state.activeSessionId || !state.modelsLoaded) {
	        setToast(els.projectToast, "请先打开项目并新建会话。", true)
	        return
	      }
	
	      if (!items || items.length === 0) return
	
	      const next = pendingAttachments.slice()
	      let totalBytes = next.reduce((sum, item) => sum + item.file.size, 0)
	      const rejected = []
	
	      for (const attachment of items) {
	        const file = attachment.file
	        if (!file) continue
	        if (next.length >= MAX_ATTACHMENTS) {
	          rejected.push(file.name + "：最多 " + MAX_ATTACHMENTS + " 个附件")
	          continue
        }

        if (file.size > MAX_ATTACHMENT_BYTES) {
          rejected.push(file.name + "：单文件超过 " + formatFileSize(MAX_ATTACHMENT_BYTES))
          continue
        }

        if (totalBytes + file.size > MAX_ATTACHMENTS_TOTAL_BYTES) {
          rejected.push(file.name + "：附件总大小超过 " + formatFileSize(MAX_ATTACHMENTS_TOTAL_BYTES))
          continue
        }

        const duplicate = next.some(
          (item) =>
            item.file.name === file.name &&
            item.file.size === file.size &&
            item.file.lastModified === file.lastModified
        )
        if (duplicate) continue

	        next.push({
	          file,
	          id: "attachment-" + ++attachmentIdCounter,
	          previewUrl: isImageAttachment(file) ? URL.createObjectURL(file) : "",
	          previewText: attachment.previewText || "",
	          source: attachment.source || "",
	          text: attachment.text || "",
	        })
	        totalBytes += file.size
	      }

      pendingAttachments = next
      renderAttachmentList()
      updateControls()

      if (rejected.length > 0) {
        setToast(els.projectToast, rejected.slice(0, 2).join("；"), true)
	      }
	    }

	    function addPastedTextAttachment(text) {
	      const value = String(text || "")
	      if (!isLongPastedText(value)) return false

	      const now = new Date()
	      const file = new File([value], pastedTextFileName(now), {
	        lastModified: now.getTime(),
	        type: "text/plain;charset=utf-8",
	      })
	      addAttachmentItems([
	        {
	          file,
	          previewText: pastedTextPreview(value),
	          source: "pasted_text",
	          text: value,
	        },
	      ])
	      return true
	    }

	    function isLongPastedText(text) {
	      const value = String(text || "")
	      if (!value.trim()) return false
	      if (value.length >= LONG_PASTE_ATTACHMENT_MIN_CHARS) return true
	      return value.split(/\\r\\n|\\r|\\n/).length >= LONG_PASTE_ATTACHMENT_MIN_LINES
	    }

	    function pastedTextFileName(date) {
	      const stamp = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)
	      return "pasted-text-" + stamp + ".txt"
	    }

	    function pastedTextPreview(text) {
	      return shortenInline(compactText(text), PASTE_ATTACHMENT_PREVIEW_CHARS)
	    }

    function renderAttachmentList() {
      els.attachmentList.textContent = ""
      els.attachmentList.hidden = pendingAttachments.length === 0

      for (const item of pendingAttachments) {
        els.attachmentList.appendChild(
          createAttachmentPreviewCard(
            {
	              name: item.file.name || "未命名文件",
	              previewText: item.previewText || "",
	              previewUrl: item.previewUrl,
	              source: item.source || "",
	              size: item.file.size,
	              type: item.file.type || "",
	            },
	            {
	              onRemove: () => {
	                revokeAttachmentPreview(item)
	                pendingAttachments = pendingAttachments.filter((attachment) => attachment.id !== item.id)
	                renderAttachmentList()
	                updateControls()
	              },
	              onReveal:
	                item.source === "pasted_text"
	                  ? () => revealPastedTextAttachment(item)
	                  : null,
	            }
	          )
	        )
      }
      syncComposerReservedSpace()
	    }

	    async function revealPastedTextAttachment(item) {
	      const text = item.text || (item.file && typeof item.file.text === "function"
	        ? await item.file.text()
	        : "")
	      if (!text) return
	      insertTextIntoPrompt(text)
	      revokeAttachmentPreview(item)
	      pendingAttachments = pendingAttachments.filter((attachment) => attachment.id !== item.id)
	      renderAttachmentList()
	      resizePrompt()
	      updateControls()
	      els.prompt.focus()
	    }

	    function insertTextIntoPrompt(text) {
	      const value = String(text || "")
	      const start = Number.isFinite(els.prompt.selectionStart)
	        ? els.prompt.selectionStart
	        : els.prompt.value.length
	      const end = Number.isFinite(els.prompt.selectionEnd)
	        ? els.prompt.selectionEnd
	        : start
	      els.prompt.setRangeText(value, start, end, "end")
	    }

    function renderQueuedRunList() {
      const runs = activeQueuedRuns()
      els.queuedRunList.textContent = ""
      els.queuedRunList.hidden = runs.length === 0

      for (const run of runs) {
        els.queuedRunList.appendChild(createQueuedRunNode(run))
      }
      syncComposerReservedSpace()
    }

    function createQueuedRunNode(run) {
      const node = document.createElement("div")
      node.className =
        "queued-run-item" + (isGuideQueuedRun(run) ? " guide" : "")

      const grip = document.createElement("span")
      grip.className = "queued-run-grip"
      grip.textContent = "⁝⋮"
      node.appendChild(grip)

      const body = document.createElement("div")
      body.className = "queued-run-body"
      const text = document.createElement("div")
      text.className = "queued-run-text"
      text.textContent = queuedRunDisplayText(run)
      body.appendChild(text)

      const parsed = parseUserAttachmentMessage(run.text)
      if (parsed && parsed.attachments.length > 0) {
        const meta = document.createElement("div")
        meta.className = "queued-run-meta"
        meta.textContent = parsed.attachments.length + " 个附件"
        body.appendChild(meta)
      }

      node.appendChild(body)
      appendQueuedRunActions(node, run)
      return node
    }

    function queuedRunDisplayText(run) {
      const parsed = parseUserAttachmentMessage(run && run.text)
      const text = parsed ? parsed.text : String((run && run.text) || "")
      return compactText(text) || "请查看附件。"
    }

    function clearPendingAttachments() {
      for (const item of pendingAttachments) {
        revokeAttachmentPreview(item)
      }
      pendingAttachments = []
      if (els.attachmentInput) els.attachmentInput.value = ""
      renderAttachmentList()
      updateControls()
    }

    async function buildAttachmentPayload() {
      const files = []
      for (const item of pendingAttachments) {
        const buffer = await item.file.arrayBuffer()
        files.push({
	          dataBase64: arrayBufferToBase64(buffer),
	          lastModified: item.file.lastModified || 0,
	          name: item.file.name || "attachment",
	          previewText: item.previewText || "",
	          previewDataUrl: await createAttachmentPreviewDataUrl(item.file),
	          size: item.file.size || buffer.byteLength,
	          source: item.source || "",
	          type: item.file.type || "",
	        })
      }
      return files
    }

    function formatUserMessageWithAttachments(prompt, attachments) {
      const text = prompt.trim()
      if (!attachments || attachments.length === 0) return text

      return USER_ATTACHMENT_MESSAGE_PREFIX + "\\n" + JSON.stringify({
        attachments: attachments.map((item) => ({
	          name: item.name || "attachment",
	          previewDataUrl: item.previewDataUrl || "",
	          previewText: item.previewText || "",
	          size: item.size || 0,
	          source: item.source || "",
	          type: item.type || "",
	        })),
        text: text || "请查看附件。",
      })
    }

	    function createAttachmentPreviewCard(attachment, actions) {
	      const onRemove =
	        typeof actions === "function" ? actions : actions && actions.onRemove
	      const onReveal = actions && typeof actions === "object" ? actions.onReveal : null
	      const card = document.createElement("div")
	      card.className = "attachment-preview-card"

	      if (attachment.source === "pasted_text") {
	        card.classList.add("paste-text-card")

	        const icon = document.createElement("div")
	        icon.className = "paste-text-icon"
	        icon.setAttribute("aria-hidden", "true")
	        icon.textContent = "TXT"

	        const body = document.createElement("div")
	        body.className = "paste-text-body"

	        const title = document.createElement("div")
	        title.className = "paste-text-title"
	        title.textContent = attachment.previewText || attachment.name || "粘贴文本"
	        title.title = title.textContent
	        body.appendChild(title)

	        if (onReveal) {
	          const reveal = document.createElement("button")
	          reveal.className = "paste-text-reveal"
	          reveal.type = "button"
	          reveal.textContent = "在文本框中显示 ›"
	          reveal.addEventListener("click", onReveal)
	          body.appendChild(reveal)
	        } else {
	          const meta = document.createElement("div")
	          meta.className = "paste-text-meta"
	          meta.textContent = attachmentCaptionText(attachment)
	          body.appendChild(meta)
	        }

	        card.appendChild(icon)
	        card.appendChild(body)

	        if (onRemove) {
	          const remove = document.createElement("button")
	          remove.className = "attachment-preview-remove"
	          remove.type = "button"
	          remove.textContent = "×"
	          remove.setAttribute("aria-label", "移除粘贴文本")
	          remove.addEventListener("click", onRemove)
	          card.appendChild(remove)
	        }

	        return card
	      }
	
	      const preview = document.createElement("div")
      preview.className = "attachment-preview"
      const previewUrl = attachment.previewDataUrl || attachment.previewUrl || ""
      if (previewUrl) {
        const image = document.createElement("img")
        image.alt = attachment.name || "附件"
        image.src = previewUrl
        image.addEventListener("error", () => {
          preview.textContent = ""
          const fileType = document.createElement("span")
          fileType.className = "attachment-file-type"
          fileType.textContent = attachmentFileLabel(attachment.name, attachment.type)
          preview.appendChild(fileType)
        })
        preview.appendChild(image)
      } else {
        const fileType = document.createElement("span")
        fileType.className = "attachment-file-type"
        fileType.textContent = attachmentFileLabel(attachment.name, attachment.type)
        preview.appendChild(fileType)
      }

      const caption = document.createElement("div")
      caption.className = "attachment-caption"
      caption.textContent = attachmentCaptionText(attachment)
      caption.title = caption.textContent

      card.appendChild(preview)
      card.appendChild(caption)

      if (onRemove) {
        const remove = document.createElement("button")
        remove.className = "attachment-preview-remove"
        remove.type = "button"
        remove.textContent = "×"
        remove.setAttribute("aria-label", "移除附件 " + caption.textContent)
        remove.addEventListener("click", onRemove)
        card.appendChild(remove)
      }

      return card
    }

    function attachmentFileLabel(name, type) {
      const extension = String(name || "").split(".").pop()
      if (extension && extension !== name) return extension.slice(0, 4).toUpperCase()
      if (String(type || "").includes("/")) return String(type).split("/").pop().slice(0, 4).toUpperCase()
      return "FILE"
    }

    function attachmentCaptionText(attachment) {
      const name = attachment.name || "attachment"
      const sizeText = attachment.size ? formatFileSize(attachment.size) : attachment.sizeLabel
      return sizeText ? name + " (" + sizeText + ")" : name
    }

    function isImageAttachment(file) {
      return String(file && file.type || "").startsWith("image/")
    }

    function revokeAttachmentPreview(item) {
      if (item && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }

    async function createAttachmentPreviewDataUrl(file) {
      if (!isImageAttachment(file)) return ""

      return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file)
        const image = new Image()
        image.onload = () => {
          try {
            const maxSize = 220
            const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
            const width = Math.max(1, Math.round((image.naturalWidth || 1) * ratio))
            const height = Math.max(1, Math.round((image.naturalHeight || 1) * ratio))
            const canvas = document.createElement("canvas")
            canvas.width = width
            canvas.height = height
            const context = canvas.getContext("2d")
            if (!context) {
              resolve("")
              return
            }
            context.drawImage(image, 0, 0, width, height)
            resolve(canvas.toDataURL("image/jpeg", 0.82))
          } catch {
            resolve("")
          } finally {
            URL.revokeObjectURL(objectUrl)
          }
        }
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl)
          resolve("")
        }
        image.src = objectUrl
      })
    }

    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer)
      let binary = ""
      const chunkSize = 0x8000
      for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize)
        binary += String.fromCharCode.apply(null, Array.from(chunk))
      }
      return window.btoa(binary)
    }

    function formatFileSize(size) {
      const value = Number(size) || 0
      if (value < 1024) return value + " B"
      if (value < 1024 * 1024) return (value / 1024).toFixed(value < 10 * 1024 ? 1 : 0) + " KB"
      return (value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0) + " MB"
    }

    function finishMessagesRender(shouldFollow, previousScrollTop) {
      if (shouldFollow) {
        scrollMessagesToBottom()
        return
      }

      const maxScrollTop = Math.max(0, els.messages.scrollHeight - els.messages.clientHeight)
      els.messages.scrollTop = Math.min(previousScrollTop, maxScrollTop)
      updateMessagesAutoFollow()
    }

    function renderConversationTurnNav(items) {
      conversationTurnNavItems = Array.isArray(items) ? items.filter(Boolean) : []
      if (!els.conversationTurnNav || !els.conversationTurnTrack) return

      els.conversationTurnTrack.textContent = ""
      hideConversationTurnPreview()
      if (conversationTurnNavItems.length <= 3) {
        els.conversationTurnNav.hidden = true
        return
      }

      els.conversationTurnNav.hidden = false
      for (const item of conversationTurnNavItems) {
        const marker = document.createElement("button")
        marker.type = "button"
        marker.className = "conversation-turn-marker"
        marker.dataset.turnIndex = String(item.index)
        marker.setAttribute("aria-label", "跳到：" + item.title)
        marker.addEventListener("click", () => {
          scrollToConversationTurn(item.index)
        })
        marker.addEventListener("mouseenter", () => {
          showConversationTurnPreview(item, marker)
        })
        marker.addEventListener("mouseleave", hideConversationTurnPreview)
        marker.addEventListener("focus", () => {
          showConversationTurnPreview(item, marker)
        })
        marker.addEventListener("blur", hideConversationTurnPreview)
        els.conversationTurnTrack.appendChild(marker)
      }
      updateConversationTurnNavActive()
    }

    function conversationTurnNavItemFromMessage(message, index) {
      const parsed = parseUserAttachmentMessage(message && message.text)
      const rawText = parsed ? parsed.text : String((message && message.text) || "")
      const lines = String(rawText || "")
        .replace(/\\r\\n?/g, "\\n")
        .split("\\n")
        .map(compactText)
        .filter(Boolean)
      const titlePrefix = isGuideUserMessage(message) ? "引导：" : ""
      const title = titlePrefix + shortenInline(lines[0] || "这轮对话", 42)
      const bodyText = lines.length > 1 ? compactText(lines.slice(1).join(" ")) : ""
      const attachmentText =
        parsed && parsed.attachments.length > 0
          ? "包含 " + parsed.attachments.length + " 个附件。"
          : ""
      return {
        index,
        summary: shortenInline(bodyText || attachmentText || "等待 agent 输出。", 132),
        title,
      }
    }

    function conversationTurnSummaryFromItems(items) {
      const visibleMessages = Array.isArray(items)
        ? items.filter((message) => !isActivityMessage(message))
        : []
      const assistantMessages = visibleMessages.filter(
        (message) => message.kind === "assistant" && compactText(message.text)
      )
      const assistant = assistantMessages[assistantMessages.length - 1]
      if (assistant) {
        return shortenInline(markdownPreviewText(assistant.text), 132) || "这轮对话没有可预览的输出。"
      }

      const multi = visibleMessages.find((message) => message.kind === "multi")
      if (multi && compactText(multi.text)) {
        return shortenInline(compactText(multi.text), 132)
      }

      const activityMessages = Array.isArray(items) ? items.filter(isActivityMessage) : []
      const activity = activityMessages[activityMessages.length - 1]
      if (activity && compactText(activity.text)) {
        return shortenInline(compactText(activity.text).replace(/^\\[[^\\]]+\\]\\s*/, ""), 132)
      }

      return "等待 agent 输出。"
    }

    function markdownPreviewText(text) {
      return compactText(
        String(text || "")
          .replace(/\`\`\`[\\s\\S]*?\`\`\`/g, " 代码块 ")
          .replace(/\`([^\`]+)\`/g, "$1")
          .replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g, "")
          .replace(/\\[([^\\]]+)\\]\\([^)]*\\)/g, "$1")
          .replace(/^#{1,6}\\s+/gm, "")
          .replace(/^\\s*[-*+]\\s+/gm, "")
          .replace(/^\\s*\\d+[.)]\\s+/gm, "")
          .replace(/^\\s*>\\s?/gm, "")
      )
    }

    function conversationTurnAnchors() {
      return Array.from(els.messages.querySelectorAll("[data-turn-anchor]"))
    }

    function findConversationTurnAnchor(index) {
      const target = String(index)
      return conversationTurnAnchors().find((anchor) => anchor.dataset.turnAnchor === target) || null
    }

    function scrollToConversationTurn(index) {
      const anchor = findConversationTurnAnchor(index)
      if (!anchor) return

      const messagesRect = els.messages.getBoundingClientRect()
      const anchorRect = anchor.getBoundingClientRect()
      const offset = Math.round(Math.min(160, Math.max(64, els.messages.clientHeight * 0.22)))
      const nextTop = els.messages.scrollTop + anchorRect.top - messagesRect.top - offset
      messagesAutoFollow = false
      scrollingToBottom = false
      if (typeof els.messages.scrollTo === "function") {
        els.messages.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
      } else {
        els.messages.scrollTop = Math.max(0, nextTop)
      }
      updateConversationTurnNavActive()
      updateScrollBottomButton()
    }

    function updateConversationTurnNavActive() {
      if (!els.conversationTurnNav || els.conversationTurnNav.hidden) return

      const anchors = conversationTurnAnchors()
      const markers = Array.from(els.conversationTurnTrack.querySelectorAll(".conversation-turn-marker"))
      if (anchors.length === 0 || markers.length === 0) return

      const messagesRect = els.messages.getBoundingClientRect()
      const targetY = messagesRect.top + Math.min(messagesRect.height * 0.38, 280)
      let activeIndex = anchors[0].dataset.turnAnchor || "0"
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= targetY) {
          activeIndex = anchor.dataset.turnAnchor || activeIndex
        } else {
          break
        }
      }
      const maxScrollTop = Math.max(0, els.messages.scrollHeight - els.messages.clientHeight)
      if (maxScrollTop > MESSAGES_BOTTOM_THRESHOLD * 2 && isMessagesNearBottom()) {
        activeIndex = anchors[anchors.length - 1].dataset.turnAnchor || activeIndex
      }

      for (const marker of markers) {
        const active = marker.dataset.turnIndex === activeIndex
        marker.classList.toggle("active", active)
        if (active) marker.setAttribute("aria-current", "true")
        else marker.removeAttribute("aria-current")
      }
      const activeMarker = markers.find((marker) => marker.dataset.turnIndex === activeIndex)
      if (activeMarker && typeof activeMarker.scrollIntoView === "function") {
        activeMarker.scrollIntoView({ block: "nearest", inline: "nearest" })
      }
    }

    function showConversationTurnPreview(item, marker) {
      if (
        !item ||
        !marker ||
        !els.conversationTurnNav ||
        !els.conversationTurnPreview ||
        !els.conversationTurnPreviewTitle ||
        !els.conversationTurnPreviewBody
      ) {
        return
      }

      els.conversationTurnPreviewTitle.textContent = item.title
      els.conversationTurnPreviewBody.textContent = item.summary || "点击跳转到这轮对话。"

      const markerRect = marker.getBoundingClientRect()
      const navRect = els.conversationTurnNav.getBoundingClientRect()
      let previewY = markerRect.top + markerRect.height / 2 - navRect.top
      els.conversationTurnPreview.style.setProperty(
        "--conversation-turn-preview-y",
        previewY + "px"
      )
      els.conversationTurnPreview.hidden = false

      const previewRect = els.conversationTurnPreview.getBoundingClientRect()
      const conversationRect = els.conversation.getBoundingClientRect()
      const topLimit = conversationRect.top + 64
      const bottomLimit = conversationRect.bottom - 72
      if (previewRect.top < topLimit) {
        previewY += topLimit - previewRect.top
      } else if (previewRect.bottom > bottomLimit) {
        previewY -= previewRect.bottom - bottomLimit
      }
      els.conversationTurnPreview.style.setProperty(
        "--conversation-turn-preview-y",
        previewY + "px"
      )
    }

    function hideConversationTurnPreview() {
      if (els.conversationTurnPreview) els.conversationTurnPreview.hidden = true
    }

    function scheduleMessagesRender() {
      if (scheduledMessagesRender) return

      const schedule =
        typeof window.requestAnimationFrame === "function"
          ? window.requestAnimationFrame.bind(window)
          : (callback) => window.setTimeout(callback, ASSISTANT_STREAM_FRAME_MS)
      scheduledMessagesRender = schedule(() => {
        scheduledMessagesRender = 0
        renderMessages()
      })
    }

    function renderMessagesForSession(sessionId) {
      if (sessionId === state.activeSessionId) scheduleMessagesRender()
    }

    function renderMessages() {
      const shouldFollow = messagesAutoFollow || isMessagesNearBottom()
      const previousScrollTop = els.messages.scrollTop
      els.messages.textContent = ""
      renderConversationTurnNav([])

      if (!state.activeProject) {
        renderEmptyState("打开一个项目", "当前没有打开项目。先输入项目目录，再在项目中新建会话。", true)
        finishMessagesRender(true, previousScrollTop)
        return
      }

      if (!state.activeSession) {
        if (!state.modelsLoaded) {
          renderEmptyState("加载可用模型", "当前项目已经打开。先在左下角设置 API Key 并加载可用模型。", false)
          finishMessagesRender(true, previousScrollTop)
          return
        }

        renderEmptyState("在项目中新建会话", "当前项目已经打开，点击左侧新对话开始一次独立的 agent 会话。", false)
        finishMessagesRender(true, previousScrollTop)
        return
      }

      const messages = activeMessages()
      if (messages.length === 0) {
        renderEmptyState("新会话已准备好", "输入任务后，输出、工具调用和代码变更会显示在这个页面里。", false)
        finishMessagesRender(true, previousScrollTop)
        return
      }

      let turnItems = []
      let turnIndex = 0
      let userTurnIndex = 0
      let currentTurnNavItem = null
      const turnNavItems = []
      const flushTurn = () => {
        if (turnItems.length > 0) {
          if (currentTurnNavItem) {
            currentTurnNavItem.summary = conversationTurnSummaryFromItems(turnItems)
          }
          appendTurnItems(turnItems, turnIndex)
          turnIndex += 1
        }
        turnItems = []
      }

      for (const message of messages) {
        if (isUserMessage(message)) {
          flushTurn()
          currentTurnNavItem = conversationTurnNavItemFromMessage(message, userTurnIndex)
          turnNavItems.push(currentTurnNavItem)
          appendRenderedMessage(message, { turnIndex: userTurnIndex })
          userTurnIndex += 1
          continue
        }

        turnItems.push(message)
      }
      flushTurn()
      renderConversationTurnNav(turnNavItems)
      appendLatestChangeSummaryCard()
      finishMessagesRender(shouldFollow, previousScrollTop)
    }

    function appendTurnItems(items, turnIndex) {
      const activityMessages = items.filter(isActivityMessage)
      if (groupHasActiveRunTimer(activityMessages)) {
        appendActiveTurnItems(items, turnIndex)
        return
      }

      if (activityMessages.length > 0) {
        appendActivityGroup(activityMessages, turnIndex)
      }
      for (const message of completedTurnMessages(items)) {
        appendRenderedMessage(message)
      }
    }

    function appendActiveTurnItems(items, turnIndex) {
      let activitySegment = []
      let segmentIndex = 0
      const flushActivitySegment = () => {
        if (activitySegment.length === 0) return
        appendActivityGroup(activitySegment, String(turnIndex) + ":" + segmentIndex, {
          open: true,
        })
        activitySegment = []
        segmentIndex += 1
      }

      for (const message of items) {
        if (isActivityMessage(message)) {
          activitySegment.push(message)
          continue
        }

        flushActivitySegment()
        appendRenderedMessage(message)
      }
      flushActivitySegment()
    }

    function completedTurnMessages(items) {
      const visibleMessages = items.filter((message) => !isActivityMessage(message))
      if (!items.some(isActivityMessage)) return visibleMessages

      const assistantMessages = visibleMessages.filter(
        (message) => message.kind === "assistant" && String(message.text || "").trim()
      )
      if (assistantMessages.length <= 1) return visibleMessages

      const finalAssistant = assistantMessages[assistantMessages.length - 1]
      return visibleMessages.filter(
        (message) => message.kind !== "assistant" || message === finalAssistant
      )
    }

    function appendLatestChangeSummaryCard() {
      const files = Array.isArray(latestChanges.files) ? latestChanges.files : []
      if (
        !state.activeSessionId ||
        isActiveSessionRunning() ||
        !latestChanges.available ||
        files.length === 0
      ) {
        return
      }

      const totals = sumChangeStats(files)
      const card = document.createElement("div")
      card.className = "run-change-card"

      const icon = document.createElement("div")
      icon.className = "run-change-card-icon"
      icon.textContent = fileBadge(files[0].path)

      const body = document.createElement("div")
      body.className = "run-change-card-body"
      const title = document.createElement("div")
      title.className = "run-change-card-title"
      title.textContent =
        files.length === 1
          ? "已编辑 " + basename(files[0].path)
          : "已编辑 " + files.length + " 个文件"
      const stats = document.createElement("div")
      stats.className = "run-change-card-stats"
      const additions = document.createElement("span")
      additions.className = "add"
      additions.textContent = "+" + totals.additions
      const deletions = document.createElement("span")
      deletions.className = "del"
      deletions.textContent = "-" + totals.deletions
      stats.appendChild(additions)
      stats.appendChild(document.createTextNode(" "))
      stats.appendChild(deletions)
      body.appendChild(title)
      body.appendChild(stats)

      const actions = document.createElement("div")
      actions.className = "run-change-card-actions"
      const undo = document.createElement("button")
      undo.type = "button"
      undo.className = "run-change-card-action"
      undo.textContent = "撤销"
      undo.disabled = Boolean(els.discardSessionBtn.disabled)
      undo.addEventListener("click", () => {
        if (!undo.disabled) void discardActiveSessionChanges()
      })

      const review = document.createElement("button")
      review.type = "button"
      review.className = "run-change-card-action primary"
      review.textContent = "审查"
      review.addEventListener("click", () => {
        setReviewMode("changes")
        setReviewPanelHidden(false)
        if (files[0] && files[0].path) selectChangeFile(files[0].path, true)
      })
      actions.appendChild(undo)
      actions.appendChild(review)

      card.appendChild(icon)
      card.appendChild(body)
      card.appendChild(actions)
      els.messages.appendChild(card)
    }

	    function appendRenderedMessage(message, options) {
	      if (message.kind === "multi") {
	        appendMultiAgentRun(message)
	        return
	      }

	      const node = document.createElement("div")
	      if (message.kind === "assistant") {
	        node.className = "message assistant markdown"
        renderMarkdownInto(node, message.text)
      } else if (isUserMessage(message)) {
        node.className =
          "message user" +
          (isGuideUserMessage(message) ? " guide" : "") +
          (isQueuedUserMessage(message) ? " queued" : "")
        if (options && Number.isFinite(options.turnIndex)) {
          node.dataset.turnAnchor = String(options.turnIndex)
        }
        renderUserMessageInto(node, message.text, message)
      } else {
        node.className = "message " + message.kind
        node.textContent = message.text
	      }
	      els.messages.appendChild(node)
	    }

    function renderUserMessageInto(node, text, message) {
      const label = userMessageLabel(message)
      if (label) {
        const labelNode = document.createElement("div")
        labelNode.className = "user-message-label"
        labelNode.textContent = label
        node.appendChild(labelNode)
      }

      const parsed = parseUserAttachmentMessage(text)
      if (!parsed) {
        const body = document.createElement("div")
        body.className = "user-message-text"
        body.textContent = text
        node.appendChild(body)
        if (isQueuedUserMessage(message)) {
          appendQueuedMessageActions(node, message)
        }
        return
      }

      const body = document.createElement("div")
      body.className = "user-message-text"
      body.textContent = parsed.text
      node.appendChild(body)

      const list = document.createElement("div")
      list.className = "user-attachments"
      for (const attachment of parsed.attachments) {
        list.appendChild(createAttachmentPreviewCard(withAttachmentPreviewUrl(attachment)))
      }
      node.appendChild(list)

      if (isQueuedUserMessage(message)) {
        appendQueuedMessageActions(node, message)
      }
    }

    function appendQueuedMessageActions(node, message) {
      const actions = document.createElement("div")
      actions.className = "queued-message-actions"

      const guide = document.createElement("button")
      guide.type = "button"
      guide.className = "queued-action guide-action"
      guide.textContent = "↪ 引导"
      guide.disabled = isGuideUserMessage(message)
      guide.title = isGuideUserMessage(message) ? "已设为引导" : "设为引导并提前处理"
      guide.addEventListener("click", () => {
        void markQueuedMessageAsGuide(message)
      })
      actions.appendChild(guide)

      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "queued-icon-action"
      remove.textContent = "⌫"
      remove.title = "关闭排队"
      remove.setAttribute("aria-label", "关闭排队")
      remove.addEventListener("click", () => {
        void closeQueuedMessage(message)
      })
      actions.appendChild(remove)

      const moreWrap = document.createElement("div")
      moreWrap.className = "queued-more"
      const more = document.createElement("button")
      more.type = "button"
      more.className = "queued-icon-action"
      more.textContent = "…"
      more.title = "更多"
      more.setAttribute("aria-label", "更多")
      const menu = document.createElement("div")
      menu.className = "queued-menu"
      menu.hidden = true

      const edit = document.createElement("button")
      edit.type = "button"
      edit.textContent = "✎ 编辑消息"
      edit.addEventListener("click", () => {
        menu.hidden = true
        void editQueuedMessage(message)
      })
      menu.appendChild(edit)

      const close = document.createElement("button")
      close.type = "button"
      close.textContent = "↵ 关闭排队"
      close.addEventListener("click", () => {
        menu.hidden = true
        void closeQueuedMessage(message)
      })
      menu.appendChild(close)

      more.addEventListener("click", (event) => {
        event.stopPropagation()
        menu.hidden = !menu.hidden
      })
      moreWrap.appendChild(more)
      moreWrap.appendChild(menu)
      actions.appendChild(moreWrap)

      node.appendChild(actions)
    }

    function appendQueuedRunActions(node, run) {
      const actions = document.createElement("div")
      actions.className = "queued-message-actions"

      const guide = document.createElement("button")
      guide.type = "button"
      guide.className = "queued-action guide-action"
      guide.textContent = "↪ 引导"
      guide.disabled = isGuideQueuedRun(run)
      guide.title = isGuideQueuedRun(run) ? "已设为引导" : "设为引导并提前处理"
      guide.addEventListener("click", () => {
        void markQueuedRunAsGuide(run)
      })
      actions.appendChild(guide)

      const remove = document.createElement("button")
      remove.type = "button"
      remove.className = "queued-icon-action"
      remove.textContent = "⌫"
      remove.title = "关闭排队"
      remove.setAttribute("aria-label", "关闭排队")
      remove.addEventListener("click", () => {
        void closeQueuedRun(run)
      })
      actions.appendChild(remove)

      const moreWrap = document.createElement("div")
      moreWrap.className = "queued-more"
      const more = document.createElement("button")
      more.type = "button"
      more.className = "queued-icon-action"
      more.textContent = "…"
      more.title = "更多"
      more.setAttribute("aria-label", "更多")
      const menu = document.createElement("div")
      menu.className = "queued-menu"
      menu.hidden = true

      const edit = document.createElement("button")
      edit.type = "button"
      edit.textContent = "✎ 编辑消息"
      edit.addEventListener("click", () => {
        menu.hidden = true
        void editQueuedRun(run)
      })
      menu.appendChild(edit)

      const close = document.createElement("button")
      close.type = "button"
      close.textContent = "↵ 关闭排队"
      close.addEventListener("click", () => {
        menu.hidden = true
        void closeQueuedRun(run)
      })
      menu.appendChild(close)

      more.addEventListener("click", (event) => {
        event.stopPropagation()
        menu.hidden = !menu.hidden
      })
      moreWrap.appendChild(more)
      moreWrap.appendChild(menu)
      actions.appendChild(moreWrap)

      node.appendChild(actions)
    }

    function isUserMessage(message) {
      return messageKindTokens(message).includes("user")
    }

    function isQueuedUserMessage(message) {
      return messageKindTokens(message).includes("queued")
    }

    function isGuideUserMessage(message) {
      return messageKindTokens(message).includes("guide")
    }

    function messageKindTokens(message) {
      return String((message && message.kind) || "")
        .split(/\\s+/)
        .filter(Boolean)
    }

    function userMessageLabel(message) {
      const guide = isGuideUserMessage(message)
      const queued = isQueuedUserMessage(message)
      if (guide && queued) return "引导 · 排队"
      if (guide) return "引导"
      if (queued) return "排队"
      return ""
    }

    function promoteQueuedUserMessage(sessionId, mode, runId) {
      const targetSessionId = sessionId || state.activeSessionId
      const runs = activeQueuedRuns(targetSessionId)
      const queueMode = String(mode || "normal")
      let index = runId
        ? runs.findIndex((run) => queuedRunId(run) === runId)
        : -1

      if (index < 0) {
        index = runs.findIndex(
          (run) => queueMode !== "guide" || isGuideQueuedRun(run)
        )
      }

      if (index < 0 && queueMode === "guide") {
        index = runs.findIndex(Boolean)
      }

      if (index < 0) return

      const run = runs.splice(index, 1)[0]
      renderQueuedRunList()

      const kind = queueMode === "guide" || isGuideQueuedRun(run) ? "user guide" : "user"
      const messages = activeMessages(targetSessionId)
      const message = {
        kind,
        runId: queuedRunId(run),
        text: run.text,
      }
      messages.push(message)
      renderMessagesForSession(targetSessionId)
      schedulePersistMessages(targetSessionId)
    }

    function queuedMessageRunId(message) {
      return String((message && message.runId) || "")
    }

    function queuedRunId(run) {
      return String((run && run.runId) || "")
    }

    function isGuideQueuedRun(run) {
      return String((run && run.mode) || "normal") === "guide"
    }

    function setMessageKindToken(message, token, enabled) {
      const tokens = messageKindTokens(message).filter((item) => item !== token)
      if (enabled) tokens.push(token)
      message.kind = tokens.join(" ") || "user"
    }

    function createClientRunId() {
      runIdCounter += 1
      const randomPart = Math.random().toString(36).slice(2, 8)
      return "run_" + Date.now().toString(36) + "_" + runIdCounter.toString(36) + "_" + randomPart
    }

    function findQueuedMessageByRunId(sessionId, runId) {
      if (!sessionId || !runId) return null
      return activeQueuedRuns(sessionId).find((run) => queuedRunId(run) === runId) || null
    }

    function removeQueuedMessageByRunId(sessionId, runId) {
      if (!sessionId || !runId) return false
      const runs = activeQueuedRuns(sessionId)
      const index = runs.findIndex((run) => queuedRunId(run) === runId)
      if (index < 0) return false
      runs.splice(index, 1)
      renderQueuedRunList()
      return true
    }

    function reorderQueuedMessage(sessionId, message) {
      const runs = activeQueuedRuns(sessionId)
      const index = runs.indexOf(message)
      if (index < 0) return

      runs.splice(index, 1)
      const insertIndex = isGuideQueuedRun(message)
        ? runs.findIndex((run) => !isGuideQueuedRun(run))
        : -1
      if (insertIndex >= 0) {
        runs.splice(insertIndex, 0, message)
      } else {
        runs.push(message)
      }
      renderQueuedRunList()
    }

    async function markQueuedMessageAsGuide(message) {
      const sessionId = state.activeSessionId
      const runId = queuedRunId(message) || queuedMessageRunId(message)
      if (!sessionId || !runId || isGuideQueuedRun(message) || isGuideUserMessage(message)) return

      try {
        await postJson("/api/run/queue/update", {
          mode: "guide",
          runId,
          sessionId,
        })
        if ("mode" in message) {
          message.mode = "guide"
        } else {
          setMessageKindToken(message, "guide", true)
          setMessageKindToken(message, "queued", true)
        }
        reorderQueuedMessage(sessionId, message)
      } catch (error) {
        appendMeta("[错误] " + error.message, true, sessionId)
      }
    }

    async function closeQueuedMessage(message) {
      const sessionId = state.activeSessionId
      const runId = queuedRunId(message) || queuedMessageRunId(message)
      if (!sessionId || !runId) return

      try {
        await postJson("/api/run/queue/cancel", { runId, sessionId })
        removeQueuedMessageByRunId(sessionId, runId)
      } catch (error) {
        appendMeta("[错误] " + error.message, true, sessionId)
      }
    }

    async function editQueuedMessage(message) {
      const sessionId = state.activeSessionId
      const runId = queuedRunId(message) || queuedMessageRunId(message)
      if (!sessionId || !runId) return

      const parsed = parseUserAttachmentMessage(message.text)
      const currentText = parsed ? parsed.text : String(message.text || "")
      const nextText = window.prompt("编辑消息", currentText)
      if (nextText === null) return

      const trimmed = nextText.trim()
      if (!trimmed && !(parsed && parsed.attachments.length > 0)) return

      try {
        await postJson("/api/run/queue/update", {
          prompt: trimmed || "请查看附件。",
          runId,
          sessionId,
        })
        message.text = parsed
          ? formatUserMessageWithAttachments(trimmed || "请查看附件。", parsed.attachments)
          : trimmed
        renderQueuedRunList()
      } catch (error) {
        appendMeta("[错误] " + error.message, true, sessionId)
      }
    }

    const markQueuedRunAsGuide = markQueuedMessageAsGuide
    const closeQueuedRun = closeQueuedMessage
    const editQueuedRun = editQueuedMessage

    function parseUserAttachmentMessage(text) {
      const value = String(text || "")
      if (value.startsWith(USER_ATTACHMENT_MESSAGE_PREFIX + "\\n")) {
        try {
          const payload = JSON.parse(value.slice(USER_ATTACHMENT_MESSAGE_PREFIX.length + 1))
          const attachments = Array.isArray(payload.attachments)
            ? payload.attachments.map(normalizeRenderedAttachment).filter(Boolean)
            : []
          if (attachments.length === 0) return null
          return {
            attachments,
            text: compactText(payload.text || "") || "请查看附件。",
          }
        } catch {
          return null
        }
      }

      const marker = "\\n\\n附件：\\n"
      const markerIndex = value.lastIndexOf(marker)
      if (markerIndex < 0) return null

      const body = value.slice(0, markerIndex).trim()
      const attachmentText = value.slice(markerIndex + marker.length)
      const attachments = attachmentText
        .split("\\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseLegacyAttachmentLine)

      if (attachments.length === 0) return null
      return { attachments, text: body || "请查看附件。" }
    }

    function normalizeRenderedAttachment(value) {
      if (!value || typeof value !== "object") return null
	      return {
	        name: compactText(value.name || "attachment"),
	        previewDataUrl: String(value.previewDataUrl || ""),
	        previewText: shortenInline(compactText(value.previewText || ""), PASTE_ATTACHMENT_PREVIEW_CHARS),
	        size: Number(value.size) || 0,
	        source: String(value.source || ""),
	        type: String(value.type || ""),
	      }
	    }

    function withAttachmentPreviewUrl(attachment) {
      if (attachment.previewDataUrl || attachment.previewUrl) return attachment
      const previewUrl = localAttachmentPreviewUrl(attachment)
      return previewUrl ? { ...attachment, previewUrl } : attachment
    }

    function localAttachmentPreviewUrl(attachment) {
      if (!state.activeSessionId || !isPreviewableImageAttachment(attachment)) {
        return ""
      }

      const params = new URLSearchParams()
      params.set("sessionId", state.activeSessionId)
      params.set("name", attachment.name || "attachment")
      if (attachment.size || attachment.sizeLabel) {
        params.set("v", String(attachment.size || attachment.sizeLabel))
      }
      return "/api/attachments/preview?" + params.toString()
    }

    function isPreviewableImageAttachment(attachment) {
      const type = String(attachment.type || "").toLowerCase()
      if (type.startsWith("image/")) return true
      return /\\.(png|jpe?g|gif|webp|bmp)$/i.test(String(attachment.name || ""))
    }

    function parseLegacyAttachmentLine(line) {
      const value = String(line || "").replace(/^[-*]\\s*/, "").trim()
      const match = /^(.+?)\\s*\\(([^)]+)\\)$/.exec(value)
      return {
        name: compactText(match ? match[1] : value) || "attachment",
        previewDataUrl: "",
        size: 0,
        sizeLabel: match ? match[2] : "",
        type: "",
      }
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
      if (task.status === "RUNNING") {
        const cancel = document.createElement("button")
        cancel.type = "button"
        cancel.className = "multi-task-cancel"
        cancel.textContent = "取消"
        cancel.addEventListener("click", () => void cancelMultiAgentTask(task.id))
        top.appendChild(cancel)
      }
      card.appendChild(top)

      const model = document.createElement("div")
      model.className = "multi-task-model"
      model.textContent = [
        task.id || "",
        task.agentName || "",
        task.accessMode === "write" ? "write" : "read-only",
        task.permissionBoundary || "",
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

      if (Array.isArray(task.changedFiles) && task.changedFiles.length > 0) {
        const files = document.createElement("div")
        files.className = "multi-task-deps"
        files.textContent = "changed: " + task.changedFiles.slice(0, 8).join(", ")
        card.appendChild(files)
      }

      if (task.status === "PENDING" || task.status === "RUNNING") {
        card.appendChild(renderMultiTaskSteeringForm(task))
      }

      const usageText = formatTokenUsage(task.usage)
      const toolUsageText = formatMultiAgentToolUsage(task.toolUsage)
      const steeringText = formatMultiAgentSteering(task.steering)
      if (
        task.permissionBoundary ||
        task.prompt ||
        task.resultText ||
        task.errorMessage ||
        usageText ||
        toolUsageText ||
        steeringText
      ) {
        const details = document.createElement("details")
        details.className = "multi-task-details"
        const summary = document.createElement("summary")
        summary.textContent = "详情"
        details.appendChild(summary)
        if (steeringText) {
          details.appendChild(renderMultiTaskDetail("Steering", steeringText))
        }
        if (task.permissionBoundary) {
          details.appendChild(renderMultiTaskDetail("权限边界", task.permissionBoundary))
        }
        if (task.prompt) {
          details.appendChild(renderMultiTaskDetail("Prompt", task.prompt))
        }
        if (task.resultText) {
          details.appendChild(renderMultiTaskDetail("输出", task.resultText))
        }
        if (task.errorMessage) {
          details.appendChild(renderMultiTaskDetail("错误", task.errorMessage, true))
        }
        if (toolUsageText) {
          details.appendChild(renderMultiTaskDetail("Tools", toolUsageText))
        }
        if (usageText) {
          details.appendChild(renderMultiTaskDetail("Tokens", usageText))
        }
        card.appendChild(details)
      }

      return card
    }

    function renderMultiTaskSteeringForm(task) {
      const form = document.createElement("form")
      form.className = "multi-task-steering"
      const input = document.createElement("input")
      input.type = "text"
      input.placeholder = task.status === "PENDING" ? "追加执行指导" : "记录运行中指导"
      input.autocomplete = "off"
      const button = document.createElement("button")
      button.type = "submit"
      button.textContent = "发送"
      form.appendChild(input)
      form.appendChild(button)
      form.addEventListener("submit", (event) => {
        event.preventDefault()
        const note = input.value.trim()
        if (!note) return
        input.value = ""
        void steerMultiAgentTask(task.id, note)
      })
      return form
    }

    function formatMultiAgentToolUsage(toolUsage) {
      if (!Array.isArray(toolUsage) || toolUsage.length === 0) return ""
      return toolUsage
        .slice(-12)
        .map((item) => {
          const parts = [
            "[" + (item.status || "tool") + "] " + (item.name || "tool"),
            item.params ? "params: " + item.params : "",
            item.result ? "result: " + item.result : "",
          ].filter(Boolean)
          return parts.join("\\n")
        })
        .join("\\n\\n")
    }

    function formatMultiAgentSteering(steering) {
      if (!Array.isArray(steering) || steering.length === 0) return ""
      return steering
        .slice(-8)
        .map((item) => {
          const status = item.appliedToPrompt ? "已进入 prompt" : "未注入 SDK，已记录"
          return "[" + status + "] " + (item.text || "")
        })
        .join("\\n\\n")
    }

    function renderMultiTaskDetail(label, text, error) {
      const section = document.createElement("div")
      section.className = "multi-task-detail" + (error ? " error" : "")
      const title = document.createElement("div")
      title.className = "multi-task-detail-label"
      title.textContent = label
      const body = document.createElement("pre")
      body.className = "multi-task-detail-body"
      body.textContent = compactTaskOutput(text)
      section.appendChild(title)
      section.appendChild(body)
      return section
    }

    async function cancelMultiAgentTask(taskId) {
      if (!state.activeSessionId || !taskId) return
      try {
        const result = await postJson("/api/multi-agent/task/cancel", {
          sessionId: state.activeSessionId,
          taskId,
        })
        appendMeta("[多 Agent] " + (result.message || "已请求取消子任务。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    }

    async function steerMultiAgentTask(taskId, note) {
      if (!state.activeSessionId || !taskId || !note) return
      try {
        const result = await postJson("/api/multi-agent/task/steer", {
          note,
          sessionId: state.activeSessionId,
          taskId,
        })
        if (result.state) {
          updateMultiAgentRun(result.state, state.activeSessionId)
          publishWindowSync({
            kind: "multi_state",
            sessionId: state.activeSessionId,
            state: result.state,
          })
        }
        appendMeta("[多 Agent] " + (result.message || "已记录子 Agent 指导。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
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
          appendReadableParagraphs(container, paragraphLines)
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

    function appendReadableParagraphs(container, lines) {
      for (const paragraphLines of createReadableParagraphGroups(lines)) {
        const paragraph = document.createElement("p")
        appendParagraphContent(paragraph, paragraphLines)
        container.appendChild(paragraph)
      }
    }

    function createReadableParagraphGroups(lines) {
      const values = (Array.isArray(lines) ? lines : [String(lines || "")])
        .map((line) => String(line || ""))
      if (values.length !== 1) return [values]

      const chunks = splitLongReadableParagraph(values[0])
      return chunks.length > 1 ? chunks.map((chunk) => [chunk]) : [values]
    }

    function appendParagraphContent(parent, lines) {
      const values = Array.isArray(lines) ? lines : [String(lines || "")]
      values.forEach((line, index) => {
        if (index > 0) parent.appendChild(document.createElement("br"))
        appendInlineContent(parent, line)
      })
    }

    function splitLongReadableParagraph(text) {
      const value = String(text || "")
      if (
        value.length < READABLE_PARAGRAPH_MIN_CHARS ||
        !/[\\u3400-\\u9fff]/.test(value)
      ) {
        return [value]
      }

      const sentences = value.match(/[^。！？；]+[。！？；]*/g)
        ?.map((sentence) => sentence.trim())
        .filter(Boolean)
      if (!sentences || sentences.length < 3) return [value]

      const chunks = []
      let current = ""
      for (const sentence of sentences) {
        const next = current ? current + " " + sentence : sentence
        if (
          current &&
          current.length >= READABLE_PARAGRAPH_TARGET_CHARS &&
          next.length > READABLE_PARAGRAPH_MAX_CHARS
        ) {
          chunks.push(current)
          current = sentence
        } else {
          current = next
        }
      }
      if (current) chunks.push(current)

      return chunks.length > 1 ? chunks : [value]
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

    function appendActivityGroup(messages, index, options) {
      const activity = createActivityView(messages)
      if (activity.items.length === 0 && !activity.elapsedLabel && !activity.summary) return

      const groupKey = String(state.activeSessionId || "") + ":" + index
      const activeProcess = groupHasActiveRunTimer(messages)
      const details = document.createElement("details")
      details.className = "activity-group" + (activity.items.length === 0 ? " empty" : "")
      details.open = Boolean(
        options && options.open
          ? true
          : activeProcess || openActivityGroups.has(groupKey)
      )
      details.addEventListener("toggle", () => {
        if (details.open) {
          openActivityGroups.add(groupKey)
        } else {
          openActivityGroups.delete(groupKey)
        }
      })

      const summary = document.createElement("summary")
      const showActivityInline = !activity.elapsedLabel
      const title = document.createElement("span")
      title.className = "activity-title"
      title.textContent = activity.elapsedLabel || "处理过程"
      const latest = document.createElement("span")
      latest.className = "activity-latest"
      latest.textContent = activity.summary
      latest.hidden = !showActivityInline || !activity.summary
      const count = document.createElement("span")
      count.className = "activity-count"
      count.textContent = activity.countLabel
      count.hidden = !showActivityInline || !activity.countLabel
      summary.appendChild(title)
      summary.appendChild(latest)
      summary.appendChild(count)

      const processHeader = document.createElement("div")
      processHeader.className = "activity-process"
      const processTitle = document.createElement("span")
      processTitle.className = "activity-process-title"
      processTitle.textContent = "处理过程"
      const processLatest = document.createElement("span")
      processLatest.className = "activity-process-latest"
      processLatest.textContent = activity.summary
      processLatest.hidden = !activity.summary
      const processCount = document.createElement("span")
      processCount.className = "activity-process-count"
      processCount.textContent = activity.countLabel
      processCount.hidden = !activity.countLabel
      processHeader.appendChild(processTitle)
      processHeader.appendChild(processLatest)
      processHeader.appendChild(processCount)

      const items = document.createElement("div")
      items.className = "activity-items"
      for (const activityItem of activity.items) {
        const item = document.createElement("div")
        item.className = [
          "activity-item",
          activityItem.kind === "thought" ? "thought" : "",
          activityItem.level || "",
        ].filter(Boolean).join(" ")
        item.textContent = activityItem.text
        items.appendChild(item)
      }

      details.appendChild(summary)
      if (!showActivityInline && activity.items.length > 0) details.appendChild(processHeader)
      if (activity.items.length > 0) details.appendChild(items)
      els.messages.appendChild(details)
    }

    function groupHasActiveRunTimer(messages) {
      const activeTimer = streamingRunTimers.get(state.activeSessionId || "")
      return Boolean(activeTimer && messages.includes(activeTimer.message))
    }

    function createActivityView(messages) {
      const entries = messages
        .map((message, index) => parseActivityEntry(message.text, index))
        .filter(Boolean)

      if (entries.length === 0) {
        return { countLabel: "0 条", elapsedLabel: "", items: [], summary: "" }
      }

      const toolGroups = []
      const toolGroupByKey = new Map()
      const notes = []
      const seenNotes = new Set()

      for (const entry of entries) {
        if (entry.kind === "tool") {
          const key = [entry.kind, entry.status, entry.name, entry.detail].join("\\u0000")
          let group = toolGroupByKey.get(key)
          if (!group) {
            group = {
              count: 0,
              detail: entry.detail,
              firstIndex: entry.index,
              level: entry.level,
              name: entry.name,
              status: entry.status,
            }
            toolGroupByKey.set(key, group)
            toolGroups.push(group)
          }
          group.count += 1
          group.level = mergeActivityLevel(group.level, entry.level)
          continue
        }

        if (entry.kind === "timer") continue

        if (seenNotes.has(entry.text)) continue
        seenNotes.add(entry.text)
        notes.push(entry)
      }

      const items = [
        ...toolGroups.map((group) => ({
          index: group.firstIndex,
          kind: "tool",
          level: group.level,
          text: formatToolGroup(group),
        })),
        ...notes.map((note) => ({
          index: note.index,
          kind: note.kind,
          level: note.level,
          text: note.text,
        })),
      ].sort((left, right) => left.index - right.index)

      const summary = summarizeActivityEntries(entries, toolGroups)
      const timerEntry = latestMatching(entries, (entry) => entry.kind === "timer")
      const toolCount = toolGroups.reduce((count, group) => count + group.count, 0)
      const countableItemCount = items.filter((item) => item.kind !== "timer").length
      const countLabel =
        toolCount > 0
          ? "工具 " + toolCount + " 次 · " + countableItemCount + " 类"
          : countableItemCount > 0
            ? String(countableItemCount) + " 条"
            : ""

      return { countLabel, elapsedLabel: timerEntry ? timerEntry.label : "", items, summary }
    }

    function parseActivityEntry(text, index) {
      const value = compactText(text)
      if (!value) return null

      const toolMatch = /^\\[工具\\]\\s+(\\S+)\\s+(\\S+)(?:\\s+(.+))?$/.exec(value)
      if (toolMatch) {
        const detail = compactText(toolMatch[3] || "")
        return {
          detail,
          index,
          kind: "tool",
          level: activityStatusLevel(toolMatch[1]),
          name: toolMatch[2],
          status: toolMatch[1],
          text: value,
        }
      }

      const statusMatch = /^\\[(状态|任务|上下文)\\]\\s+(\\S+)(?:\\s+(.+))?$/.exec(value)
      if (statusMatch) {
        if (
          statusMatch[1] === "状态" &&
          !statusMatch[3] &&
          /^(CREATING|RUNNING|FINISHED)$/i.test(statusMatch[2])
        ) {
          return null
        }
        const statusLevel = activityStatusLevel(statusMatch[2])
        return {
          index,
          kind: "note",
          level: statusLevel === "normal" ? activityTextLevel(value) : statusLevel,
          text: value,
        }
      }

      const timerMatch = /^\\[计时\\]\\s+(.+)$/.exec(value)
      if (timerMatch) {
        return {
          index,
          kind: "timer",
          label: compactText(timerMatch[1] || ""),
          level: "normal",
          text: value,
        }
      }

      if (/^\\[开始\\]/.test(value)) return null

      const finishedMatch = /^\\[完成\\]\\s+(.+)$/.exec(value)
      if (finishedMatch && activityTextLevel(value) === "normal") return null

      if (value === "[思考]") return null

      const thinkingMatch = /^\\[思考\\]\\s*(.+)$/.exec(value)
      if (thinkingMatch) {
        return {
          index,
          kind: "thought",
          level: "normal",
          text: "思考 " + thinkingMatch[1],
        }
      }

      return {
        index,
        kind: "note",
        level: activityTextLevel(value),
        text: value,
      }
    }

    function formatToolGroup(group) {
      const count = group.count > 1 ? " ×" + group.count : ""
      const detail = group.detail ? " · " + formatToolDetail(group.detail) : ""
      return formatToolStatusText(group.status) + formatToolActionName(group.name, group.detail, true) + count + detail
    }

    function formatToolStatusText(status) {
      const value = String(status || "").toLowerCase()
      if (value === "requested") return "准备"
      if (value === "running") return "正在"
      if (value === "completed" || value === "success" || value === "succeeded") return "已"
      if (value === "error" || value === "failed" || value === "failure") return "失败："
      return value ? value + " " : ""
    }

    function formatToolActionName(name, detail, includeUnknownName) {
      const key = [name, detail].map((value) => String(value || "").toLowerCase()).join(" ")
      if (key.includes("grep") || key.includes("search")) return "搜索代码"
      if (key.includes("read")) return "读取文件"
      if (key.includes("list") || key.includes("glob")) return "查找文件"
      if (key.includes("edit") || key.includes("write") || key.includes("patch")) return "编辑文件"
      if (key.includes("shell") || key.includes("terminal") || key.includes("command") || key.includes("exec")) {
        return "运行命令"
      }
      const unknownName = includeUnknownName ? formatUnknownToolName(name) : ""
      return unknownName ? "调用工具 " + unknownName : "调用工具"
    }

    function formatUnknownToolName(name) {
      const value = compactText(name)
      return value ? value : ""
    }

    function formatToolDetail(detail) {
      const value = String(detail || "")
        .replace(/^·+\\s*/, "")
        .replace(/\\s*=>\\s*/g, " => ")
        .trim()
      return shortenInline(formatStructuredToolDetail(value) || value, 260)
    }

    function formatStructuredToolDetail(detail) {
      const normalized = String(detail || "")
        .replace(/\\\\?"/g, '"')
        .replace(/\\\\n/g, " ")
        .replace(/\\\\r/g, " ")
        .replace(/\\\\t/g, " ")
      const fieldLabels = [
        ["path", "path"],
        ["filePath", "path"],
        ["target_file", "path"],
        ["absolutePath", "path"],
        ["root", "root"],
        ["cwd", "cwd"],
        ["working_directory", "cwd"],
        ["pattern", "pattern"],
        ["query", "query"],
        ["command", "cmd"],
        ["cmd", "cmd"],
        ["tool", "tool"],
        ["name", "name"],
      ]
      const parts = []
      const seenLabels = new Set()

      for (const [key, label] of fieldLabels) {
        if (seenLabels.has(label)) continue
        const value = findJsonStringField(normalized, key)
        if (!value) continue
        seenLabels.add(label)
        parts.push(label + "=" + value)
      }

      return parts.join(" · ")
    }

    function findJsonStringField(text, key) {
      const pattern = new RegExp('"' + String(key || "") + '"\\\\s*:\\\\s*"([^"]+)"')
      const match = pattern.exec(text)
      return match ? compactText(match[1]) : ""
    }

    function summarizeActivityEntries(entries, toolGroups) {
      const attention = latestMatching(entries, (entry) => entry.level !== "normal")
      if (attention) return attention.text

      const latestNote = latestMatching(
        entries,
        (entry) => entry.kind !== "tool" && entry.kind !== "timer",
      )
      if (latestNote) return latestNote.text

      const toolCount = toolGroups.reduce((count, group) => count + group.count, 0)
      if (toolCount > 0) {
        const names = summarizeToolNames(toolGroups)
        return "工具调用 " + toolCount + " 次" + (names ? "：" + names : "")
      }

      const latestNonTimer = latestMatching(entries, (entry) => entry.kind !== "timer")
      return latestNonTimer ? latestNonTimer.text : ""
    }

    function summarizeToolNames(toolGroups) {
      const counts = new Map()
      for (const group of toolGroups) {
        counts.set(group.name, (counts.get(group.name) || 0) + group.count)
      }
      return Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([name, count]) => formatToolActionName(name) + " ×" + count)
        .filter((label) => !label.startsWith("调用工具 ×"))
        .join("，")
    }

    function latestMatching(entries, predicate) {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (predicate(entries[index])) return entries[index]
      }
      return null
    }

    function activityStatusLevel(status) {
      const value = String(status || "").toLowerCase()
      if (
        value === "error" ||
        value === "errored" ||
        value === "fail" ||
        value === "failed" ||
        value === "failure" ||
        value === "cancelled" ||
        value === "canceled"
      ) {
        return "error"
      }
      if (
        value === "retry" ||
        value === "retrying" ||
        value === "skipped" ||
        value === "warning" ||
        value === "warn"
      ) {
        return "warning"
      }
      return "normal"
    }

    function activityTextLevel(text) {
      const value = compactText(text).toLowerCase()
      if (
        value.includes("[错误]") ||
        value.includes("[失败]") ||
        value.includes("工具调用失败") ||
        value.includes("调用失败") ||
        value.includes("执行失败") ||
        value.includes("请求失败") ||
        value.includes("连接失败") ||
        value.includes("全部失败") ||
        /\\b(error|failed|cancelled|canceled)\\b/.test(value)
      ) {
        return "error"
      }
      if (
        value.includes("重试") ||
        value.includes("改用") ||
        /\\b(retry|retrying|skipped|warning|warn)\\b/.test(value)
      ) {
        return "warning"
      }
      return "normal"
    }

    function mergeActivityLevel(left, right) {
      if (left === "error" || right === "error") return "error"
      if (left === "warning" || right === "warning") return "warning"
      return "normal"
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
        value.startsWith("[计时]") ||
        value.startsWith("[开始]") ||
        value.startsWith("[完成]") ||
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

      if (!showOpenButton && state.activeProject && state.modelsLoaded) {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "primary"
        button.textContent = "新建会话"
        button.disabled = !state.activeProjectId || !state.modelsLoaded
        button.addEventListener("click", createNewSession)
        inner.appendChild(button)
      }

      wrapper.appendChild(inner)
      els.messages.appendChild(wrapper)
    }

    function appendMessage(kind, text, sessionId) {
      appendMessageObject({ kind, text }, sessionId, false)
    }

    function appendRunMessage(kind, text, sessionId) {
      appendMessageObject({ kind, text }, sessionId, true)
    }

    function appendMessageObject(message, sessionId, beforeQueuedTail) {
      const targetSessionId = sessionId || state.activeSessionId
      const messages = activeMessages(targetSessionId)
      const insertIndex = beforeQueuedTail ? firstQueuedTailIndex(messages) : -1
      if (insertIndex >= 0) {
        messages.splice(insertIndex, 0, message)
      } else {
        messages.push(message)
      }
      renderMessagesForSession(targetSessionId)
      schedulePersistMessages(targetSessionId)
    }

    function firstQueuedTailIndex(messages) {
      let index = messages.length
      while (index > 0 && isQueuedUserMessage(messages[index - 1])) {
        index -= 1
      }
      return index < messages.length ? index : -1
    }

    function appendMeta(text, isError, sessionId) {
      appendMessage(isError ? "meta error" : "meta", text, sessionId)
    }

    function enqueueAssistantText(sessionId, message, text) {
      if (!sessionId || !message || !text) return

      let queue = streamingAssistantQueues.get(sessionId)
      if (!queue || queue.message !== message) {
        if (queue && queue.timer) window.clearTimeout(queue.timer)
        queue = { message, pending: "", timer: 0 }
        streamingAssistantQueues.set(sessionId, queue)
      }

      queue.pending += String(text)
      pumpAssistantText(sessionId)
    }

    function pumpAssistantText(sessionId) {
      const queue = streamingAssistantQueues.get(sessionId)
      if (!queue || queue.timer || !queue.pending) return

      queue.timer = window.setTimeout(() => {
        queue.timer = 0
        const nextText = takeAssistantTextChunk(queue.pending)
        queue.pending = queue.pending.slice(nextText.length)
        queue.message.text += nextText
        renderMessagesForSession(sessionId)
        schedulePersistMessages(sessionId)

        if (queue.pending) {
          pumpAssistantText(sessionId)
        }
      }, ASSISTANT_STREAM_FRAME_MS)
    }

    function takeAssistantTextChunk(text) {
      const value = String(text || "")
      if (value.length <= ASSISTANT_STREAM_MAX_CHUNK) return value

      const newlineIndex = value.indexOf("\\n")
      if (
        newlineIndex >= ASSISTANT_STREAM_MIN_CHUNK &&
        newlineIndex <= ASSISTANT_STREAM_MAX_CHUNK
      ) {
        return value.slice(0, newlineIndex + 1)
      }

      const punctuationMatch = /[。！？.!?]\\s/.exec(value.slice(0, ASSISTANT_STREAM_MAX_CHUNK))
      if (punctuationMatch && punctuationMatch.index >= ASSISTANT_STREAM_MIN_CHUNK) {
        return value.slice(0, punctuationMatch.index + punctuationMatch[0].length)
      }

      const dynamicChunk = Math.min(
        ASSISTANT_STREAM_MAX_CHUNK,
        Math.max(ASSISTANT_STREAM_MIN_CHUNK, Math.ceil(value.length / 24))
      )
      return value.slice(0, dynamicChunk)
    }

    function flushAssistantQueue(sessionId, shouldRender) {
      const queue = streamingAssistantQueues.get(sessionId)
      if (!queue) return

      if (queue.timer) {
        window.clearTimeout(queue.timer)
      }
      if (queue.pending) {
        queue.message.text += queue.pending
        queue.pending = ""
        schedulePersistMessages(sessionId)
      }
      streamingAssistantQueues.delete(sessionId)
      if (shouldRender) renderMessagesForSession(sessionId)
    }

    function clearAssistantQueue(sessionId) {
      const queue = streamingAssistantQueues.get(sessionId)
      if (!queue) return

      if (queue.timer) {
        window.clearTimeout(queue.timer)
      }
      streamingAssistantQueues.delete(sessionId)
    }

    function updateThinking(text, sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (!targetSessionId) return

      const delta = String(text || "")
      if (!delta.trim()) return

      const messages = activeMessages(targetSessionId)
      let thought = streamingThoughts.get(targetSessionId)
      if (!thought || messages.indexOf(thought.message) === -1) {
        thought = {
          message: { kind: "activity", text: "" },
          text: "",
        }
        streamingThoughts.set(targetSessionId, thought)
        const insertIndex = firstQueuedTailIndex(messages)
        if (insertIndex >= 0) {
          messages.splice(insertIndex, 0, thought.message)
        } else {
          messages.push(thought.message)
        }
      }

      thought.text = appendThinkingDelta(thought.text, delta)
      thought.message.text = "[思考] " + compactActivityText(thought.text)
      renderMessagesForSession(targetSessionId)
      schedulePersistMessages(targetSessionId)
    }

    function appendThinkingDelta(current, delta) {
      const existing = String(current || "")
      const value = String(delta || "")
      if (!value.trim()) return existing
      if (!existing) return value.trimStart()
      if (/^\\s/.test(value)) return existing + value

      const trimmed = value.trim()
      if (/^[,.;:!?，。！？；：）\\]\\}]/.test(trimmed)) {
        return existing.replace(/\\s+$/g, "") + trimmed
      }
      if (/[（\\[\\{(]$/.test(existing.trimEnd())) {
        return existing.replace(/\\s+$/g, "") + trimmed
      }
      return existing.replace(/\\s+$/g, " ") + trimmed
    }

    function compactActivityText(text) {
      return String(text || "").replace(/[ \\t\\r\\n]+/g, " ").trim()
    }

    function finishThinking(sessionId) {
      if (!sessionId) {
        streamingThoughts.clear()
        return
      }
      streamingThoughts.delete(sessionId)
    }

    function markAssistantBoundary(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (targetSessionId) assistantBoundarySessions.add(targetSessionId)
    }

	    function appendAssistant(text, sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
	      const messages = activeMessages(targetSessionId)
      let streamingAssistant = streamingAssistants.get(targetSessionId)
      if (assistantBoundarySessions.has(targetSessionId)) {
        if (streamingAssistant && String(streamingAssistant.text || "").trim()) {
          streamingAssistants.delete(targetSessionId)
          streamingAssistant = null
        }
        assistantBoundarySessions.delete(targetSessionId)
      }
	      if (!streamingAssistant || messages.indexOf(streamingAssistant) === -1) {
	        streamingAssistant = { kind: "assistant", text: "" }
        streamingAssistants.set(targetSessionId, streamingAssistant)
        const insertIndex = firstQueuedTailIndex(messages)
        if (insertIndex >= 0) {
          messages.splice(insertIndex, 0, streamingAssistant)
        } else {
	        messages.push(streamingAssistant)
        }
      }
      enqueueAssistantText(targetSessionId, streamingAssistant, text)
	    }

	    function updateMultiAgentRun(run, sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
	      const messages = activeMessages(targetSessionId)
      let streamingMultiRun = streamingMultiRuns.get(targetSessionId)
	      if (!streamingMultiRun || messages.indexOf(streamingMultiRun) === -1) {
	        streamingMultiRun = { kind: "multi", text: "{}" }
        streamingMultiRuns.set(targetSessionId, streamingMultiRun)
        const insertIndex = firstQueuedTailIndex(messages)
        if (insertIndex >= 0) {
          messages.splice(insertIndex, 0, streamingMultiRun)
        } else {
	        messages.push(streamingMultiRun)
        }
	      }
	      streamingMultiRun.text = JSON.stringify(run || {})
      renderMessagesForSession(targetSessionId)
	      schedulePersistMessages(targetSessionId)
	    }

    function startRunTimer(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (!targetSessionId) return
      discardRunTimer(targetSessionId)

      const message = { kind: "activity", text: "" }
      const messages = activeMessages(targetSessionId)
      const insertIndex = firstQueuedTailIndex(messages)
      if (insertIndex >= 0) {
        messages.splice(insertIndex, 0, message)
      } else {
        messages.push(message)
      }
      const timer = {
        interval: 0,
        message,
        sessionId: targetSessionId,
        startedAt: Date.now(),
      }
      streamingRunTimers.set(targetSessionId, timer)
      updateRunTimerMessage(targetSessionId, false)
      schedulePersistMessages(targetSessionId)
      timer.interval = window.setInterval(
        () => updateRunTimerMessage(targetSessionId, false),
        1000
      )
    }

    function finishRunTimer(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId
      if (!targetSessionId) {
        for (const runningSessionId of Array.from(streamingRunTimers.keys())) {
          finishRunTimer(runningSessionId)
        }
        return
      }

      if (!streamingRunTimers.has(targetSessionId)) return
      updateRunTimerMessage(targetSessionId, true)
      discardRunTimer(targetSessionId)
    }

    function discardRunTimer(sessionId) {
      if (!sessionId) {
        for (const runningSessionId of Array.from(streamingRunTimers.keys())) {
          discardRunTimer(runningSessionId)
        }
        return
      }

      const timer = streamingRunTimers.get(sessionId)
      if (timer && timer.interval) {
        window.clearInterval(timer.interval)
      }
      streamingRunTimers.delete(sessionId)
    }

    function updateRunTimerMessage(targetSessionId, persist) {
      const streamingRunTimer = streamingRunTimers.get(targetSessionId)
      if (!streamingRunTimer) return

      const sessionId = streamingRunTimer.sessionId
      const messages = messagesBySession[sessionId] || []
      if (messages.indexOf(streamingRunTimer.message) === -1) {
        discardRunTimer(sessionId)
        return
      }

      const nextText =
        "[计时] 已处理 " + formatElapsedDuration(Date.now() - streamingRunTimer.startedAt)
      const changed = streamingRunTimer.message.text !== nextText
      if (changed) {
        streamingRunTimer.message.text = nextText
      }

      if (changed || persist) renderMessagesForSession(sessionId)
      if (persist) {
        schedulePersistMessages(sessionId)
      }
    }

    function resetStreamingState(sessionId) {
      if (!sessionId) {
        for (const queuedSessionId of Array.from(streamingAssistantQueues.keys())) {
          clearAssistantQueue(queuedSessionId)
        }
        streamingAssistants.clear()
        streamingMultiRuns.clear()
        streamingThoughts.clear()
        assistantBoundarySessions.clear()
        discardRunTimer()
        return
      }

      clearAssistantQueue(sessionId)
      streamingAssistants.delete(sessionId)
      streamingMultiRuns.delete(sessionId)
      finishThinking(sessionId)
      discardRunTimer(sessionId)
      assistantBoundarySessions.delete(sessionId)
    }

	    function formatAgentEvent(event) {
      if (event.type === "assistant_delta") return ""
      if (event.type === "thinking") {
        const text = compactText(event.text)
        return text ? "[思考] " + text : ""
      }
      if (event.type === "tool") {
        const detail = [event.params, event.result ? "=> " + event.result : ""]
          .map(compactText)
          .filter(Boolean)
          .join(" · ")
        const base = "[工具] " + [event.status, event.name].filter(Boolean).join(" ")
        return detail ? base + " · " + shortenInline(detail, 220) : base
      }
      if (event.type === "status") {
        if (event.status === "FINISHED") return ""
        const detail = formatEventDetail(event, 900)
        return "[状态] " + [event.status, detail].filter(Boolean).join(" ")
      }
      if (event.type === "task") {
        return "[任务] " + [event.status, event.text].filter(Boolean).join(" ")
      }
      if (event.type === "request") {
        return "[请求] 等待输入或审批 " + compactText(event.requestId || "")
      }
      if (event.type === "usage") {
        const usage = formatTokenUsage(event.usage)
        return usage ? "[用量] " + usage : ""
      }
      if (event.type === "compaction") {
        return "[上下文] " + [event.status, event.message].filter(Boolean).join(" ")
      }
      if (event.type === "result") {
        const status = String(event.status || "").toLowerCase()
        if (status === "finished" || status === "completed" || status === "success") return ""
        const detail = formatEventDetail(event, 1400)
        const details = [
          "status=" + event.status,
          event.durationMs ? "duration=" + formatDuration(event.durationMs) : "",
          formatTokenUsage(event.usage),
          detail ? "错误详情：" + detail : "",
        ].filter(Boolean)
        return "[完成] " + details.join(" ")
      }
      return ""
    }

    function formatTokenUsage(usage) {
      if (!usage) return ""
      return [
        usage.inputTokens ? "input=" + usage.inputTokens : "",
        usage.outputTokens ? "output=" + usage.outputTokens : "",
        usage.cacheReadTokens ? "cache_read=" + usage.cacheReadTokens : "",
        usage.cacheWriteTokens ? "cache_write=" + usage.cacheWriteTokens : "",
        usage.totalTokens ? "total=" + usage.totalTokens : "",
        usage.reasoningTokens ? "reasoning=" + usage.reasoningTokens : "",
      ].filter(Boolean).join(" · ")
    }

    function formatEventDetail(event, maxLength) {
      const detail = [
        event.message,
        event.error,
        event.details,
        event.detail,
        event.result,
        event.reason,
        event.errorCode ? "code=" + event.errorCode : "",
      ]
        .map(compactText)
        .filter(Boolean)
        .join(" · ")

      return detail ? shortenInline(detail, maxLength) : ""
    }

    function renderAgentEvent(event, sessionId) {
      if (event.type === "assistant_delta") {
        appendAssistant(event.text, sessionId)
        return
      }

      if (event.type === "thinking") {
        flushAssistantQueue(sessionId, true)
        updateThinking(event.text, sessionId)
        markAssistantBoundary(sessionId)
        return
      }

      const text = formatAgentEvent(event)
      if (text) {
        flushAssistantQueue(sessionId, true)
        appendRunMessage(isActivityEvent(event) ? "activity" : "meta", text, sessionId)
        if (isActivityEvent(event)) markAssistantBoundary(sessionId)
      }
    }

    function isActivityEvent(event) {
      return (
        event.type === "thinking" ||
        event.type === "tool" ||
        event.type === "status" ||
        event.type === "task" ||
        event.type === "compaction" ||
        event.type === "result"
      )
    }

    function compactText(text) {
      return String(text || "").replace(/[ \\t\\r\\n]+/g, " ").trim()
    }

    function shortenInline(text, maxLength) {
      const value = String(text || "")
      if (value.length <= maxLength) return value
      return value.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…"
    }

    function formatDuration(ms) {
      if (ms < 1000) return ms + "ms"
      return (ms / 1000).toFixed(1) + "s"
    }

    function formatElapsedDuration(ms) {
      const totalSeconds = Math.max(0, Math.floor(Number(ms) / 1000))
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      if (hours > 0) return hours + "h " + minutes + "m " + seconds + "s"
      if (minutes > 0) return minutes + "m " + seconds + "s"
      return seconds + "s"
    }

    async function refreshStatus() {
      const response = await fetch("/api/status")
      const result = await response.json()
      applyState(result)
      startDevReload()
    }

    function startDevReload() {
      if (!state.devReload || devReloadSource || typeof EventSource === "undefined") {
        return
      }

      devReloadSource = new EventSource("/api/dev/events")
      devReloadSource.addEventListener("ready", () => {
        if (devReloadReady) {
          window.location.reload()
          return
        }

        devReloadReady = true
      })
      devReloadSource.onerror = () => {}
    }

    async function refreshModels() {
      const response = await fetch("/api/models")
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "加载模型失败")
      console.log("[coding-agent] /api/models", result)
      state = Object.assign({}, state, {
        hasApiKey:
          typeof result.hasApiKey === "boolean"
            ? result.hasApiKey
            : state.hasApiKey || Boolean(result.available),
        model: result.currentLabel || state.model,
        modelsLoaded: Boolean(result.available),
        selectedModel: result.current || state.selectedModel,
      })
      renderModelOptions(result.choices || [], result.current)
      updateAuthGate(result.message)
      updateControls()
    }

    function renderModelOptions(choices, current) {
      modelChoices = Array.isArray(choices) ? choices : []
      currentModel = current || null
      renderModelPicker()
    }

    function renderModelPicker() {
      const currentKey = modelSelectionKey(currentModel)
      const keepParamPopoverOpen = !els.modelParamPopover.hidden
      const groups = buildModelChoiceGroups(modelChoices)
      const currentChoice = findModelChoice(modelChoices, currentModel)
      const selectedGroupId = currentChoice?.value?.id || currentModel?.id || groups[0]?.id || ""
      els.modelList.textContent = ""
      els.modelParamList.textContent = ""
      els.modelSelect.dataset.modelId = selectedGroupId

      if (modelChoices.length === 0) {
        els.modelSelect.textContent = state.modelsLoaded ? "没有可用模型" : "加载模型"
        els.modelSelect.dataset.modelId = ""
        els.modelParamToggle.hidden = true
        renderModelMenu([], "")
        setModelMenuOpen(false)
        setModelParamPopoverOpen(false)
        return
      }

      els.modelSelect.textContent = selectedGroupId || "选择模型"
      els.modelSelect.title = selectedGroupId || "选择模型"
      renderModelMenu(groups, selectedGroupId)

      const selectedGroup = groups.find((group) => group.id === selectedGroupId)
      let variantChoices = selectedGroup?.choices || (currentModel ? [{ label: currentKey, value: currentModel }] : [])
      if (
        currentKey &&
        currentModel?.id === selectedGroupId &&
        !variantChoices.some((choice) => modelSelectionKey(choice.value) === currentKey)
      ) {
        variantChoices = [{ label: currentKey, value: currentModel }, ...variantChoices]
      }
      renderModelParamControls(variantChoices, currentKey, keepParamPopoverOpen)
    }

    function buildModelChoiceGroups(choices) {
      const byId = new Map()

      for (const choice of choices) {
        const id = choice?.value?.id || ""
        if (!id) continue
        if (!byId.has(id)) {
          byId.set(id, { id, choices: [] })
        }
        byId.get(id).choices.push(choice)
      }

      return Array.from(byId.values()).sort(compareModelGroups)
    }

    function renderModelMenu(groups, selectedGroupId) {
      els.modelList.textContent = ""
      const query = normalizeModelSearch(modelSearchQuery)
      const visibleGroups = query
        ? groups.filter((group) => normalizeModelSearch(group.id).includes(query))
        : groups

      if (visibleGroups.length === 0) {
        const empty = document.createElement("div")
        empty.className = "model-empty"
        empty.textContent = "没有匹配模型"
        els.modelList.appendChild(empty)
        return
      }

      for (const group of visibleGroups) {
        const option = document.createElement("button")
        const active = group.id === selectedGroupId
        option.type = "button"
        option.className = "model-option" + (active ? " active" : "")
        option.dataset.modelId = group.id
        option.setAttribute("role", "option")
        option.setAttribute("aria-selected", active ? "true" : "false")
        option.title = group.id

        const check = document.createElement("span")
        check.className = "model-option-check"
        check.textContent = active ? "✓" : ""
        option.appendChild(check)

        const label = document.createElement("span")
        label.className = "model-option-label"
        label.textContent = group.id
        option.appendChild(label)

        option.addEventListener("click", () => {
          selectModelGroup(group.id)
        })

        els.modelList.appendChild(option)
      }
    }

    function selectModelGroup(modelId) {
      if (isActiveSessionRunning()) return
      const group = buildModelChoiceGroups(modelChoices).find((item) => item.id === modelId)
      if (!group) return

      const currentKey = modelSelectionKey(currentModel)
      const choice =
        group.choices.find((item) => modelSelectionKey(item.value) === currentKey) ||
        group.choices[0]
      setModelMenuOpen(false)
      if (choice && modelSelectionKey(choice.value) !== currentKey) {
        void selectModel(choice.value)
      }
    }

    function compareModelGroups(left, right) {
      const leftRank = modelFamilyRank(left.id)
      const rightRank = modelFamilyRank(right.id)
      if (leftRank !== rightRank) return leftRank - rightRank

      const leftNumbers = modelSortNumbers(left.id)
      const rightNumbers = modelSortNumbers(right.id)
      const length = Math.max(leftNumbers.length, rightNumbers.length)
      for (let index = 0; index < length; index += 1) {
        const leftNumber = leftNumbers[index] ?? -1
        const rightNumber = rightNumbers[index] ?? -1
        if (leftNumber !== rightNumber) return rightNumber - leftNumber
      }

      return left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: "base" })
    }

    function modelFamilyRank(id) {
      const normalized = String(id).toLowerCase()
      if (normalized === "default") return 0
      if (normalized.startsWith("composer")) return 1
      if (normalized.startsWith("gpt")) return 2
      if (normalized.startsWith("claude")) return 3
      if (normalized.startsWith("gemini")) return 4
      if (normalized.startsWith("grok")) return 5
      if (normalized.startsWith("kimi")) return 6
      if (normalized.startsWith("glm")) return 7
      return 8
    }

    function modelSortNumbers(id) {
      return (String(id).match(/\\d+(?:\\.\\d+)?/g) || []).map(Number)
    }

    function normalizeModelSearch(value) {
      return String(value || "").trim().toLowerCase()
    }

    function renderModelParamControls(choices, currentKey, keepOpen) {
      els.modelParamList.textContent = ""
      const activeChoice =
        choices.find((choice) => modelSelectionKey(choice.value) === currentKey) ||
        choices[0]
      const stats = collectVariantParamStats(choices)
      const paramIds = orderedParamIds(
        Array.from(stats.entries())
          .filter((entry) => entry[1].values.length > 1)
          .map((entry) => entry[0])
      )

      els.modelParamToggle.hidden = paramIds.length === 0
      if (paramIds.length === 0 || !activeChoice) {
        setModelParamPopoverOpen(false)
        return
      }

      const activeParams = modelParamMap(activeChoice.value)
      els.modelParamToggle.textContent = modelParamSummary(activeChoice.value, paramIds)

      for (const paramId of paramIds) {
        appendModelParamRow(paramId, stats.get(paramId).values, activeParams)
      }

      setModelParamPopoverOpen(keepOpen)
    }

    function collectVariantParamStats(choices) {
      const stats = new Map()

      for (const choice of choices) {
        for (const param of choice.value?.params || []) {
          const id = String(param.id)
          if (!stats.has(id)) {
            stats.set(id, { values: [], valueSet: new Set() })
          }
          addParamValue(stats.get(id), String(param.value))
        }
      }

      for (const [id, stat] of stats.entries()) {
        if (choices.some((choice) => modelParamValue(choice.value, id) === "")) {
          addParamValue(stat, "")
        }
        stat.values = sortModelParamValues(id, stat.values)
      }

      return stats
    }

    function addParamValue(stat, value) {
      if (stat.valueSet.has(value)) return
      stat.valueSet.add(value)
      stat.values.push(value)
    }

    function appendModelParamRow(paramId, values, activeParams) {
      const row = document.createElement("div")
      row.className = "model-param-row"

      const name = document.createElement("div")
      name.className = "model-param-name"
      name.textContent = modelParamName(paramId)
      row.appendChild(name)

      const options = document.createElement("div")
      options.className = "model-param-segment"
      const activeValue = activeParams.get(paramId) || ""

      if (isBooleanParamValues(values)) {
        const button = document.createElement("button")
        const nextValue = activeValue === "true" ? "false" : "true"
        button.type = "button"
        button.className = "model-param-switch" + (activeValue === "true" ? " active" : "")
        button.setAttribute("aria-pressed", activeValue === "true" ? "true" : "false")
        button.setAttribute("aria-label", modelParamName(paramId) + " " + formatModelParamValue(activeValue))
        button.title = formatModelParam({ id: paramId, value: activeValue })
        button.addEventListener("click", () => {
          selectModelParamValue(paramId, nextValue)
        })
        options.appendChild(button)
      } else {
        for (const value of values) {
          const button = document.createElement("button")
          button.type = "button"
          button.className = "model-param-choice" + (value === activeValue ? " active" : "")
          button.textContent = formatModelParamValue(value)
          button.title = formatModelParam({ id: paramId, value })
          button.setAttribute("aria-pressed", value === activeValue ? "true" : "false")
          button.addEventListener("click", () => {
            selectModelParamValue(paramId, value)
          })
          options.appendChild(button)
        }
      }

      row.appendChild(options)
      els.modelParamList.appendChild(row)
    }

    function selectModelParamValue(paramId, value) {
      if (isActiveSessionRunning()) return
      const group = buildModelChoiceGroups(modelChoices).find((item) => item.id === els.modelSelect.dataset.modelId)
      if (!group) return

      const currentKey = modelSelectionKey(currentModel)
      const activeChoice =
        group.choices.find((choice) => modelSelectionKey(choice.value) === currentKey) ||
        group.choices[0]
      const nextChoice = findClosestModelParamChoice(group.choices, activeChoice.value, paramId, value)
      if (nextChoice && modelSelectionKey(nextChoice.value) !== currentKey) {
        void selectModel(nextChoice.value)
      }
    }

    function findClosestModelParamChoice(choices, currentValue, paramId, value) {
      const desired = modelParamMap(currentValue)
      if (value) {
        desired.set(paramId, value)
      } else {
        desired.delete(paramId)
      }

      let bestChoice = null
      let bestScore = -Infinity

      for (let index = 0; index < choices.length; index += 1) {
        const choice = choices[index]
        const params = modelParamMap(choice.value)
        if ((params.get(paramId) || "") !== value) {
          continue
        }

        let score = -index / 1000
        for (const [id, desiredValue] of desired.entries()) {
          const actualValue = params.get(id) || ""
          score += actualValue === desiredValue ? 4 : -2
        }
        for (const id of params.keys()) {
          if (!desired.has(id) && id !== paramId) {
            score -= 1
          }
        }

        if (score > bestScore) {
          bestScore = score
          bestChoice = choice
        }
      }

      return bestChoice
    }

    function setModelParamPopoverOpen(open) {
      const shouldOpen = Boolean(open) && !els.modelParamToggle.hidden
      els.modelParamPopover.hidden = !shouldOpen
      els.modelParamToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false")
    }

    function setModelMenuOpen(open) {
      const shouldOpen = Boolean(open) && modelChoices.length > 0
      els.modelMenu.hidden = !shouldOpen
      els.modelSelect.setAttribute("aria-expanded", shouldOpen ? "true" : "false")
      if (shouldOpen) {
        els.modelSearch.value = modelSearchQuery
        window.requestAnimationFrame(() => {
          els.modelSearch.focus()
          els.modelSearch.select()
        })
      }
    }

    function modelParamSummary(model, paramIds) {
      const params = modelParamMap(model)
      const values = paramIds
        .map((id) => params.get(id) || "")
        .filter(Boolean)
        .slice(0, 2)

      return values.length > 0 ? values.join(" · ") : "参数"
    }

    function isBooleanParamValues(values) {
      return values.length === 2 && values.includes("true") && values.includes("false")
    }

    function orderedParamIds(ids) {
      const priority = ["context", "reasoning", "effort", "thinking", "fast", "cyber"]
      return ids.slice().sort((left, right) => {
        const leftIndex = priority.indexOf(String(left))
        const rightIndex = priority.indexOf(String(right))
        const normalizedLeft = leftIndex === -1 ? priority.length : leftIndex
        const normalizedRight = rightIndex === -1 ? priority.length : rightIndex
        return normalizedLeft - normalizedRight || String(left).localeCompare(String(right))
      })
    }

    function sortModelParamValues(paramId, values) {
      const priorityByParam = {
        context: ["200k", "272k", "300k", "1m"],
        reasoning: ["none", "low", "medium", "high", "extra-high", "xhigh", "max"],
        effort: ["low", "medium", "high", "xhigh", "max"],
        thinking: ["false", "true"],
        fast: ["false", "true"],
        cyber: ["false", "true"],
      }
      const priority = priorityByParam[paramId] || []
      return values.slice().sort((left, right) => {
        if (left === "") return -1
        if (right === "") return 1
        const leftIndex = priority.indexOf(left)
        const rightIndex = priority.indexOf(right)
        const normalizedLeft = leftIndex === -1 ? priority.length : leftIndex
        const normalizedRight = rightIndex === -1 ? priority.length : rightIndex
        return normalizedLeft - normalizedRight || String(left).localeCompare(String(right), undefined, { numeric: true })
      })
    }

    function modelParamMap(model) {
      return new Map((model?.params || []).map((param) => [String(param.id), String(param.value)]))
    }

    function modelParamValue(model, paramId) {
      return modelParamMap(model).get(paramId) || ""
    }

    function modelParamName(paramId) {
      const names = {
        context: "上下文",
        reasoning: "推理",
        effort: "强度",
        thinking: "思考",
        fast: "快速",
        cyber: "Cyber",
      }
      return names[paramId] || paramId
    }

    function formatModelParamValue(value) {
      if (value === "") return "默认"
      if (value === "true") return "开"
      if (value === "false") return "关"
      return String(value).replace(/-/g, " ")
    }

    function formatModelParam(param) {
      return String(param.id) + "=" + formatModelParamValue(String(param.value))
    }

    async function selectModel(model) {
      if (!model || isActiveSessionRunning()) return
      if (activeSessionHasRunHistory() && !window.confirm(MODEL_SWITCH_SESSION_WARNING)) {
        return
      }
      try {
        const result = await postJson("/api/model", { model })
        currentModel = result.current || model
        state = Object.assign({}, state, {
          model: result.currentLabel || state.model,
          selectedModel: currentModel,
        })
        applyState(result)
        renderModelPicker()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
        await refreshModels().catch(() => {})
      }
    }

    function findModelChoice(choices, model) {
      const key = modelSelectionKey(model)
      return choices.find((choice) => modelSelectionKey(choice.value) === key) || null
    }

    function modelSelectionKey(model) {
      if (!model || !model.id) return ""
      const params = (model.params || [])
        .slice()
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))
        .map((param) => String(param.id) + "=" + String(param.value))
        .join("&")
      return params ? model.id + "?" + params : model.id
    }

    function activeSessionHasRunHistory() {
      const sessionId = state.activeSessionId
      if (!sessionId) return false
      return activeMessages(sessionId).some(isRunHistoryMessage)
    }

    function isRunHistoryMessage(message) {
      const tokens = messageKindTokens(message)
      return tokens.some((token) =>
        token === "user" ||
        token === "assistant" ||
        token === "activity" ||
        token === "multi"
      )
    }

    async function refreshChanges(sessionId) {
      const targetSessionId = sessionId || state.activeSessionId || ""
      const url = targetSessionId
        ? "/api/changes?sessionId=" + encodeURIComponent(targetSessionId)
        : "/api/changes"
      const response = await fetch(url)
      const changes = await response.json()
      if (targetSessionId && targetSessionId !== state.activeSessionId) return
      renderChanges(changes)
    }

    function setReviewMode(mode) {
      reviewMode = normalizeReviewMode(mode)
      const browser = reviewMode === "browser"
      const artifacts = reviewMode === "artifacts"
      const terminal = reviewMode === "terminal"
      const extensions = reviewMode === "extensions"
      const memory = reviewMode === "memory"
      const automations = reviewMode === "automations"
      els.reviewWorkspace.hidden = browser || artifacts || terminal || extensions || memory || automations
      els.browserWorkspace.hidden = !browser
      els.artifactsWorkspace.hidden = !artifacts
      els.terminalWorkspace.hidden = !terminal
      els.extensionsWorkspace.hidden = !extensions
      els.memoryWorkspace.hidden = !memory
      els.automationsWorkspace.hidden = !automations
      els.changesSummary.hidden = browser || artifacts || terminal || extensions || memory || automations
      els.changesTab.classList.toggle(
        "active",
        !browser && !artifacts && !terminal && !extensions && !memory && !automations
      )
      els.browserTab.classList.toggle("active", browser)
      els.artifactsTab.classList.toggle("active", artifacts)
      els.terminalTab.classList.toggle("active", terminal)
      els.extensionsTab.classList.toggle("active", extensions)
      els.memoryTab.classList.toggle("active", memory)
      els.automationsTab.classList.toggle("active", automations)
      if (terminal) void refreshTerminalList()
      if (browser && els.browserInspection.childElementCount === 0) {
        renderBrowserInspection(latestBrowserInspection)
      }
      if (extensions) void refreshExtensions()
      if (memory) void refreshMemory()
      if (automations) void refreshAutomations()
      persistReviewPanelPrefs()
      updateControls()
    }

    function openBrowserPreview(url) {
      const normalized = normalizeBrowserUrl(url)
      if (!normalized) return
      els.browserUrl.value = normalized
      els.browserFrame.src = normalized
      browserDraftPoint = null
      browserComments = []
      latestBrowserInspection = null
      renderBrowserInspection()
      renderBrowserComments()
      setReviewMode("browser")
      updateControls()
    }

    async function previewArtifact() {
      if (!state.activeSessionId || artifactBusy) return
      const artifactPath = els.artifactPath.value.trim()
      if (!artifactPath) return
      artifactBusy = true
      updateControls()
      renderArtifactPreview({ loading: true })
      try {
        const url =
          "/api/artifacts/preview?sessionId=" +
          encodeURIComponent(state.activeSessionId) +
          "&path=" +
          encodeURIComponent(artifactPath)
        const response = await fetch(url)
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "产物预览失败")
        renderArtifactPreview(result)
      } catch (error) {
        renderArtifactPreview({ error: error.message || String(error) })
      } finally {
        artifactBusy = false
        updateControls()
      }
    }

    function renderArtifactPreview(artifact) {
      els.artifactPreview.textContent = ""
      if (!artifact || artifact.loading) {
        const message = document.createElement("div")
        message.textContent = artifact && artifact.loading ? "正在预览..." : "输入工作区内文件路径。"
        els.artifactPreview.appendChild(message)
        return
      }
      if (artifact.error) {
        const error = document.createElement("div")
        error.className = "artifact-error"
        error.textContent = artifact.error
        els.artifactPreview.appendChild(error)
        return
      }

      const meta = document.createElement("div")
      meta.className = "artifact-meta"
      ;[
        artifact.path,
        artifact.kind,
        artifact.contentType,
        formatBytes(artifact.size),
        artifact.truncated ? "已截断" : "",
      ].filter(Boolean).forEach((item) => {
        const span = document.createElement("span")
        span.textContent = item
        meta.appendChild(span)
      })
      els.artifactPreview.appendChild(meta)

      if (artifact.kind === "image" && artifact.previewUrl) {
        const image = document.createElement("img")
        image.src = artifact.previewUrl
        image.alt = artifact.name || artifact.path || "artifact"
        els.artifactPreview.appendChild(image)
        return
      }
      if (artifact.kind === "pdf" && artifact.previewUrl) {
        const frame = document.createElement("iframe")
        frame.src = artifact.previewUrl
        frame.title = artifact.name || artifact.path || "PDF 预览"
        els.artifactPreview.appendChild(frame)
        return
      }
      if (artifact.kind === "csv" && Array.isArray(artifact.rows)) {
        const table = document.createElement("table")
        const body = document.createElement("tbody")
        for (const row of artifact.rows) {
          const tr = document.createElement("tr")
          for (const cell of row) {
            const td = document.createElement("td")
            td.textContent = cell
            tr.appendChild(td)
          }
          body.appendChild(tr)
        }
        table.appendChild(body)
        els.artifactPreview.appendChild(table)
        return
      }

      const pre = document.createElement("pre")
      pre.textContent = artifact.textPreview || "此类型暂不支持内联预览。"
      els.artifactPreview.appendChild(pre)
    }

    function normalizeBrowserUrl(value) {
      const raw = String(value || "").trim()
      if (!raw) return ""
      if (/^(localhost|127\\.0\\.0\\.1|\\[::1\\])(?::\\d+)?(?:\\/|$)/.test(raw)) {
        return "http://" + raw
      }
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw
      return "https://" + raw
    }

    function browserViewport() {
      const rect = els.browserStage.getBoundingClientRect()
      return {
        height: Math.max(240, Math.round(rect.height || 720)),
        width: Math.max(320, Math.round(rect.width || 1280)),
      }
    }

    async function inspectBrowserPage() {
      if (!state.activeSessionId) return
      const url = normalizeBrowserUrl(els.browserUrl.value || els.browserFrame.src)
      if (!url) return

      els.browserInspectBtn.disabled = true
      els.browserInspectBtn.textContent = "检查中"
      renderBrowserInspection({ loading: true, url })
      try {
        const result = await postJson("/api/browser/inspect", {
          sessionId: state.activeSessionId,
          url,
          viewport: browserViewport(),
        })
        applyState(result)
        latestBrowserInspection = result.inspection || null
        renderBrowserInspection(latestBrowserInspection)
      } catch (error) {
        latestBrowserInspection = null
        renderBrowserInspection({ error: error.message || String(error), url })
      } finally {
        els.browserInspectBtn.textContent = "检查"
        updateControls()
      }
    }

    async function enablePlaywrightMcp() {
      if (!state.activeSessionId) return
      els.browserMcpBtn.disabled = true
      els.browserMcpBtn.textContent = "启用中"
      try {
        const result = await postJson("/api/browser/playwright-mcp", {
          sessionId: state.activeSessionId,
        })
        applyState(result)
        const target = result.playwrightMcp && result.playwrightMcp.configPath
          ? result.playwrightMcp.configPath
          : ".coding-agent/extensions.json"
        renderBrowserInspection({
          info: "已写入 Playwright MCP 配置：" + target + "。下一次 agent 运行会加载 browser tools。",
          url: els.browserFrame.src || normalizeBrowserUrl(els.browserUrl.value),
        })
      } catch (error) {
        renderBrowserInspection({
          error: error.message || String(error),
          url: els.browserFrame.src || normalizeBrowserUrl(els.browserUrl.value),
        })
      } finally {
        els.browserMcpBtn.textContent = "启用 MCP"
        updateControls()
      }
    }

    function setBrowserAnnotating(enabled) {
      browserAnnotating = Boolean(enabled)
      els.browserAnnotateBtn.classList.toggle("active", browserAnnotating)
      els.browserAnnotateBtn.setAttribute("aria-pressed", browserAnnotating ? "true" : "false")
      els.browserStage.classList.toggle("annotating", browserAnnotating)
    }

    function draftBrowserPoint(event) {
      if (!browserAnnotating) return
      const rect = els.browserOverlay.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      browserDraftPoint = {
        x: Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10,
        y: Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10,
      }
      els.browserFeedback.placeholder =
        "描述标注点 " + browserDraftPoint.x + "%, " + browserDraftPoint.y + "% 的问题"
      els.browserFeedback.focus()
      renderBrowserComments()
    }

    function submitBrowserFeedback() {
      const text = els.browserFeedback.value.trim()
      const url = els.browserFrame.src || normalizeBrowserUrl(els.browserUrl.value)
      if (!text || !url || !state.activeSessionId) return
      const comment = {
        id: ++browserCommentId,
        point: browserDraftPoint,
        screenshot:
          latestBrowserInspection &&
          latestBrowserInspection.url === url &&
          latestBrowserInspection.screenshot
            ? latestBrowserInspection.screenshot
            : null,
        text,
        url,
        viewport: browserViewport(),
      }
      browserComments.push(comment)
      browserDraftPoint = null
      els.browserFeedback.value = ""
      els.browserFeedback.placeholder = "记录这个页面上的视觉问题"
      appendBrowserCommentToPrompt(comment)
      renderBrowserComments()
      updateControls()
    }

    function appendBrowserCommentToPrompt(comment) {
      const point = comment.point
        ? " @ " + comment.point.x + "%, " + comment.point.y + "%"
        : ""
      const block = [
        "浏览器视觉反馈：" + comment.url + point,
        "视口：" + comment.viewport.width + "x" + comment.viewport.height,
        comment.screenshot ? "截图：" + comment.screenshot.relativePath : "",
        comment.text,
      ].filter(Boolean).join("\\n")
      appendPromptBlock(block)
    }

    function appendPromptBlock(block) {
      els.prompt.value = [els.prompt.value.trim(), block].filter(Boolean).join("\\n\\n")
      els.prompt.focus()
      updateControls()
    }

    function renderBrowserInspection(inspection) {
      els.browserInspection.textContent = ""
      if (!inspection) {
        const empty = document.createElement("div")
        empty.className = "browser-inspection-empty"
        empty.textContent = "检查 localhost 或 workspace 内 file 页面后，结果会自动带入下一次 agent 请求。"
        els.browserInspection.appendChild(empty)
        return
      }

      if (inspection.loading || inspection.error || inspection.info) {
        const box = document.createElement("div")
        box.className =
          "browser-inspection-message" +
          (inspection.error ? " error" : inspection.loading ? " loading" : "")
        box.textContent = inspection.error || inspection.info || "正在检查 " + inspection.url
        els.browserInspection.appendChild(box)
        return
      }

      const header = document.createElement("div")
      header.className = "browser-inspection-header"
      const title = document.createElement("strong")
      title.textContent =
        inspection.dom && inspection.dom.title ? inspection.dom.title : inspection.url
      const meta = document.createElement("span")
      meta.textContent = [
        inspection.status ? "HTTP " + inspection.status : "file",
        inspection.viewport
          ? inspection.viewport.width + "x" + inspection.viewport.height
          : "",
      ].filter(Boolean).join(" · ")
      header.appendChild(title)
      header.appendChild(meta)
      els.browserInspection.appendChild(header)

      if (inspection.screenshot && inspection.screenshot.previewUrl) {
        const image = document.createElement("img")
        image.className = "browser-inspection-shot"
        image.src = inspection.screenshot.previewUrl
        image.alt = "页面截图"
        els.browserInspection.appendChild(image)
      }

      const facts = []
      if (inspection.dom && inspection.dom.description) {
        facts.push("描述：" + inspection.dom.description)
      }
      if (inspection.dom && inspection.dom.headings && inspection.dom.headings.length > 0) {
        facts.push("标题：" + inspection.dom.headings.slice(0, 4).join(" / "))
      }
      if (inspection.resourceIssues && inspection.resourceIssues.length > 0) {
        facts.push(
          "资源问题：" +
            inspection.resourceIssues
              .slice(0, 5)
              .map((issue) => issue.message)
              .join("；")
        )
      }
      if (inspection.warnings && inspection.warnings.length > 0) {
        facts.push("提示：" + inspection.warnings.slice(0, 3).join("；"))
      }
      for (const fact of facts) {
        const item = document.createElement("div")
        item.className = "browser-inspection-fact"
        item.textContent = fact
        els.browserInspection.appendChild(item)
      }
      appendBrowserResourceChecks(inspection.resourceChecks || [])
    }

    function appendBrowserResourceChecks(resourceChecks) {
      if (!Array.isArray(resourceChecks) || resourceChecks.length === 0) return
      const section = document.createElement("div")
      section.className = "browser-resource-checks"
      const header = document.createElement("strong")
      header.textContent = formatBrowserResourceSummary(resourceChecks)
      section.appendChild(header)
      const maxDuration = Math.max(
        1,
        ...resourceChecks.map((check) =>
          typeof check.durationMs === "number" ? check.durationMs : 0
        )
      )
      for (const check of resourceChecks.slice(0, 12)) {
        const row = document.createElement("div")
        row.className = "browser-resource-row " + (check.type || "ok")
        const status = document.createElement("span")
        status.className = "browser-resource-status"
        status.textContent = [
          check.kind || "resource",
          check.status || check.type || "",
        ].filter(Boolean).join(" ")
        const url = document.createElement("span")
        url.className = "browser-resource-url"
        url.textContent = check.url || ""
        const bar = document.createElement("span")
        const duration = typeof check.durationMs === "number" ? check.durationMs : 0
        bar.className = "browser-resource-waterfall"
        bar.style.setProperty(
          "--resource-duration-ratio",
          String(Math.max(0.04, Math.min(1, duration / maxDuration)))
        )
        const meta = document.createElement("span")
        meta.className = "browser-resource-meta"
        meta.textContent = [
          typeof check.durationMs === "number" ? check.durationMs + "ms" : "",
          typeof check.contentLength === "number" ? formatBytes(check.contentLength) : "",
          check.contentType || "",
          check.error || "",
        ].filter(Boolean).join(" · ")
        row.appendChild(status)
        row.appendChild(url)
        row.appendChild(bar)
        row.appendChild(meta)
        section.appendChild(row)
      }
      els.browserInspection.appendChild(section)
    }

    function formatBrowserResourceSummary(resourceChecks) {
      const total = resourceChecks.length
      const issues = resourceChecks.filter((check) => check.type && check.type !== "ok").length
      const durations = resourceChecks
        .map((check) => (typeof check.durationMs === "number" ? check.durationMs : 0))
        .filter((value) => value > 0)
      const maxDuration = durations.length ? Math.max(...durations) : 0
      return [
        "Static network waterfall",
        total + " resources",
        String(total - issues) + " ok",
        issues ? String(issues) + " issue" : "",
        maxDuration ? "max " + maxDuration + "ms" : "",
      ].filter(Boolean).join(" · ")
    }

    function formatBytes(bytes) {
      const value = Number(bytes) || 0
      if (value < 1024) return String(value) + " B"
      if (value < 1024 * 1024) return Math.round(value / 1024) + " KB"
      return (Math.round((value / (1024 * 1024)) * 10) / 10) + " MB"
    }

    function renderBrowserComments() {
      els.browserComments.textContent = ""
      els.browserOverlay.textContent = ""

      const draftPoints = browserDraftPoint
        ? [{ id: "draft", point: browserDraftPoint, text: "新标注" }]
        : []
      for (const item of browserComments.concat(draftPoints)) {
        if (item.point) {
          const marker = document.createElement("span")
          marker.className = "browser-marker" + (item.id === "draft" ? " draft" : "")
          marker.style.left = item.point.x + "%"
          marker.style.top = item.point.y + "%"
          marker.textContent = item.id === "draft" ? "+" : String(item.id)
          marker.title = item.text
          els.browserOverlay.appendChild(marker)
        }
      }

      if (browserComments.length === 0) {
        const empty = document.createElement("div")
        empty.className = "browser-comment-empty"
        empty.textContent = "打开页面后可开启标注并把视觉反馈发送到当前会话。"
        els.browserComments.appendChild(empty)
        return
      }

      for (const comment of browserComments) {
        const row = document.createElement("div")
        row.className = "browser-comment"
        const label = document.createElement("span")
        label.className = "browser-comment-label"
        label.textContent = comment.point
          ? "#" + comment.id + " " + comment.point.x + "%, " + comment.point.y + "%"
          : "#" + comment.id
        const body = document.createElement("span")
        body.textContent = comment.text
        row.appendChild(label)
        row.appendChild(body)
        els.browserComments.appendChild(row)
      }
    }

    function renderChanges(changes) {
      latestChanges = changes || { available: false, files: [], message: "请先打开项目。" }
      const files = Array.isArray(latestChanges.files) ? latestChanges.files : []
      const visibleFiles = filteredChangeFiles(files)

      if (files.length > 0 && !files.some((file) => file.path === selectedChangePath)) {
        selectedChangePath = files[0].path
      }
      if (
        visibleFiles.length > 0 &&
        !visibleFiles.some((file) => file.path === selectedChangePath)
      ) {
        selectedChangePath = visibleFiles[0].path
      }
      if (files.length === 0) {
        selectedChangePath = ""
      }

      updateChangesFloat(files)
      els.reviewWorkspace.classList.toggle("has-changes", files.length > 0)
      renderChangesSummary(latestChanges, files)
      renderChangeDiffs(visibleFiles)
      renderChangeTree(visibleFiles)
      if (state.activeSessionId) renderMessagesForSession(state.activeSessionId)
    }

    function updateChangesFloat(files) {
      const allFiles = Array.isArray(files)
        ? files
        : Array.isArray(latestChanges.files)
          ? latestChanges.files
          : []
      const shouldShow =
        Boolean(state.activeSessionId) &&
        Boolean(latestChanges.available) &&
        allFiles.length > 0

      els.changesFloat.hidden = !shouldShow
      if (!shouldShow) return

      const totals = sumChangeStats(allFiles)
      els.changesFloatLabel.textContent = "本次聊天 " + allFiles.length + " 个文件"
      els.changesFloatAdd.textContent = "+" + totals.additions
      els.changesFloatDel.textContent = "-" + totals.deletions
      els.changesFloat.setAttribute("aria-pressed", reviewPanelHidden ? "false" : "true")
    }

    function sumChangeStats(files) {
      return files.reduce(
        (sum, file) => {
          if (Number.isFinite(file.additions)) sum.additions += file.additions
          if (Number.isFinite(file.deletions)) sum.deletions += file.deletions
          return sum
        },
        { additions: 0, deletions: 0 }
      )
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

    function filteredChangeFiles(files) {
      const query = String(els.changesFilter.value || "").trim().toLowerCase()
      if (!query) return files
      return files.filter((file) => String(file.path || "").toLowerCase().includes(query))
    }

    function renderChangesSummary(changes, files) {
      els.changesSummary.textContent = ""

      if (!changes.available || files.length === 0) {
        const label = document.createElement("span")
        label.className = "review-summary-text"
        label.textContent = changes.message || "当前没有代码变更。"
        els.changesSummary.appendChild(label)
        appendGitStateSummary(changes)
        return
      }

      const totals = sumChangeStats(files)

      const label = document.createElement("span")
      label.className = "review-summary-text"
      label.textContent = "本次聊天 " + files.length + " 个文件"
      const additions = document.createElement("span")
      additions.className = "change-add"
      additions.textContent = "+" + totals.additions
      const deletions = document.createElement("span")
      deletions.className = "change-del"
      deletions.textContent = "-" + totals.deletions
      els.changesSummary.appendChild(label)
      els.changesSummary.appendChild(additions)
      els.changesSummary.appendChild(deletions)
      appendGitStateSummary(changes)
    }

    function appendGitStateSummary(changes) {
      const gitState = changes.git || {}
      if (!gitState.available || !gitState.message) return
      const label = document.createElement("span")
      label.className = "git-state-summary"
      label.textContent = gitState.message
      els.changesSummary.appendChild(label)
    }

    function renderChangeDiffs(files) {
      els.changesList.textContent = ""

      if (!latestChanges.available) {
        return
      }

      if (files.length === 0) {
        if (Array.isArray(latestChanges.files) && latestChanges.files.length > 0) {
          appendChangesEmpty(els.changesList, "没有匹配的变更文件。")
        }
        return
      }

      for (const file of files) {
        const article = document.createElement("article")
        article.className = "diff-file" + (file.path === selectedChangePath ? " active" : "")
        article.id = safeChangeId(file.path)

        const header = document.createElement("button")
        header.type = "button"
        header.className = "diff-file-header"
        header.addEventListener("click", () => selectChangeFile(file.path, false))

        const title = document.createElement("span")
        title.className = "diff-file-title"
        title.textContent = file.path
        const status = document.createElement("span")
        status.className = "diff-file-status"
        status.textContent = file.label || "变更"
        header.appendChild(status)
        header.appendChild(title)

        const statsText = formatChangeStats(file)
        if (statsText) {
          const stats = document.createElement("span")
          stats.className = "diff-file-stats"
          const add = document.createElement("span")
          add.className = "change-add"
          add.textContent = statsText.add
          const del = document.createElement("span")
          del.className = "change-del"
          del.textContent = statsText.del
          stats.appendChild(add)
          stats.appendChild(del)
          header.appendChild(stats)
        }

        article.appendChild(header)
        article.appendChild(renderGitFileActions(file))
        if (file.path === activeDiffCommentPath) {
          article.appendChild(renderDiffCommentForm(file))
        }

        const diffLines = Array.isArray(file.diffLines) ? file.diffLines : []
        if (diffLines.length === 0) {
          const empty = document.createElement("div")
          empty.className = "diff-empty"
          empty.textContent = "没有可显示的 diff。可能是二进制文件、目录或仅元数据变化。"
          article.appendChild(empty)
        } else {
          const lines = document.createElement("div")
          lines.className = "diff-lines"
          for (const line of diffLines) {
            lines.appendChild(renderDiffLine(file, line))
          }
          if (file.diffTruncated) {
            const truncated = document.createElement("div")
            truncated.className = "diff-line meta"
            const spacer = document.createElement("span")
            spacer.className = "diff-num"
            const text = document.createElement("span")
            text.className = "diff-code"
            text.textContent = "diff 内容较长，已截断显示。"
            truncated.appendChild(spacer)
            truncated.appendChild(spacer.cloneNode())
            truncated.appendChild(text)
            lines.appendChild(truncated)
          }
          article.appendChild(lines)
        }

        els.changesList.appendChild(article)
      }
    }

    function renderGitFileActions(file) {
      const row = document.createElement("div")
      row.className = "diff-file-actions"

      const flags = []
      if (file.staged) flags.push("已暂存")
      if (file.unstaged || file.untracked) flags.push("未暂存")
      const stateLabel = document.createElement("span")
      stateLabel.className = "diff-file-state"
      stateLabel.textContent = flags.length > 0 ? flags.join(" / ") : "无工作区差异"
      row.appendChild(stateLabel)

      const activeBusy = isActiveSessionRunning()
      const stageBtn = createGitFileActionButton(
        "暂存",
        "stage",
        file.path,
        gitBusy || activeBusy || !(file.unstaged || file.untracked)
      )
      const unstageBtn = createGitFileActionButton(
        "取消暂存",
        "unstage",
        file.path,
        gitBusy || activeBusy || !file.staged
      )
      const revertBtn = createGitFileActionButton(
        "撤销文件",
        "revert",
        file.path,
        gitBusy || activeBusy || !file.path,
        "danger"
      )
      const commentBtn = createDiffCommentButton(file.path, activeBusy)
      row.appendChild(stageBtn)
      row.appendChild(unstageBtn)
      row.appendChild(revertBtn)
      row.appendChild(commentBtn)
      return row
    }

    function createGitFileActionButton(label, action, filePath, disabled, tone) {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "git-file-action" + (tone ? " " + tone : "")
      button.textContent = label
      button.disabled = Boolean(disabled)
      button.addEventListener("click", () => runGitFileAction(filePath, action))
      return button
    }

    function createDiffCommentButton(filePath, activeBusy) {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "git-file-action"
      button.textContent = activeDiffCommentPath === filePath ? "收起反馈" : "反馈"
      button.disabled = Boolean(activeBusy || !state.activeSessionId || !filePath)
      button.addEventListener("click", () => toggleDiffComment(filePath))
      return button
    }

    function toggleDiffComment(filePath) {
      activeDiffCommentPath = activeDiffCommentPath === filePath ? "" : filePath
      renderChanges(latestChanges)
      if (activeDiffCommentPath) {
        const input = document.getElementById(safeDiffCommentId(activeDiffCommentPath))
        if (input) input.focus()
      }
    }

    function renderDiffCommentForm(file) {
      const form = document.createElement("form")
      form.className = "diff-comment-form"
      form.addEventListener("submit", (event) => {
        event.preventDefault()
        submitDiffComment(file, textarea.value)
      })

      const textarea = document.createElement("textarea")
      textarea.id = safeDiffCommentId(file.path)
      textarea.placeholder = "记录这个文件需要 agent 继续修改的地方"
      const actions = document.createElement("div")
      actions.className = "diff-comment-actions"
      const cancel = document.createElement("button")
      cancel.type = "button"
      cancel.textContent = "取消"
      cancel.addEventListener("click", () => {
        activeDiffCommentPath = ""
        renderChanges(latestChanges)
      })
      const submit = document.createElement("button")
      submit.type = "submit"
      submit.textContent = "加入输入"
      actions.appendChild(cancel)
      actions.appendChild(submit)
      form.appendChild(textarea)
      form.appendChild(actions)
      return form
    }

    function submitDiffComment(file, text) {
      const body = String(text || "").trim()
      if (!body) return
      appendPromptBlock([
        "代码审查反馈：" + file.path,
        body,
      ].join("\\n"))
      activeDiffCommentPath = ""
      renderChanges(latestChanges)
    }

    function renderDiffLine(file, line) {
      const kind = normalizeDiffKind(line.kind)
      const row = document.createElement("div")
      row.className = "diff-line " + kind

      const oldNumber = document.createElement("span")
      oldNumber.className = "diff-num"
      oldNumber.textContent = Number.isFinite(line.oldLine) ? String(line.oldLine) : ""
      const newNumber = document.createElement("span")
      newNumber.className = "diff-num"
      newNumber.textContent = Number.isFinite(line.newLine) ? String(line.newLine) : ""
      const code = document.createElement("span")
      code.className = "diff-code"
      if (kind === "hunk" && Number.isInteger(line.hunkIndex)) {
        code.classList.add("hunk-code")
        const text = document.createElement("span")
        text.className = "diff-hunk-text"
        text.textContent = line.text || " "
        code.appendChild(text)
        code.appendChild(renderHunkActions(file, line.hunkIndex))
      } else {
        code.textContent = line.text || " "
      }

      row.appendChild(oldNumber)
      row.appendChild(newNumber)
      row.appendChild(code)
      return row
    }

    function renderHunkActions(file, hunkIndex) {
      const actions = document.createElement("span")
      actions.className = "diff-hunk-actions"
      const activeBusy = isActiveSessionRunning()
      const disabled =
        gitBusy ||
        activeBusy ||
        !state.activeSessionId ||
        !file.path ||
        !file.unstaged ||
        file.untracked
      actions.appendChild(createHunkActionButton("暂存块", file.path, hunkIndex, "stage", disabled))
      actions.appendChild(createHunkActionButton("撤销块", file.path, hunkIndex, "revert", disabled, "danger"))
      return actions
    }

    function createHunkActionButton(label, filePath, hunkIndex, action, disabled, tone) {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "git-hunk-action" + (tone ? " " + tone : "")
      button.textContent = label
      button.disabled = Boolean(disabled)
      button.addEventListener("click", () => runGitHunkAction(filePath, hunkIndex, action))
      return button
    }

    function normalizeDiffKind(kind) {
      return ["add", "context", "del", "hunk", "meta"].includes(kind) ? kind : "context"
    }

    function renderChangeTree(files) {
      els.changeTree.textContent = ""

      if (!latestChanges.available) {
        return
      }

      if (files.length === 0) {
        if (Array.isArray(latestChanges.files) && latestChanges.files.length > 0) {
          appendChangesEmpty(els.changeTree, "没有匹配的文件。")
        }
        return
      }

      const root = buildChangeTree(files)
      const projectLabel = document.createElement("div")
      projectLabel.className = "change-tree-root"
      projectLabel.textContent = state.activeProject ? state.activeProject.name : "项目"
      els.changeTree.appendChild(projectLabel)
      appendTreeChildren(els.changeTree, root, 0)
    }

    function buildChangeTree(files) {
      const root = createTreeFolder("", "")
      for (const file of files) {
        const parts = String(file.path || "").split("/").filter(Boolean)
        let folder = root
        for (let index = 0; index < parts.length - 1; index += 1) {
          const name = parts[index]
          const folderPath = folder.path ? folder.path + "/" + name : name
          if (!folder.dirs.has(name)) {
            folder.dirs.set(name, createTreeFolder(name, folderPath))
          }
          folder = folder.dirs.get(name)
        }
        folder.files.push(file)
      }
      return root
    }

    function createTreeFolder(name, folderPath) {
      return {
        dirs: new Map(),
        files: [],
        name,
        path: folderPath,
      }
    }

    function appendTreeChildren(container, folder, depth) {
      const dirs = Array.from(folder.dirs.values()).sort((left, right) =>
        left.name.localeCompare(right.name)
      )
      const files = folder.files.slice().sort((left, right) =>
        String(left.path || "").localeCompare(String(right.path || ""))
      )

      for (const child of dirs) {
        const row = document.createElement("div")
        row.className = "change-tree-row folder"
        row.style.setProperty("--tree-depth", String(depth))
        const caret = document.createElement("span")
        caret.className = "tree-caret"
        caret.textContent = "⌄"
        const name = document.createElement("span")
        name.className = "tree-name"
        name.textContent = child.name
        row.appendChild(caret)
        row.appendChild(name)
        container.appendChild(row)
        appendTreeChildren(container, child, depth + 1)
      }

      for (const file of files) {
        const row = document.createElement("button")
        row.type = "button"
        row.className = "change-tree-row file" + (file.path === selectedChangePath ? " active" : "")
        row.style.setProperty("--tree-depth", String(depth))
        row.addEventListener("click", () => selectChangeFile(file.path, true))

        const icon = document.createElement("span")
        icon.className = "tree-file-icon"
        icon.textContent = fileBadge(file.path)
        const name = document.createElement("span")
        name.className = "tree-name"
        name.textContent = basename(file.path)
        row.appendChild(icon)
        row.appendChild(name)

        const statsText = formatChangeStats(file)
        if (statsText) {
          const stats = document.createElement("span")
          stats.className = "tree-stats"
          stats.textContent = statsText.add + " " + statsText.del
          row.appendChild(stats)
        }

        container.appendChild(row)
      }
    }

    function selectChangeFile(filePath, shouldScroll) {
      selectedChangePath = filePath
      renderChanges(latestChanges)
      const target = document.getElementById(safeChangeId(filePath))
      if (shouldScroll && target) {
        target.scrollIntoView({ block: "start", behavior: "smooth" })
      }
    }

    function appendChangesEmpty(container, message) {
      const empty = document.createElement("div")
      empty.className = "small-muted"
      empty.textContent = message
      container.appendChild(empty)
    }

    function safeChangeId(filePath) {
      return "change-" + String(filePath || "").replace(/[^a-zA-Z0-9_-]/g, "_")
    }

    function safeDiffCommentId(filePath) {
      return "diff-comment-" + String(filePath || "").replace(/[^a-zA-Z0-9_-]/g, "_")
    }

    function basename(filePath) {
      const parts = String(filePath || "").split("/")
      return parts[parts.length - 1] || filePath
    }

    function fileBadge(filePath) {
      const name = basename(filePath).toLowerCase()
      const extension = name.includes(".") ? name.split(".").pop() : ""
      if (extension === "ts" || extension === "tsx") return "TS"
      if (extension === "js" || extension === "jsx") return "JS"
      if (extension === "json") return "{}"
      if (extension === "md") return "MD"
      if (extension === "py") return "PY"
      if (extension === "css") return "CS"
      if (extension === "html") return "<>"
      return "•"
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

    async function streamPost(path, body, onEvent) {
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
          ;(onEvent || handleStreamEvent)(JSON.parse(line))
        }
      }
      if (buffer.trim()) (onEvent || handleStreamEvent)(JSON.parse(buffer))
    }

    async function refreshTerminalList() {
      if (!state.activeSessionId) {
        activeTerminalId = ""
        latestTerminals = []
        terminalLastLineIds.__active = 0
        els.terminalOutput.textContent = ""
        updateTerminalSearch()
        renderTerminalRunList()
        updateControls()
        return
      }

      const response = await fetch("/api/terminal/list?sessionId=" + encodeURIComponent(state.activeSessionId))
      const result = await response.json()
      const terminals = Array.isArray(result.terminals) ? result.terminals : []
      latestTerminals = terminals
      renderTerminalRunList()
      const selected = terminals.find((terminal) => terminal.id === activeTerminalId)
      const active = selected || terminals.find((terminal) => terminal.status === "running") || terminals[0]
      if (!active) {
        activeTerminalId = ""
        els.terminalOutput.textContent = ""
        updateTerminalSearch()
        updateControls()
        return
      }

      if (activeTerminalId !== active.id) {
        activeTerminalId = active.id
        terminalLastLineIds[activeTerminalId] = 0
        els.terminalOutput.textContent = ""
        updateTerminalSearch()
      }
      renderTerminalRunList()
      await pollTerminalOutput()
    }

    function renderTerminalRunList() {
      els.terminalRunList.textContent = ""
      if (!latestTerminals.length) {
        const empty = document.createElement("div")
        empty.className = "terminal-run-empty"
        empty.textContent = "暂无终端记录"
        els.terminalRunList.appendChild(empty)
        return
      }

      for (const terminal of latestTerminals) {
        const button = document.createElement("button")
        button.type = "button"
        button.className = "terminal-run-item" + (terminal.id === activeTerminalId ? " active" : "")
        button.title = terminal.command || terminal.id
        const status = document.createElement("span")
        status.className = "terminal-run-status " + (terminal.status || "exited")
        status.textContent = terminal.status || "exited"
        const label = document.createElement("span")
        label.className = "terminal-run-command"
        label.textContent = terminal.command || terminal.id
        button.appendChild(status)
        button.appendChild(label)
        button.addEventListener("click", () => selectTerminalRun(terminal.id))
        els.terminalRunList.appendChild(button)
      }
    }

    function activeTerminalStatus() {
      const terminal = latestTerminals.find((item) => item.id === activeTerminalId)
      return terminal?.status || ""
    }

    function selectTerminalRun(terminalId) {
      if (!terminalId || activeTerminalId === terminalId) return
      activeTerminalId = terminalId
      terminalLastLineIds[activeTerminalId] = 0
      els.terminalOutput.textContent = ""
      updateTerminalSearch()
      renderTerminalRunList()
      void pollTerminalOutput()
      updateControls()
    }

    async function startTerminalCommand() {
      const command = els.terminalCommand.value.trim()
      if (!state.activeSessionId || !command) return
      try {
        const result = await postJson("/api/terminal/start", {
          command,
          sessionId: state.activeSessionId,
        })
        applyState(result)
        activeTerminalId = result.terminal?.id || ""
        if (result.terminal) {
          latestTerminals = [result.terminal, ...latestTerminals.filter((item) => item.id !== result.terminal.id)]
        }
        renderTerminalRunList()
        if (activeTerminalId) terminalLastLineIds[activeTerminalId] = 0
        els.terminalOutput.textContent = ""
        updateTerminalSearch()
        appendMeta("[终端] " + (result.message || "命令已启动。"))
        setReviewMode("terminal")
        await pollTerminalOutput()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        updateControls()
      }
    }

    async function stopActiveTerminal() {
      if (!activeTerminalId) return
      try {
        const result = await postJson("/api/terminal/stop", {
          terminalId: activeTerminalId,
        })
        applyState(result)
        if (result.terminal) {
          latestTerminals = latestTerminals.map((item) =>
            item.id === result.terminal.id ? result.terminal : item
          )
          renderTerminalRunList()
        }
        appendMeta("[终端] " + (result.message || "已请求停止。"))
        await pollTerminalOutput()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        updateControls()
      }
    }

    async function sendTerminalInput() {
      const input = els.terminalInput.value
      if (!activeTerminalId || activeTerminalStatus() !== "running" || !input.length) return
      try {
        const result = await postJson("/api/terminal/input", {
          input: input.endsWith("\\n") ? input : input + "\\n",
          terminalId: activeTerminalId,
        })
        applyState(result)
        if (result.terminal) {
          latestTerminals = latestTerminals.map((item) =>
            item.id === result.terminal.id ? result.terminal : item
          )
          renderTerminalRunList()
        }
        els.terminalInput.value = ""
        appendMeta("[终端] " + (result.message || "输入已发送。"))
        await pollTerminalOutput()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        updateControls()
      }
    }

    async function copyActiveTerminalOutput() {
      const text = els.terminalOutput.textContent || ""
      if (!text.trim()) return
      try {
        await navigator.clipboard.writeText(text)
        appendMeta("[终端] 输出已复制。")
      } catch {
        appendMeta("[终端] 当前浏览器不允许直接复制，请手动选择输出。", true)
      }
    }

    function updateTerminalSearch(options = {}) {
      const query = els.terminalSearchQuery.value.trim()
      const rows = Array.from(els.terminalOutput.querySelectorAll(".terminal-line"))
      let matches = 0
      let firstMatch = null
      for (const row of rows) {
        const body = row.querySelector(".terminal-line-text")
        if (!body) continue
        const text = body.dataset.rawText || body.textContent || ""
        const matched = renderTerminalLineText(body, text, query)
        row.classList.toggle("search-match", matched)
        if (matched) {
          matches += 1
          if (!firstMatch) firstMatch = row
        }
      }
      els.terminalSearchResult.textContent = query ? String(matches) + " 行" : ""
      if (options.scrollFirst && firstMatch) {
        firstMatch.scrollIntoView({ block: "nearest" })
      }
    }

    function renderTerminalLineText(body, text, query) {
      body.textContent = ""
      const source = terminalDisplayText(text || " ")
      const needle = query.trim().toLowerCase()
      if (!needle) {
        body.textContent = source
        return false
      }

      const lower = source.toLowerCase()
      let index = lower.indexOf(needle)
      if (index === -1) {
        body.textContent = source
        return false
      }

      let cursor = 0
      while (index !== -1) {
        if (index > cursor) {
          body.appendChild(document.createTextNode(source.slice(cursor, index)))
        }
        const mark = document.createElement("mark")
        mark.textContent = source.slice(index, index + needle.length)
        body.appendChild(mark)
        cursor = index + needle.length
        index = lower.indexOf(needle, cursor)
      }
      if (cursor < source.length) {
        body.appendChild(document.createTextNode(source.slice(cursor)))
      }
      return true
    }

    function terminalDisplayText(text) {
      return String(text || " ").replace(/\\x1b\\[[0-?]*[ -/]*[@-~]/g, "")
    }

    async function handleSlashCommand(input) {
      const raw = String(input || "").trim()
      if (!raw.startsWith("/")) return false
      const spaceIndex = raw.indexOf(" ")
      const command = (spaceIndex >= 0 ? raw.slice(1, spaceIndex) : raw.slice(1)).toLowerCase()
      const rest = spaceIndex >= 0 ? raw.slice(spaceIndex + 1).trim() : ""

      if (command === "help" || command === "?") {
        appendMeta(
          [
            "[命令] 可用 slash commands:",
            "/status 刷新状态和变更",
            "/review 打开审查",
            "/terminal [命令] 打开终端并填入命令",
            "/browser [URL] 打开浏览器预览",
            "/artifacts [路径] 预览工作区产物",
            "/history [关键词] 搜索 prompt 历史",
            "/memory 查看用户和项目记忆",
            "/memory panel 打开记忆面板",
            "/memory set <内容> 保存项目记忆",
            "/memory user set <内容> 保存用户记忆",
            "/memory search <关键词> 搜索记忆",
            "/extensions 打开扩展",
            "/automations 打开自动化",
            "/permission read_only|auto|full_access 切换权限模式",
          ].join("\\n")
        )
        return true
      }

      if (command === "status") {
        await refreshStatus()
        await refreshChanges()
        appendMeta("[命令] 状态已刷新。权限模式：" + (state.permissionMode || "full_access"))
        return true
      }

      if (command === "review") {
        setReviewPanelHidden(false)
        setReviewMode("changes")
        await refreshChanges()
        appendMeta("[命令] 已打开审查。")
        return true
      }

      if (command === "terminal" || command === "term") {
        setReviewPanelHidden(false)
        setReviewMode("terminal")
        if (rest) {
          els.terminalCommand.value = rest
          appendMeta("[命令] 已填入终端命令，确认后点击运行。")
        } else {
          appendMeta("[命令] 已打开终端。")
        }
        updateControls()
        return true
      }

      if (command === "browser") {
        setReviewPanelHidden(false)
        if (rest) {
          openBrowserPreview(rest)
          appendMeta("[命令] 已打开浏览器预览。")
        } else {
          setReviewMode("browser")
          appendMeta("[命令] 已打开浏览器面板。")
        }
        return true
      }

      if (command === "artifacts" || command === "artifact") {
        setReviewPanelHidden(false)
        setReviewMode("artifacts")
        if (rest) {
          els.artifactPath.value = rest
          await previewArtifact()
        } else {
          appendMeta("[命令] 已打开产物面板。")
        }
        updateControls()
        return true
      }

      if (command === "history") {
        const matches = matchingPromptHistory(rest)
        appendMeta(
          matches.length
            ? ["[命令] Prompt history:", ...matches.map((item, index) => String(index + 1) + ". " + shortenInline(item, 140))].join("\\n")
            : "[命令] 没有匹配的 prompt 历史。"
        )
        return true
      }

      if (command === "memory") {
        await handleMemorySlashCommand(rest)
        return true
      }

      if (command === "extensions") {
        setReviewPanelHidden(false)
        setReviewMode("extensions")
        appendMeta("[命令] 已打开扩展。")
        return true
      }

      if (command === "automations") {
        setReviewPanelHidden(false)
        setReviewMode("automations")
        appendMeta("[命令] 已打开自动化。")
        return true
      }

      if (command === "permission") {
        const nextMode = rest.replace(/-/g, "_")
        if (
          nextMode !== "read_only" &&
          nextMode !== "auto" &&
          nextMode !== "full_access"
        ) {
          appendMeta("[命令] 权限模式只能是 read_only、auto 或 full_access。", true)
          return true
        }
        await setPermissionMode(nextMode)
        return true
      }

      appendMeta("[命令] 未知命令：" + raw + "。输入 /help 查看可用命令。", true)
      return true
    }

    async function handleMemorySlashCommand(rest) {
      if (!state.activeSessionId) {
        appendMeta("[命令] 请先选择会话。", true)
        return
      }

      const text = String(rest || "").trim()
      const parsed = parseMemorySlashArgs(text)
      if (parsed.action === "panel") {
        setReviewPanelHidden(false)
        setReviewMode("memory")
        appendMeta("[命令] 已打开记忆面板。")
        return
      }
      if (parsed.action === "search") {
        if (!parsed.memory) {
          appendMeta("[记忆] 请输入搜索关键词。", true)
          return
        }
        const response = await fetch(
          "/api/memory/search?sessionId=" +
            encodeURIComponent(state.activeSessionId) +
            "&query=" +
            encodeURIComponent(parsed.memory)
        )
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "搜索记忆失败")
        const results = Array.isArray(result.results) ? result.results : []
        appendMeta(
          results.length
            ? [
                "[记忆] 搜索结果：",
                ...results.map(
                  (item) =>
                    item.scope +
                    ":" +
                    item.line +
                    " " +
                    shortenInline(item.text || "", 160)
                ),
              ].join("\\n")
            : "[记忆] 没有匹配结果。"
        )
        return
      }

      if (parsed.action === "clear") {
        const result = await deleteJson("/api/memory", {
          scope: parsed.scope,
          sessionId: state.activeSessionId,
        })
        applyState(result)
        if (reviewMode === "memory") {
          memoryDirty = false
          await refreshMemory({ resetDirty: true })
        }
        appendMeta("[记忆] " + (result.message || "记忆已清空。"))
        return
      }

      if (parsed.action === "set") {
        if (!parsed.memory) {
          appendMeta("[记忆] 请输入要保存的记忆内容。", true)
          return
        }
        const result = await postJson("/api/memory", {
          memory: parsed.memory,
          scope: parsed.scope,
          sessionId: state.activeSessionId,
        })
        applyState(result)
        if (reviewMode === "memory") {
          memoryDirty = false
          await refreshMemory({ resetDirty: true })
        }
        appendMeta("[记忆] " + (result.message || "记忆已保存。"))
        return
      }

      const response = await fetch(
        "/api/memory?sessionId=" +
          encodeURIComponent(state.activeSessionId) +
          "&scope=" +
          encodeURIComponent(parsed.scope)
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "读取记忆失败")
      const memories = Array.isArray(result.memories) ? result.memories : []
      const nonEmpty = memories.filter((item) => String(item.memory || "").trim())
      appendMeta(nonEmpty.length ? formatMemoryList(nonEmpty) : emptyMemoryMessage(parsed.scope))
    }

    function parseMemorySlashArgs(text) {
      const trimmed = String(text || "").trim()
      const parts = trimmed.split(/\\s+/).filter(Boolean)
      let scope = "all"
      let index = 0
      if (parts[0] === "user" || parts[0] === "project") {
        scope = parts[0]
        index = 1
      }

      const actionToken = parts[index] || ""
      if (actionToken === "set") {
        return {
          action: "set",
          memory: parts.slice(index + 1).join(" ").trim(),
          scope: scope === "all" ? "project" : scope,
        }
      }
      if (actionToken === "clear") {
        return {
          action: "clear",
          memory: "",
          scope: scope === "all" ? "project" : scope,
        }
      }
      if (actionToken === "search") {
        return {
          action: "search",
          memory: parts.slice(index + 1).join(" ").trim(),
          scope,
        }
      }
      if (actionToken === "panel") {
        return { action: "panel", memory: "", scope }
      }
      return { action: "view", memory: "", scope }
    }

    function formatMemoryList(memories) {
      return [
        "[记忆] 当前记忆：",
        ...memories.map(
          (item) =>
            "[" +
            item.scope +
            "] " +
            item.path +
            "\\n" +
            shortenInline(item.memory || "", 900)
        ),
      ].join("\\n\\n")
    }

    function emptyMemoryMessage(scope) {
      if (scope === "user") return "[记忆] 当前没有用户记忆。使用 /memory user set <内容> 保存。"
      if (scope === "project") return "[记忆] 当前项目没有项目记忆。使用 /memory set <内容> 保存。"
      return "[记忆] 当前没有用户或项目记忆。"
    }

	    async function pollTerminalOutput() {
      if (!activeTerminalId) return
      if (terminalPollTimer) {
        window.clearTimeout(terminalPollTimer)
        terminalPollTimer = 0
      }
      const since = terminalLastLineIds[activeTerminalId] || 0
      const response = await fetch(
        "/api/terminal/output?terminalId=" +
          encodeURIComponent(activeTerminalId) +
          "&since=" +
          encodeURIComponent(String(since))
      )
      if (!response.ok) {
        activeTerminalId = ""
        updateControls()
        return
      }
      const result = await response.json()
      const lines = Array.isArray(result.lines) ? result.lines : []
      for (const line of lines) {
        appendTerminalOutputLine(line)
        terminalLastLineIds[activeTerminalId] = Math.max(
          terminalLastLineIds[activeTerminalId] || 0,
          Number(line.id) || 0
        )
      }
      const terminal = result.terminal || {}
      if (terminal.id) {
        latestTerminals = latestTerminals.map((item) =>
          item.id === terminal.id ? terminal : item
        )
        renderTerminalRunList()
      }
      if (terminal.status === "running") {
        terminalPollTimer = window.setTimeout(() => void pollTerminalOutput(), 1000)
      }
      updateControls()
    }

    function appendTerminalOutputLine(line) {
      const row = document.createElement("div")
      row.className = "terminal-line " + (line.stream || "system")
      const label = document.createElement("span")
      label.className = "terminal-line-stream"
      label.textContent = line.stream || "system"
      const body = document.createElement("span")
      body.className = "terminal-line-text"
      body.dataset.rawText = line.text || " "
      renderTerminalLineText(body, body.dataset.rawText, els.terminalSearchQuery.value.trim())
      row.appendChild(label)
      row.appendChild(body)
      els.terminalOutput.appendChild(row)
      els.terminalOutput.scrollTop = els.terminalOutput.scrollHeight
      updateTerminalSearch()
    }

    async function refreshExtensions() {
      if (!state.activeSessionId) {
        latestExtensions = null
        renderExtensions()
        updateControls()
        return
      }

      try {
        const response = await fetch(
          "/api/extensions?sessionId=" + encodeURIComponent(state.activeSessionId)
        )
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "扩展列表加载失败")
        latestExtensions = result.extensions || null
        renderExtensions()
      } catch (error) {
        latestExtensions = { error: error.message || String(error) }
        renderExtensions()
      } finally {
        updateControls()
      }
    }

    async function toggleExtension(kind, item) {
      if (!state.activeSessionId || extensionBusy) return
      extensionBusy = true
      updateControls()
      renderExtensions()
      try {
        const result = await postJson("/api/extensions/toggle", {
          enabled: !item.enabled,
          kind,
          name: item.label,
          sessionId: state.activeSessionId,
        })
        applyState(result)
        latestExtensions = result.extensions || null
        renderExtensions()
        appendMeta("[扩展] " + (result.message || "扩展状态已更新。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        extensionBusy = false
        updateControls()
        renderExtensions()
      }
    }

    function renderExtensions() {
      els.extensionsList.textContent = ""
      if (!latestExtensions) {
        els.extensionsConfigPath.textContent = ""
        const empty = document.createElement("div")
        empty.className = "extension-empty"
        empty.textContent = state.activeSessionId
          ? "点击刷新查看当前 workspace 的 Skills、Plugins、MCP 和 Hooks。"
          : "请先选择会话。"
        els.extensionsList.appendChild(empty)
        return
      }

      if (latestExtensions.error) {
        els.extensionsConfigPath.textContent = ""
        const error = document.createElement("div")
        error.className = "extension-empty error"
        error.textContent = latestExtensions.error
        els.extensionsList.appendChild(error)
        return
      }

      els.extensionsConfigPath.textContent = latestExtensions.configPath
        ? "配置：" + latestExtensions.configPath
        : ""
      appendExtensionGroup("Skills", "skill", latestExtensions.skills || [])
      appendExtensionGroup("Plugins", "plugin", latestExtensions.plugins || [])
      appendExtensionGroup("MCP", "mcp", latestExtensions.mcpServers || [])
      appendExtensionGroup("Hooks", "hook", latestExtensions.hooks || [])

      const warnings = Array.isArray(latestExtensions.warnings)
        ? latestExtensions.warnings
        : []
      if (warnings.length > 0) {
        const warning = document.createElement("div")
        warning.className = "extension-warning"
        warning.textContent = warnings.slice(0, 4).join("；")
        els.extensionsList.appendChild(warning)
      }
    }

    function appendExtensionGroup(title, kind, items) {
      const section = document.createElement("section")
      section.className = "extension-group"
      const header = document.createElement("div")
      header.className = "extension-group-header"
      header.textContent = title + " · " + items.length
      section.appendChild(header)

      if (items.length === 0) {
        const empty = document.createElement("div")
        empty.className = "extension-empty"
        empty.textContent = "暂无"
        section.appendChild(empty)
      }

      for (const item of items) {
        const row = document.createElement("div")
        row.className = "extension-row" + (item.enabled === false ? " disabled" : "")
        const body = document.createElement("div")
        body.className = "extension-row-body"
        const name = document.createElement("strong")
        name.textContent = item.displayName || item.label || "(unnamed)"
        const meta = document.createElement("span")
        meta.textContent = [item.description, item.policySummary, item.source, item.path]
          .filter(Boolean)
          .join(" · ")
        body.appendChild(name)
        if (meta.textContent) body.appendChild(meta)
        row.appendChild(body)

        if (kind === "skill" || kind === "plugin" || kind === "mcp" || kind === "hook") {
          const toggle = document.createElement("button")
          toggle.type = "button"
          toggle.className = "extension-toggle"
          toggle.disabled = extensionBusy
          toggle.textContent = item.enabled === false ? "启用" : "禁用"
          toggle.addEventListener("click", () => void toggleExtension(kind, item))
          row.appendChild(toggle)
        } else {
          const badge = document.createElement("span")
          badge.className = "extension-badge"
          badge.textContent = "只读"
          row.appendChild(badge)
        }
        section.appendChild(row)
      }
      els.extensionsList.appendChild(section)
    }

    async function refreshMemory(options = {}) {
      if (!state.activeSessionId) {
        latestMemories = []
        latestMemoryResults = []
        latestSessionMemory = null
        memoryError = ""
        memoryDirty = false
        renderMemory()
        updateControls()
        return
      }

      if (memoryDirty && options.confirmDiscard && !window.confirm("放弃未保存的记忆修改并刷新？")) {
        return
      }

      memoryBusy = true
      memoryError = ""
      updateControls()
      try {
        const response = await fetch(
          "/api/memory?sessionId=" +
            encodeURIComponent(state.activeSessionId) +
            "&scope=all"
        )
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "读取记忆失败")
        latestMemories = Array.isArray(result.memories) ? result.memories : []
        const sessionResponse = await fetch(
          "/api/session-memory?sessionId=" + encodeURIComponent(state.activeSessionId)
        )
        const sessionResult = await sessionResponse.json()
        if (!sessionResponse.ok) throw new Error(sessionResult.error || "读取会话记忆失败")
        latestSessionMemory = sessionResult.memory || null
        if (options.resetDirty) memoryDirty = false
        renderMemory()
      } catch (error) {
        memoryError = error.message || String(error)
        renderMemory()
      } finally {
        memoryBusy = false
        updateControls()
      }
    }

    function activeMemoryScope() {
      return els.memoryScope.value === "user" ? "user" : "project"
    }

    function activeMemoryRecord() {
      const scope = activeMemoryScope()
      return latestMemories.find((item) => item.scope === scope) || {
        enabled: true,
        memory: "",
        path: "",
        scope,
      }
    }

    function renderMemory() {
      if (!state.activeSessionId) {
        els.memoryPath.textContent = ""
        els.memoryEnabled.checked = false
        els.memoryEditor.value = ""
        renderStructuredMemoryFields("")
        renderSessionMemoryPanel()
        renderMemoryResults("请先选择会话。")
        return
      }

      const record = activeMemoryRecord()
      els.memoryPath.textContent = record.path ? "路径：" + record.path : ""
      els.memoryEnabled.checked = record.enabled !== false
      if (!memoryDirty) {
        els.memoryEditor.value = record.memory || ""
        renderStructuredMemoryFields(record.memory || "")
      }
      renderSessionMemoryPanel()
      renderMemoryResults()
    }

    function renderStructuredMemoryFields(markdown) {
      const structured = parseStructuredMemory(markdown)
      els.memoryFacts.value = structured.facts.join("\\n")
      els.memoryPreferences.value = structured.preferences.join("\\n")
      els.memoryTodos.value = structured.todos.join("\\n")
    }

    function parseStructuredMemory(markdown) {
      const sections = {
        facts: [],
        preferences: [],
        todos: [],
      }
      let current = ""
      for (const line of String(markdown || "").split(/\\r?\\n/)) {
        const heading = line.trim().toLowerCase()
        if (/^##+\\s*(facts|事实)/.test(heading)) {
          current = "facts"
          continue
        }
        if (/^##+\\s*(preferences|偏好)/.test(heading)) {
          current = "preferences"
          continue
        }
        if (/^##+\\s*(todos|待办)/.test(heading)) {
          current = "todos"
          continue
        }
        if (/^##+\\s+/.test(heading)) {
          current = ""
          continue
        }
        if (current) {
          const value = line.replace(/^\\s*[-*]\\s+/, "").trim()
          if (value) sections[current].push(value)
        }
      }
      return sections
    }

    function applyStructuredMemory() {
      const sections = [
        ["Facts", linesFromTextarea(els.memoryFacts)],
        ["Preferences", linesFromTextarea(els.memoryPreferences)],
        ["Todos", linesFromTextarea(els.memoryTodos)],
      ]
      els.memoryEditor.value = sections
        .filter((section) => section[1].length > 0)
        .map((section) => "## " + section[0] + "\\n" + section[1].map((line) => "- " + line).join("\\n"))
        .join("\\n\\n")
      memoryDirty = true
      updateControls()
    }

    function linesFromTextarea(textarea) {
      return String(textarea.value || "")
        .split(/\\r?\\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    }

    function renderSessionMemoryPanel() {
      els.sessionMemoryPanel.textContent = ""
      if (!state.activeSessionId) return

      const panel = document.createElement("details")
      panel.className = "session-memory-details"
      const summary = document.createElement("summary")
      const metrics = latestSessionMemory && latestSessionMemory.metrics
        ? latestSessionMemory.metrics
        : null
      summary.textContent = metrics
        ? "会话记忆 · " +
          [
            "summary " + metrics.summaryChars,
            "quality " + metrics.summaryQuality,
            "compactions " + metrics.compactionCount,
          ].join(" · ")
        : "会话记忆 · 暂无数据"
      panel.appendChild(summary)

      if (metrics) {
        const grid = document.createElement("div")
        grid.className = "session-memory-grid"
        const rows = [
          ["摘要质量", metrics.summaryQuality],
          ["摘要字符", metrics.summaryChars],
          ["Recent entries", metrics.recentEntryCount],
          ["Transcript entries", metrics.transcriptEntryCount],
          ["Compactions", metrics.compactionCount],
          ["Prompt snapshots", metrics.promptSnapshotCount],
          ["Latest prompt chars", metrics.latestPromptTotalChars],
        ]
        for (const row of rows) {
          const label = document.createElement("span")
          label.textContent = row[0]
          const value = document.createElement("strong")
          value.textContent = String(row[1])
          grid.appendChild(label)
          grid.appendChild(value)
        }
        panel.appendChild(grid)
      }

      const compactions = latestSessionMemory && Array.isArray(latestSessionMemory.compactions)
        ? latestSessionMemory.compactions
        : []
      if (compactions.length > 0) {
        const list = document.createElement("div")
        list.className = "session-memory-list"
        for (const item of compactions.slice().reverse()) {
          const row = document.createElement("div")
          row.textContent = [
            formatTime(item.createdAt),
            item.status,
            item.reason,
            "input " + item.inputChars,
            "summary " + item.summaryChars,
            item.errorMessage || "",
          ].filter(Boolean).join(" · ")
          list.appendChild(row)
        }
        panel.appendChild(list)
      }

      if (latestSessionMemory && latestSessionMemory.summaryText) {
        const body = document.createElement("pre")
        body.className = "session-memory-summary"
        body.textContent = compactTaskOutput(latestSessionMemory.summaryText)
        panel.appendChild(body)
      }

      els.sessionMemoryPanel.appendChild(panel)
    }

    function renderMemoryResults(emptyText) {
      els.memoryResults.textContent = ""
      if (memoryError) {
        const row = document.createElement("div")
        row.className = "memory-result error"
        row.textContent = memoryError
        els.memoryResults.appendChild(row)
        return
      }

      if (latestMemoryResults.length === 0) {
        const empty = document.createElement("div")
        empty.className = "memory-result"
        empty.textContent = emptyText || "搜索结果会显示在这里。"
        els.memoryResults.appendChild(empty)
        return
      }

      for (const item of latestMemoryResults) {
        const row = document.createElement("div")
        row.className = "memory-result"
        const title = document.createElement("strong")
        title.textContent =
          (item.scope === "user" ? "用户" : "项目") +
          " · line " +
          String(item.line || 1)
        const body = document.createElement("span")
        body.textContent = shortenInline(item.text || "", 220)
        const path = document.createElement("small")
        path.textContent = item.path || ""
        row.appendChild(title)
        row.appendChild(body)
        if (path.textContent) row.appendChild(path)
        els.memoryResults.appendChild(row)
      }
    }

    async function saveActiveMemory() {
      if (!state.activeSessionId || memoryBusy) return
      memoryBusy = true
      updateControls()
      try {
        const result = await postJson("/api/memory", {
          memory: els.memoryEditor.value,
          scope: activeMemoryScope(),
          sessionId: state.activeSessionId,
        })
        applyState(result)
        memoryDirty = false
        await refreshMemory({ resetDirty: true })
        appendMeta("[记忆] " + (result.message || "记忆已保存。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        memoryBusy = false
        updateControls()
      }
    }

    async function clearActiveMemory() {
      if (!state.activeSessionId || memoryBusy) return
      const label = activeMemoryScope() === "user" ? "用户记忆" : "项目记忆"
      if (!window.confirm("确定清空" + label + "？")) return
      memoryBusy = true
      updateControls()
      try {
        const result = await deleteJson("/api/memory", {
          scope: activeMemoryScope(),
          sessionId: state.activeSessionId,
        })
        applyState(result)
        memoryDirty = false
        await refreshMemory({ resetDirty: true })
        appendMeta("[记忆] " + (result.message || "记忆已清空。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        memoryBusy = false
        updateControls()
      }
    }

    async function setActiveMemoryEnabled(enabled) {
      if (!state.activeSessionId || memoryBusy) return
      memoryBusy = true
      updateControls()
      try {
        const result = await postJson("/api/memory/settings", {
          enabled,
          scope: activeMemoryScope(),
          sessionId: state.activeSessionId,
        })
        applyState(result)
        await refreshMemory()
        appendMeta("[记忆] " + (result.message || "记忆注入状态已更新。"))
      } catch (error) {
        els.memoryEnabled.checked = !enabled
        appendMeta("[错误] " + error.message, true)
      } finally {
        memoryBusy = false
        updateControls()
      }
    }

    async function searchMemory() {
      if (!state.activeSessionId || memoryBusy) return
      const query = els.memorySearchQuery.value.trim()
      if (!query) return
      memoryBusy = true
      memoryError = ""
      updateControls()
      try {
        const response = await fetch(
          "/api/memory/search?sessionId=" +
            encodeURIComponent(state.activeSessionId) +
            "&query=" +
            encodeURIComponent(query)
        )
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "搜索记忆失败")
        latestMemoryResults = Array.isArray(result.results) ? result.results : []
        renderMemory()
        appendMeta("[记忆] 搜索完成：" + latestMemoryResults.length + " 条。")
      } catch (error) {
        memoryError = error.message || String(error)
        renderMemory()
      } finally {
        memoryBusy = false
        updateControls()
      }
    }

    async function refreshAutomations() {
      try {
        const response = await fetch("/api/automations")
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "自动化列表加载失败")
        latestAutomations = Array.isArray(result.automations) ? result.automations : []
      } catch (error) {
        latestAutomations = [{ error: error.message || String(error) }]
      }
      renderAutomations()
      updateControls()
    }

    function updateAutomationScheduleEditor() {
      const cronMode = els.automationScheduleMode.value === "cron"
      els.automationInterval.hidden = cronMode
      els.automationCron.hidden = !cronMode
      if (!cronMode) {
        els.automationCron.value = ""
      }
      updateControls()
      scheduleAutomationPreview()
    }

    function scheduleAutomationPreview() {
      if (automationPreviewTimer) {
        window.clearTimeout(automationPreviewTimer)
      }
      automationPreviewTimer = window.setTimeout(() => {
        automationPreviewTimer = null
        void refreshAutomationSchedulePreview()
      }, 250)
    }

    async function refreshAutomationSchedulePreview() {
      const cronMode = els.automationScheduleMode.value === "cron"
      const cron = cronMode ? els.automationCron.value.trim() : ""
      const intervalMinutes = Number(els.automationInterval.value) || 60
      els.automationSchedulePreview.classList.remove("error")
      if (cronMode && !cron) {
        els.automationSchedulePreview.textContent = ""
        return
      }

      try {
        const result = await postJson("/api/automations/preview", {
          cron,
          intervalMinutes,
        })
        els.automationSchedulePreview.textContent = result.nextRunAt
          ? "下次 " + formatTime(result.nextRunAt)
          : ""
      } catch (error) {
        els.automationSchedulePreview.classList.add("error")
        els.automationSchedulePreview.textContent = error.message || String(error)
      }
    }

    async function createAutomation() {
      if (!state.activeSessionId || automationBusy) return
      const prompt = els.automationPrompt.value.trim()
      if (!prompt) return
      const cronMode = els.automationScheduleMode.value === "cron"
      automationBusy = true
      updateControls()
      try {
        const result = await postJson("/api/automations", {
          cron: cronMode ? els.automationCron.value.trim() : "",
          intervalMinutes: Number(els.automationInterval.value) || 60,
          permissionMode: els.automationPermission.value,
          prompt,
          sessionId: state.activeSessionId,
          title: els.automationTitle.value.trim() || "自动化",
        })
        applyState(result)
        latestAutomations = Array.isArray(result.automations) ? result.automations : []
        els.automationCron.value = ""
        els.automationPrompt.value = ""
        els.automationScheduleMode.value = "interval"
        updateAutomationScheduleEditor()
        renderAutomations()
        appendMeta("[自动化] " + (result.message || "已创建自动化。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        automationBusy = false
        updateControls()
      }
    }

    async function automationAction(path, body) {
      automationBusy = true
      updateControls()
      try {
        const result = path === "/api/automations"
          ? await deleteJson(path, body)
          : await postJson(path, body)
        applyState(result)
        latestAutomations = Array.isArray(result.automations) ? result.automations : []
        renderAutomations()
        appendMeta("[自动化] " + (result.message || "自动化已更新。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        automationBusy = false
        updateControls()
      }
    }

    function renderAutomations() {
      els.automationsList.textContent = ""
      if (!latestAutomations.length) {
        const empty = document.createElement("div")
        empty.className = "automation-empty"
        empty.textContent = "暂无自动化。创建后会在服务运行期间按计划触发当前会话。"
        els.automationsList.appendChild(empty)
        return
      }

      for (const automation of latestAutomations) {
        if (automation.error) {
          const error = document.createElement("div")
          error.className = "automation-empty error"
          error.textContent = automation.error
          els.automationsList.appendChild(error)
          continue
        }
        const row = document.createElement("div")
        row.className = "automation-row" + (automation.enabled ? "" : " disabled")
        const body = document.createElement("div")
        body.className = "automation-row-body"
        const title = document.createElement("strong")
        title.textContent = automation.title || "自动化"
        const meta = document.createElement("span")
        meta.textContent = [
          automation.enabled ? "enabled" : "paused",
          automation.permissionMode,
          automation.workspaceMode === "worktree" ? "Worktree" : "Local",
          automation.cron ? "cron " + automation.cron : "每 " + automation.intervalMinutes + " 分钟",
          automation.nextRunAt ? "下次 " + formatTime(automation.nextRunAt) : "",
          automation.lastStatus ? "上次 " + automation.lastStatus : "",
          automation.failureCount ? "失败 " + automation.failureCount : "",
        ].filter(Boolean).join(" · ")
        body.appendChild(title)
        body.appendChild(meta)
        if (automation.lastError) {
          const error = document.createElement("span")
          error.className = "automation-error"
          error.textContent = automation.lastError
          body.appendChild(error)
        }
        row.appendChild(body)

        const actions = document.createElement("div")
        actions.className = "automation-actions"
        const run = document.createElement("button")
        run.type = "button"
        run.textContent = "运行"
        run.disabled = automationBusy
        run.addEventListener("click", () =>
          void automationAction("/api/automations/run", { automationId: automation.id })
        )
        const toggle = document.createElement("button")
        toggle.type = "button"
        toggle.textContent = automation.enabled ? "暂停" : "启用"
        toggle.disabled = automationBusy
        toggle.addEventListener("click", () =>
          void automationAction("/api/automations/toggle", {
            automationId: automation.id,
            enabled: !automation.enabled,
          })
        )
        const remove = document.createElement("button")
        remove.type = "button"
        remove.textContent = "删除"
        remove.disabled = automationBusy
        remove.addEventListener("click", () => {
          if (window.confirm("删除这个自动化？")) {
            void automationAction("/api/automations", { automationId: automation.id })
          }
        })
        actions.appendChild(run)
        actions.appendChild(toggle)
        actions.appendChild(remove)
        row.appendChild(actions)
        const history = renderAutomationHistory(automation)
        if (history) row.appendChild(history)
        els.automationsList.appendChild(row)
      }
    }

    function renderAutomationHistory(automation) {
      const history = Array.isArray(automation.history) ? automation.history.slice(0, 5) : []
      if (history.length === 0) return null

      const details = document.createElement("details")
      details.className = "automation-history"
      const summary = document.createElement("summary")
      summary.textContent = "运行历史"
      details.appendChild(summary)
      for (const item of history) {
        const row = document.createElement("div")
        row.className = "automation-history-row " + (item.status || "")
        const duration = item.finishedAt && item.startedAt
          ? formatDuration(item.finishedAt - item.startedAt)
          : ""
        row.textContent = [
          item.status || "-",
          item.startedAt ? formatTime(item.startedAt) : "",
          duration,
          item.error || "",
        ].filter(Boolean).join(" · ")
        details.appendChild(row)
      }
      return details
    }

    function formatTime(value) {
      try {
        return new Date(value).toLocaleString()
      } catch {
        return ""
      }
    }

	    function handleStreamEvent(payload, sessionId, requestRunId, fromWindowSync) {
      if (!fromWindowSync) {
        publishWindowSync({
          kind: "stream_event",
          payload,
          requestRunId: requestRunId || "",
          sessionId: sessionId || state.activeSessionId || "",
        })
      }
	      if (payload.type === "agent") {
	        renderAgentEvent(payload.event, sessionId)
	        return
	      }
	      if (payload.type === "multi") {
	        updateMultiAgentRun(payload.state, sessionId)
	        return
	      }
      if (payload.type === "queued") {
        setLocalSessionRunning(sessionId, true)
        const run = findQueuedMessageByRunId(sessionId, payload.id)
        if (run && payload.mode === "guide") {
          run.mode = "guide"
          reorderQueuedMessage(sessionId, run)
        }
        return
      }
      if (payload.type === "queue_updated") {
        const run = findQueuedMessageByRunId(sessionId, payload.id)
        if (run) {
          run.mode = payload.mode === "guide" ? "guide" : "normal"
          reorderQueuedMessage(sessionId, run)
        }
        return
      }
      if (payload.type === "queue_cancelled") {
        removeQueuedMessageByRunId(sessionId, payload.id)
        return
      }
      if (payload.type === "dequeued") {
        promoteQueuedUserMessage(sessionId, payload.mode, payload.id)
        return
      }
      if (payload.type === "error") {
        if (requestRunId) {
          removeQueuedMessageByRunId(sessionId, requestRunId)
        }
        flushAssistantQueue(sessionId, true)
        finishRunTimer(sessionId)
        finishThinking(sessionId)
        assistantBoundarySessions.delete(sessionId)
        setLocalSessionActiveRun(sessionId, false)
        syncSessionRunningFromLocalRefs(sessionId)
	        appendMeta("[错误] " + payload.message, true, sessionId)
        renderMessagesForSession(sessionId)
        return
      }
	      if (payload.type === "started") {
          setLocalSessionActiveRun(sessionId, true)
          setLocalSessionRunning(sessionId, true)
          startRunTimer(sessionId)
	        return
	      }
      if (payload.type === "finished") {
        flushAssistantQueue(sessionId, true)
        finishRunTimer(sessionId)
        finishThinking(sessionId)
        assistantBoundarySessions.delete(sessionId)
        setLocalSessionActiveRun(sessionId, false)
        syncSessionRunningFromLocalRefs(sessionId)
        streamingAssistants.delete(sessionId)
        streamingMultiRuns.delete(sessionId)
        renderMessagesForSession(sessionId)
      }
    }

    async function pickProject() {
      setToast(els.projectToast, "请选择项目目录...")
      try {
        const result = await postJson("/api/projects/pick", {
          initialDirectory: state.launchCwd || "",
        })

        if (result.cancelled) {
          setToast(els.projectToast, result.message || "已取消选择项目。")
          return
        }

        resetStreamingState()
        clearPendingAttachments()
	        messagesAutoFollow = true
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
	        resetStreamingState()
        clearPendingAttachments()
	        messagesAutoFollow = true
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
	        if (!isSessionRunning(sessionId)) resetStreamingState(sessionId)
        clearPendingAttachments()
	        messagesAutoFollow = true
	        applyState(result)
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    }

    async function updateSessionFlags(sessionId, flags) {
      try {
        const result = await postJson("/api/sessions/flags", {
          sessionId,
          ...flags,
        })
        applyState(result)
        setToast(els.projectToast, result.message || "会话已更新。")
        await refreshChanges()
      } catch (error) {
        if (state.activeSessionId) appendMeta("[错误] " + error.message, true)
        else setToast(els.projectToast, error.message, true)
      }
    }

    async function deleteSession(sessionId, title) {
      if (isSessionRunning(sessionId)) return

      const label = title || "此会话"
      if (!window.confirm("删除会话「" + label + "」？此操作会移除本地会话记录。")) {
        return
      }

      clearPersistMessagesTimer(sessionId)

      try {
	        const result = await deleteJson("/api/sessions", { sessionId })
	        delete messagesBySession[sessionId]
        delete queuedRunsBySession[sessionId]
	        resetStreamingState(sessionId)
	        messagesAutoFollow = true
	        applyState(result)
        setToast(els.projectToast, result.message || "会话已删除。")
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        if (state.activeSessionId) appendMeta("[错误] " + error.message, true)
        else setToast(els.projectToast, error.message, true)
      }
    }

    async function deleteProject(projectId, name) {
      const project = (state.projects || []).find((item) => item.id === projectId)
      if (!project || isProjectRunning(project.id)) return

      const label = name || project.name || "此项目"
      if (!window.confirm("移除项目「" + label + "」？此操作会移除本地项目记录和会话记录，不会删除项目文件。")) {
        return
      }

      for (const session of project.sessions || []) {
        clearPersistMessagesTimer(session.id)
      }

      try {
	        const result = await deleteJson("/api/projects", { projectId })
        for (const session of project.sessions || []) {
          delete messagesBySession[session.id]
          delete queuedRunsBySession[session.id]
          resetStreamingState(session.id)
        }
	        messagesAutoFollow = true
	        applyState(result)
        setToast(els.projectToast, result.message || "项目已移除。")
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        if (state.activeSessionId) appendMeta("[错误] " + error.message, true)
        else setToast(els.projectToast, error.message, true)
      }
    }

    async function createNewSession(workspaceMode) {
      try {
        const mode = workspaceMode === "worktree" ? "worktree" : "local"
	        const result = await postJson("/api/sessions", { workspaceMode: mode })
	        applyState(result)
        const sessionId = result.activeSessionId
        if (result.reused) {
          activeMessages(sessionId)
          activeQueuedRuns(sessionId)
        } else {
          resetStreamingState(sessionId)
          messagesBySession[sessionId] = []
          queuedRunsBySession[sessionId] = []
        }
        clearPendingAttachments()
	        messagesAutoFollow = true
        appendMeta((result.reused ? "[会话] " : "[新会话] ") + result.message)
        await refreshModels().catch(() => {})
        await refreshChanges()
      } catch (error) {
        if (state.activeSessionId) appendMeta("[错误] " + error.message, true)
        else setToast(els.projectToast, error.message, true)
      }
    }

    async function moveActiveSessionWorkspace() {
      const session = state.activeSession
      if (!session || isActiveSessionRunning()) return
      const targetMode = session.workspaceMode === "worktree" ? "local" : "worktree"
      const message = targetMode === "worktree"
        ? "迁移到 Worktree？当前 diff 会复制到新的隔离工作区，Local 目录不会自动清理。"
        : "迁回 Local？Worktree 当前 diff 会应用到 Local，若 Local 有冲突会失败。"
      if (!window.confirm(message)) return

      try {
        const result = await postJson("/api/sessions/workspace", {
          carryChanges: true,
          sessionId: session.id,
          workspaceMode: targetMode,
        })
        applyState(result)
        appendMeta("[工作区] " + (result.message || "会话工作区已更新。"))
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    }

    async function discardActiveSessionChanges() {
      const session = state.activeSession
      if (!session || isActiveSessionRunning()) return
      if (!window.confirm("撤销当前会话本轮变更？这会把会话工作区还原到本轮任务开始前的 Git tree。")) {
        return
      }

      try {
        const result = await postJson("/api/sessions/discard", { sessionId: session.id })
        applyState(result)
        appendMeta("[撤销] " + (result.message || "已处理撤销。"))
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      }
    }

    async function runGitFileAction(filePath, action) {
      const sessionId = state.activeSessionId
      if (!sessionId || gitBusy || !filePath) return
      const label = gitFileActionLabel(action)
      if (
        action === "revert" &&
        !window.confirm("撤销文件「" + filePath + "」到本轮对话前的状态？")
      ) {
        return
      }

      gitBusy = true
      updateControls()
      renderChanges(latestChanges)
      try {
        const result = await postJson("/api/git/file", {
          action,
          path: filePath,
          sessionId,
        })
        applyState(result)
        appendMeta("[Git] " + (result.message || label + "已完成。"))
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        gitBusy = false
        updateControls()
        renderChanges(latestChanges)
      }
    }

    async function runGitHunkAction(filePath, hunkIndex, action) {
      const sessionId = state.activeSessionId
      if (!sessionId || gitBusy || !filePath || !Number.isInteger(hunkIndex)) return
      const label = action === "stage" ? "暂存 hunk" : "撤销 hunk"
      if (
        action === "revert" &&
        !window.confirm("撤销文件「" + filePath + "」中的这个 hunk？")
      ) {
        return
      }

      gitBusy = true
      updateControls()
      renderChanges(latestChanges)
      try {
        const result = await postJson("/api/git/hunk", {
          action,
          hunkIndex,
          path: filePath,
          sessionId,
        })
        applyState(result)
        appendMeta("[Git] " + (result.message || label + "已完成。"))
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        gitBusy = false
        updateControls()
        renderChanges(latestChanges)
      }
    }

    async function commitStagedChangesFromUi() {
      const sessionId = state.activeSessionId
      const message = els.gitCommitMessage.value.trim()
      if (!sessionId || gitBusy || !message) return

      gitBusy = true
      updateControls()
      renderChanges(latestChanges)
      try {
        const result = await postJson("/api/git/commit", {
          message,
          sessionId,
        })
        els.gitCommitMessage.value = ""
        applyState(result)
        appendMeta("[Git] " + (result.message || "提交已完成。"))
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        gitBusy = false
        updateControls()
        renderChanges(latestChanges)
      }
    }

    async function suggestCommitMessageFromUi() {
      const sessionId = state.activeSessionId
      if (!sessionId || gitBusy) return

      gitBusy = true
      updateControls()
      renderChanges(latestChanges)
      try {
        const result = await postJson("/api/git/commit-message", { sessionId })
        if (result.suggestion) {
          els.gitCommitMessage.value = result.suggestion
        }
        applyState(result)
        appendMeta("[Git] " + (result.message || "已生成提交信息。"))
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        gitBusy = false
        updateControls()
        renderChanges(latestChanges)
      }
    }

    async function pushCurrentBranchFromUi() {
      const sessionId = state.activeSessionId
      const gitState = latestChanges.git || {}
      if (!sessionId || gitBusy || !gitState.canPush) return
      const label = gitState.branch
        ? "推送当前分支「" + gitState.branch + "」到远端？"
        : "推送当前分支到远端？"
      if (!window.confirm(label)) return

      gitBusy = true
      updateControls()
      renderChanges(latestChanges)
      try {
        const result = await postJson("/api/git/push", { sessionId })
        applyState(result)
        appendMeta("[Git] " + (result.message || "推送已完成。"))
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        gitBusy = false
        updateControls()
        renderChanges(latestChanges)
      }
    }

    async function createPullRequestFromUi() {
      const sessionId = state.activeSessionId
      const gitState = latestChanges.git || {}
      if (!sessionId || gitBusy || !gitState.canCreatePullRequest) return
      const label = gitState.branch
        ? "创建当前分支「" + gitState.branch + "」的 Draft PR？"
        : "创建当前分支的 Draft PR？"
      if (!window.confirm(label)) return

      gitBusy = true
      updateControls()
      renderChanges(latestChanges)
      try {
        const result = await postJson("/api/git/pr", { sessionId })
        applyState(result)
        appendMeta("[Git] " + (result.message || "Draft PR 已创建。"))
        if (result.pullRequest && result.pullRequest.url) {
          window.open(result.pullRequest.url, "_blank", "noopener")
        }
        await refreshChanges()
      } catch (error) {
        appendMeta("[错误] " + error.message, true)
      } finally {
        gitBusy = false
        updateControls()
        renderChanges(latestChanges)
      }
    }

    function gitFileActionLabel(action) {
      if (action === "stage") return "暂存"
      if (action === "unstage") return "取消暂存"
      return "撤销文件"
    }

    async function cancelActiveSession() {
      const cancelSessionId = state.activeSessionId
      if (!cancelSessionId || !isSessionActivelyRunning(cancelSessionId)) return

      try {
        const result = await postJson("/api/cancel", { sessionId: cancelSessionId })
        appendMeta("[取消] " + result.message, false, cancelSessionId)
      } catch (error) {
        appendMeta("[错误] " + error.message, true, cancelSessionId)
      }
    }

    async function setPermissionMode(permissionMode) {
      const previousMode = state.permissionMode || "full_access"
      try {
        const result = await postJson("/api/permissions", { permissionMode })
        applyState(result)
        appendMeta("[权限] " + (result.message || "权限模式已更新。"))
      } catch (error) {
        renderPermissionModeControl(previousMode)
        appendMeta("[错误] " + error.message, true)
      }
    }

    els.openProjectForm.addEventListener("submit", (event) => {
      event.preventDefault()
      void pickProject()
    })

    els.openProjectBtn.addEventListener("click", pickProject)
	    els.attachmentBtn.addEventListener("click", () => {
	      if (!els.attachmentBtn.disabled) els.attachmentInput.click()
	    })
	    els.attachmentInput.addEventListener("change", () => {
      addAttachmentFiles(els.attachmentInput.files)
      els.attachmentInput.value = ""
    })

    els.newSessionBtn.addEventListener("click", () => createNewSession("local"))
    els.newWorktreeSessionBtn.addEventListener("click", () => createNewSession("worktree"))
    els.permissionModeButton.addEventListener("click", () => {
      if (!els.permissionModeButton.disabled) {
        setPermissionModeMenuOpen(els.permissionModeMenu.hidden)
      }
    })
    els.permissionModeMenu.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null
      const option = target ? target.closest("[data-permission-mode]") : null
      if (option && !option.disabled) {
        const nextMode = option.dataset.permissionMode
        setPermissionModeMenuOpen(false)
        if (nextMode && nextMode !== (state.permissionMode || "full_access")) {
          void setPermissionMode(nextMode)
        }
      }
    })
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Node) || !els.permissionModePicker.contains(event.target)) {
        setPermissionModeMenuOpen(false)
      }
    })
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setPermissionModeMenuOpen(false)
    })
    els.themeModeSelect.addEventListener("change", () => {
      setThemeMode(els.themeModeSelect.value)
    })
    els.popoutBtn.addEventListener("click", openConversationPopout)
    els.moveWorkspaceBtn.addEventListener("click", moveActiveSessionWorkspace)
    els.discardSessionBtn.addEventListener("click", discardActiveSessionChanges)
    els.guideModeBtn.addEventListener("click", () => {
      if (!els.guideModeBtn.disabled) setGuideMode(!guideMode)
    })
    els.messages.addEventListener("scroll", updateMessagesAutoFollow, { passive: true })
    els.composer.addEventListener("wheel", forwardComposerWheelToMessages, { passive: false })
    els.scrollBottomBtn.addEventListener("click", () => scrollMessagesToBottom("smooth"))
    els.changesFloat.addEventListener("click", () => {
      setReviewPanelHidden(false)
    })

    els.changesTab.addEventListener("click", () => setReviewMode("changes"))
    els.browserTab.addEventListener("click", () => setReviewMode("browser"))
    els.artifactsTab.addEventListener("click", () => setReviewMode("artifacts"))
    els.terminalTab.addEventListener("click", () => setReviewMode("terminal"))
    els.extensionsTab.addEventListener("click", () => setReviewMode("extensions"))
    els.memoryTab.addEventListener("click", () => setReviewMode("memory"))
    els.automationsTab.addEventListener("click", () => setReviewMode("automations"))
    els.artifactPath.addEventListener("input", updateControls)
    els.artifactForm.addEventListener("submit", (event) => {
      event.preventDefault()
      void previewArtifact()
    })
    els.extensionsRefreshBtn.addEventListener("click", () => {
      void refreshExtensions()
    })
    els.memoryScope.addEventListener("change", () => {
      memoryDirty = false
      renderMemory()
      updateControls()
    })
    els.memoryEnabled.addEventListener("change", () => {
      void setActiveMemoryEnabled(els.memoryEnabled.checked)
    })
    els.memoryEditor.addEventListener("input", () => {
      memoryDirty = true
      updateControls()
    })
    ;[els.memoryFacts, els.memoryPreferences, els.memoryTodos].forEach((input) => {
      input.addEventListener("input", () => {
        memoryDirty = true
        updateControls()
      })
    })
    els.memoryStructuredApplyBtn.addEventListener("click", applyStructuredMemory)
    els.memoryRefreshBtn.addEventListener("click", () => {
      void refreshMemory({ confirmDiscard: true, resetDirty: true })
    })
    els.memorySaveBtn.addEventListener("click", () => {
      void saveActiveMemory()
    })
    els.memoryClearBtn.addEventListener("click", () => {
      void clearActiveMemory()
    })
    els.memorySearchQuery.addEventListener("input", updateControls)
    els.memorySearchForm.addEventListener("submit", (event) => {
      event.preventDefault()
      void searchMemory()
    })
    els.automationScheduleMode.addEventListener("change", updateAutomationScheduleEditor)
    els.automationInterval.addEventListener("input", () => {
      updateControls()
      scheduleAutomationPreview()
    })
    els.automationCron.addEventListener("input", () => {
      updateControls()
      scheduleAutomationPreview()
    })
    els.automationPrompt.addEventListener("input", updateControls)
    els.automationForm.addEventListener("submit", (event) => {
      event.preventDefault()
      void createAutomation()
    })
    els.terminalCommand.addEventListener("input", updateControls)
    els.terminalCommand.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        void startTerminalCommand()
      }
    })
    els.terminalInput.addEventListener("input", updateControls)
    els.terminalInputForm.addEventListener("submit", (event) => {
      event.preventDefault()
      void sendTerminalInput()
    })
    els.terminalSearchQuery.addEventListener("input", () => {
      updateTerminalSearch({ scrollFirst: true })
      updateControls()
    })
    els.terminalSearchClearBtn.addEventListener("click", () => {
      els.terminalSearchQuery.value = ""
      updateTerminalSearch()
      updateControls()
    })
    els.terminalForm.addEventListener("submit", (event) => {
      event.preventDefault()
      void startTerminalCommand()
    })
    els.terminalStopBtn.addEventListener("click", () => {
      void stopActiveTerminal()
    })
    els.terminalCopyBtn.addEventListener("click", () => {
      void copyActiveTerminalOutput()
    })
    els.browserForm.addEventListener("submit", (event) => {
      event.preventDefault()
      openBrowserPreview(els.browserUrl.value)
    })
    els.browserUrl.addEventListener("input", updateControls)
    els.browserInspectBtn.addEventListener("click", () => {
      void inspectBrowserPage()
    })
    els.browserMcpBtn.addEventListener("click", () => {
      void enablePlaywrightMcp()
    })
    els.browserAnnotateBtn.addEventListener("click", () => {
      if (!els.browserAnnotateBtn.disabled) setBrowserAnnotating(!browserAnnotating)
    })
    els.browserOverlay.addEventListener("click", draftBrowserPoint)
    els.browserFeedback.addEventListener("input", updateControls)
    els.browserFeedbackForm.addEventListener("submit", (event) => {
      event.preventDefault()
      submitBrowserFeedback()
    })

    els.authForm.addEventListener("submit", async (event) => {
      event.preventDefault()
      const apiKey = els.authApiKey.value.trim()
      if (!apiKey || authBusy) return

      authBusy = true
      updateControls()
      setToast(els.authToast, "")
      updateAuthGate("正在验证 API Key，并加载可用模型...")
      try {
        const result = await postJson("/api/key", {
          apiKey,
          save: Boolean(state.canPersistApiKey && els.authSaveKey.checked),
        })
        els.authApiKey.value = ""
        applyState(result)
        renderModelOptions(result.choices || [], result.current)
        setToast(els.authToast, result.message)
      } catch (error) {
        setToast(els.authToast, error.message, true)
        updateAuthGate("验证失败，请重新输入")
      } finally {
        authBusy = false
        updateControls()
      }
    })

    els.modelSelect.addEventListener("click", (event) => {
      event.stopPropagation()
      setModelParamPopoverOpen(false)
      setModelMenuOpen(els.modelMenu.hidden)
    })

    els.modelMenu.addEventListener("click", (event) => {
      event.stopPropagation()
    })

    els.modelSearch.addEventListener("input", () => {
      modelSearchQuery = els.modelSearch.value
      renderModelMenu(buildModelChoiceGroups(modelChoices), els.modelSelect.dataset.modelId || "")
    })

    els.modelParamToggle.addEventListener("click", (event) => {
      event.stopPropagation()
      setModelMenuOpen(false)
      setModelParamPopoverOpen(els.modelParamPopover.hidden)
    })

    els.modelParamPopover.addEventListener("click", (event) => {
      event.stopPropagation()
    })

    document.addEventListener("click", (event) => {
      if (!els.modelPicker.contains(event.target)) {
        setModelMenuOpen(false)
        setModelParamPopoverOpen(false)
      }
    })

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setModelMenuOpen(false)
        setModelParamPopoverOpen(false)
        if (reviewMode === "terminal" && activeTerminalStatus() === "running") {
          event.preventDefault()
          void stopActiveTerminal()
        }
      }
    })

    els.refreshChangesBtn.addEventListener("click", async () => {
      try {
        await refreshChanges()
      } catch (error) {
        els.changesSummary.textContent = error.message
      }
    })

    els.gitCommitMessage.addEventListener("input", updateControls)
    els.gitCommitMessage.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        void commitStagedChangesFromUi()
      }
    })
    els.gitCommitBtn.addEventListener("click", () => {
      void commitStagedChangesFromUi()
    })
    els.gitSuggestCommitBtn.addEventListener("click", () => {
      void suggestCommitMessageFromUi()
    })
    els.gitPushBtn.addEventListener("click", () => {
      void pushCurrentBranchFromUi()
    })
    els.gitPrBtn.addEventListener("click", () => {
      void createPullRequestFromUi()
    })

    els.reviewToggleBtn.addEventListener("click", () => {
      setReviewPanelHidden(!reviewPanelHidden)
    })

    els.reviewCollapseBtn.addEventListener("click", () => {
      setReviewPanelHidden(true)
    })

    els.reviewResizeHandle.addEventListener("pointerdown", startReviewResize)
    window.addEventListener("pointermove", moveReviewResize)
    window.addEventListener("pointerup", finishReviewResize)
    window.addEventListener("pointercancel", finishReviewResize)
    window.addEventListener("resize", () => {
      if (!reviewPanelHidden) applyReviewPanelLayout()
    })

    els.changesFilter.addEventListener("input", () => {
      renderChanges(latestChanges)
    })

    els.composer.addEventListener("dragover", (event) => {
      if (!event.dataTransfer || event.dataTransfer.types.indexOf("Files") === -1) return
      event.preventDefault()
      els.composer.classList.add("drag-over")
    })

    els.composer.addEventListener("dragleave", (event) => {
      if (!els.composer.contains(event.relatedTarget)) {
        els.composer.classList.remove("drag-over")
      }
    })

    els.composer.addEventListener("drop", (event) => {
      if (!event.dataTransfer || event.dataTransfer.files.length === 0) return
      event.preventDefault()
      els.composer.classList.remove("drag-over")
      addAttachmentFiles(event.dataTransfer.files)
    })

    els.composer.addEventListener("submit", async (event) => {
      event.preventDefault()
      const prompt = els.prompt.value.trim()
      const attachmentSnapshot = pendingAttachments.slice()
      if (!state.activeSessionId) return
      if (prompt.startsWith("/") && attachmentSnapshot.length === 0) {
        try {
          const handled = await handleSlashCommand(prompt)
          if (handled) {
            els.prompt.value = ""
            resizePrompt()
            updateControls()
            return
          }
        } catch (error) {
          appendMeta("[错误] " + error.message, true)
          return
        }
      }
      if (!prompt && attachmentSnapshot.length === 0) {
        if (isActiveSessionActivelyRunning()) {
          await cancelActiveSession()
        }
        return
      }
	      const runSessionId = state.activeSessionId
      const activeAtSubmit = isActiveSessionRunning()
      const runMode = "normal"
      const runId = createClientRunId()
      let attachments = []

      try {
        attachments = await buildAttachmentPayload()
      } catch (error) {
        appendMeta("[错误] 附件读取失败：" + error.message, true, runSessionId)
        return
      }

	      messagesAutoFollow = true
      recordPromptHistory(prompt)
      const formattedUserMessage = formatUserMessageWithAttachments(prompt, attachments)
      if (activeAtSubmit) {
        activeQueuedRuns(runSessionId).push({
          mode: runMode,
          runId,
          text: formattedUserMessage,
        })
        renderQueuedRunList()
      } else {
        appendMessage(
          runMode === "guide" ? "user guide" : "user",
          formattedUserMessage,
          runSessionId
        )
        const messages = activeMessages(runSessionId)
        const appendedMessage = messages[messages.length - 1]
        if (appendedMessage && isUserMessage(appendedMessage)) {
          appendedMessage.runId = runId
        }
      }
	      els.prompt.value = ""
      clearPendingAttachments()
	      resizePrompt()
      if (!activeAtSubmit) {
        resetStreamingState(runSessionId)
        renderChanges({
          available: true,
          files: [],
          message: "正在跟踪本次聊天的代码变更。",
        })
      }
      if (runMode === "guide") setGuideMode(false)
      addLocalSessionRunRef(runSessionId)

	      try {
	        await streamPost("/api/run", {
            attachments,
            sessionId: runSessionId,
	          prompt: prompt || "请查看附件。",
            mode: runMode,
            runId,
	          multiAgent: els.multiAgentMode.checked,
	        }, (payload) => handleStreamEvent(payload, runSessionId, runId))
      } catch (error) {
        flushAssistantQueue(runSessionId, true)
        finishThinking(runSessionId)
        appendMeta("[错误] " + error.message, true, runSessionId)
	      } finally {
        flushAssistantQueue(runSessionId, true)
        finishRunTimer(runSessionId)
        finishThinking(runSessionId)
        streamingAssistants.delete(runSessionId)
        streamingMultiRuns.delete(runSessionId)
        try {
          await refreshStatus()
        } finally {
          releaseLocalSessionRunRef(runSessionId)
        }
        await refreshChanges()
      }
    })

    els.prompt.addEventListener("input", () => {
      resizePrompt()
      updateControls()
    })
	    els.prompt.addEventListener("paste", (event) => {
	      const files = event.clipboardData && event.clipboardData.files
	      if (files && files.length > 0) {
	        event.preventDefault()
	        addAttachmentFiles(files)
	        return
	      }
	
	      const text = event.clipboardData && event.clipboardData.getData("text/plain")
	      if (addPastedTextAttachment(text)) {
	        event.preventDefault()
	      }
	    })
    els.authApiKey.addEventListener("input", updateControls)
    els.sessionSearch.addEventListener("input", renderSidebar)
    els.sessionShowArchived.addEventListener("change", renderSidebar)
    els.prompt.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        if (navigatePromptHistory(-1)) {
          event.preventDefault()
          return
        }
      }
      if (event.key === "ArrowDown" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        if (navigatePromptHistory(1)) {
          event.preventDefault()
          return
        }
      }
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
      ) {
        event.preventDefault()
        els.composer.requestSubmit()
      }
    })

    applyWindowMode()
    applyThemeMode()
    setupWindowSync()
    loadReviewPanelPrefs()
    setReviewMode(reviewMode)
    resizePrompt()
    if (els.composerWrap && typeof window.ResizeObserver === "function") {
      const composerResizeObserver = new window.ResizeObserver(syncComposerReservedSpace)
      composerResizeObserver.observe(els.composerWrap)
    }
    window.addEventListener("resize", syncComposerReservedSpace)
    syncComposerReservedSpace()
    updateAutomationScheduleEditor()

    async function initializeApp() {
      await refreshStatus()
      await Promise.all([refreshModels(), refreshChanges()])
    }

    initializeApp().catch((error) => {
      setToast(els.authToast, error.message, true)
      updateAuthGate("无法完成初始化")
    })`
