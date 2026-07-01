export const codexAppBody = `  <section class="auth-screen" id="authScreen" aria-label="API Key 登录">
    <div class="auth-shell">
      <div class="auth-intro">
        <div class="auth-brand">
          <span class="auth-brand-mark" aria-hidden="true">CA</span>
          <span>Coding Agent</span>
        </div>
        <h1>本地 Agent 工作台</h1>
        <p>连接 Cursor SDK 后，打开项目、提交任务、查看变更审查都在这里完成。</p>
        <div class="auth-highlights" aria-label="工作台能力">
          <div><strong>Local</strong><span>会话默认完全访问</span></div>
          <div><strong>Review</strong><span>变更审查和撤销</span></div>
          <div><strong>Tools</strong><span>附件、终端、浏览器</span></div>
        </div>
      </div>

      <form class="auth-panel" id="authForm">
        <div class="auth-panel-head">
          <div class="auth-kicker">CURSOR_API_KEY</div>
          <h2>输入 API Key</h2>
          <p>验证密钥并加载可用模型后进入工作台。</p>
        </div>
        <label class="auth-field">
          <span>API Key</span>
          <input id="authApiKey" type="password" autocomplete="off" placeholder="crsr_...">
        </label>
        <label class="check auth-save" id="authSaveKeyRow">
          <input id="authSaveKey" type="checkbox">
          <span>保存到项目，下次自动加载</span>
        </label>
        <button id="authSubmitBtn" class="primary" type="submit">进入工作台</button>
        <div class="toast" id="authToast"></div>
        <div class="auth-status" id="authStatus" role="status" aria-live="polite">等待输入密钥</div>
      </form>
    </div>
  </section>

  <div class="app-shell" aria-hidden="true">
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
        <button class="nav-button secondary" id="newWorktreeSessionBtn" type="button">
          <span class="icon">↥</span>
          <span>Worktree</span>
        </button>
      </nav>

      <form class="open-project" id="openProjectForm">
        <button class="primary" id="openProjectBtn" type="button">打开项目</button>
        <div class="toast" id="projectToast"></div>
      </form>

      <div class="session-filter">
        <input id="sessionSearch" type="search" autocomplete="off" placeholder="搜索会话">
        <label>
          <input id="sessionShowArchived" type="checkbox">
          <span>归档</span>
        </label>
      </div>

      <div class="sidebar-heading">
        <div class="sidebar-heading-title">
          <span>项目</span>
          <span class="sidebar-heading-chevron" aria-hidden="true">⌄</span>
        </div>
        <div class="sidebar-heading-actions" aria-hidden="true">
          <span>↙</span>
          <span>…</span>
        </div>
      </div>
      <div class="project-list" id="projectList"></div>

      <div class="sidebar-bottom"></div>
    </aside>

    <main class="main" id="main">
      <section class="conversation" id="conversation">
        <header class="topbar">
          <div class="title-wrap">
            <div class="page-title" id="pageTitle">打开项目</div>
            <div class="page-subtitle" id="cwd">启动时未指定项目</div>
          </div>
          <div class="toolbar">
            <span class="workspace-badge" id="workspaceBadge" hidden>Local</span>
            <select id="themeModeSelect" class="theme-select" title="主题" aria-label="主题">
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
            <button id="moveWorkspaceBtn" class="workspace-action" type="button" title="迁移会话工作区" hidden>迁移</button>
            <button id="discardSessionBtn" class="workspace-action danger" type="button" title="撤销本轮会话变更" hidden>撤销</button>
            <button id="popoutBtn" class="popout-button" type="button" title="弹出对话窗口" aria-label="弹出对话窗口">弹出</button>
            <button id="reviewToggleBtn" class="review-toggle" type="button" aria-pressed="true" title="隐藏审查">审查</button>
          </div>
        </header>

        <div class="approval-panel" id="approvalPanel" aria-live="polite" hidden></div>

        <div class="messages" id="messages"></div>

        <div class="composer-wrap">
          <div class="composer-floats" aria-live="polite">
            <button class="scroll-bottom-btn" id="scrollBottomBtn" type="button" aria-label="滚动到底部" title="滚动到底部" hidden>↓</button>
            <button class="changes-float" id="changesFloat" type="button" aria-label="打开变更审查" title="打开变更审查" hidden>
              <span class="changes-float-label" id="changesFloatLabel"></span>
              <span class="change-add" id="changesFloatAdd"></span>
              <span class="change-del" id="changesFloatDel"></span>
            </button>
          </div>
          <form class="composer" id="composer">
            <input id="attachmentInput" type="file" multiple hidden>
            <div class="attachment-list" id="attachmentList" aria-live="polite" hidden></div>
            <div class="queued-run-list" id="queuedRunList" aria-live="polite" hidden></div>
	            <textarea id="prompt" placeholder="要求后续变更"></textarea>
	            <div class="composer-footer">
	              <div class="composer-actions">
                  <button class="attachment-button" id="attachmentBtn" type="button" aria-label="添加附件" title="添加图片或文件">＋</button>
                  <div class="permission-picker" id="permissionModePicker">
                    <button class="permission-mode-button" id="permissionModeButton" type="button" data-mode="full_access" aria-expanded="false" aria-haspopup="menu" aria-label="权限访问">
                      <span class="permission-mode-icon" aria-hidden="true">!</span>
                      <span class="permission-mode-label" id="permissionModeLabel">完全访问</span>
                      <span class="permission-mode-chevron" aria-hidden="true">⌄</span>
                    </button>
                    <div class="permission-menu" id="permissionModeMenu" role="menu" aria-label="权限访问" hidden>
                      <button class="permission-menu-option" type="button" data-permission-mode="read_only" role="menuitemradio" aria-checked="false">
                        <span class="permission-option-icon" aria-hidden="true">?</span>
                        <span class="permission-option-copy">
                          <strong>请求批准</strong>
                          <small>只允许读取和搜索，写入前需要切换权限</small>
                        </span>
                        <span class="permission-option-check" aria-hidden="true">✓</span>
                      </button>
                      <button class="permission-menu-option" type="button" data-permission-mode="auto" role="menuitemradio" aria-checked="false">
                        <span class="permission-option-icon" aria-hidden="true">⌁</span>
                        <span class="permission-option-copy">
                          <strong>替我审批</strong>
                          <small>仅对检测到的风险操作请求批准</small>
                        </span>
                        <span class="permission-option-check" aria-hidden="true">✓</span>
                      </button>
                      <button class="permission-menu-option active" type="button" data-permission-mode="full_access" role="menuitemradio" aria-checked="true">
                        <span class="permission-option-icon" aria-hidden="true">!</span>
                        <span class="permission-option-copy">
                          <strong>完全访问权限</strong>
                          <small>可不受限制地访问互联网和本机文件</small>
                        </span>
                        <span class="permission-option-check" aria-hidden="true">✓</span>
                      </button>
                    </div>
                  </div>
		                <div class="context-meter" id="contextMeter" tabindex="0" aria-label="上下文使用量" aria-describedby="contextPopover" aria-disabled="true">
	                  <span class="context-meter-ring" aria-hidden="true"></span>
	                  <span class="context-meter-label" id="contextMeterText">--</span>
	                  <div class="context-popover" id="contextPopover" role="tooltip">
	                    <div class="context-popover-title" id="contextPopoverTitle">上下文预算：</div>
	                    <div class="context-popover-percent" id="contextPopoverPercent">暂无会话</div>
	                    <div class="context-popover-tokens" id="contextPopoverTokens">打开项目并新建会话后显示</div>
	                  </div>
	                </div>
	                <label class="composer-mode">
	                  <input id="multiAgentMode" type="checkbox">
	                  <span>多 Agent</span>
	                </label>
	                <button class="guide-toggle" id="guideModeBtn" type="button" aria-pressed="false" title="引导纠正" hidden>引导</button>
	                <div class="model-picker" id="modelPicker">
	                  <button class="model-select model-base-button" id="modelSelect" type="button" aria-expanded="false" aria-haspopup="listbox" aria-label="选择模型">加载模型</button>
	                  <div class="model-menu" id="modelMenu" role="dialog" aria-label="选择模型" hidden>
	                    <input class="model-search" id="modelSearch" type="search" placeholder="搜索模型" autocomplete="off">
	                    <div class="model-list" id="modelList" role="listbox"></div>
	                  </div>
	                  <button class="model-param-toggle" id="modelParamToggle" type="button" aria-expanded="false" aria-label="模型参数" title="模型参数" hidden>参数</button>
	                  <div class="model-param-popover" id="modelParamPopover" role="dialog" aria-label="模型参数" hidden>
	                    <div class="model-param-list" id="modelParamList"></div>
	                  </div>
	                </div>
	                <button class="send primary" id="sendBtn" type="submit" aria-label="发送">↑</button>
	              </div>
            </div>
          </form>
        </div>
      </section>

      <aside class="side-panel" id="sidePanel" aria-label="审查">
        <div class="side-panel-resizer" id="reviewResizeHandle" role="separator" aria-orientation="vertical" aria-label="调整审查栏宽度"></div>
        <header class="review-header">
          <div class="review-title">
            <span class="review-title-icon" aria-hidden="true">⊞</span>
            <span>审查</span>
          </div>
          <div class="review-header-actions" aria-label="审查操作">
            <button id="refreshChangesBtn" type="button" title="刷新变更" aria-label="刷新变更">↻</button>
            <button id="reviewCollapseBtn" type="button" title="隐藏审查" aria-label="隐藏审查">›</button>
          </div>
        </header>

        <div class="review-switcher">
          <button class="review-tab active" id="changesTab" type="button">上轮对话</button>
          <button class="review-tab" id="browserTab" type="button">浏览器</button>
          <button class="review-tab" id="artifactsTab" type="button">产物</button>
          <button class="review-tab" id="terminalTab" type="button">终端</button>
          <button class="review-tab" id="extensionsTab" type="button">扩展</button>
          <button class="review-tab" id="memoryTab" type="button">记忆</button>
          <button class="review-tab" id="automationsTab" type="button">自动化</button>
          <div class="changes-summary" id="changesSummary">请先打开项目。</div>
        </div>

        <div class="git-commit-bar" id="gitCommitBar" hidden>
          <input id="gitCommitMessage" autocomplete="off" placeholder="提交信息">
          <button id="gitSuggestCommitBtn" type="button">生成</button>
          <button id="gitCommitBtn" type="button">提交</button>
          <button id="gitPushBtn" type="button">推送</button>
          <button id="gitPrBtn" type="button">PR</button>
        </div>

        <div class="review-workspace" id="reviewWorkspace">
          <section class="diff-review" aria-label="代码 diff">
            <div class="changes-list" id="changesList"></div>
          </section>

          <aside class="file-review" aria-label="变更文件">
            <input id="changesFilter" autocomplete="off" placeholder="筛选文件...">
            <div class="change-tree" id="changeTree"></div>
          </aside>
        </div>

        <div class="browser-workspace" id="browserWorkspace" hidden>
          <form class="browser-bar" id="browserForm">
            <input id="browserUrl" type="url" placeholder="http://localhost:3000" autocomplete="off">
            <button id="browserOpenBtn" type="submit">打开</button>
            <button id="browserInspectBtn" type="button">检查</button>
            <button id="browserAnnotateBtn" type="button" aria-pressed="false">标注</button>
            <button id="browserMcpBtn" type="button">启用 MCP</button>
          </form>
          <div class="browser-stage" id="browserStage">
            <iframe id="browserFrame" title="页面预览" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
            <div class="browser-overlay" id="browserOverlay" aria-label="页面标注层"></div>
          </div>
          <div class="browser-inspection" id="browserInspection"></div>
          <div class="browser-comments" id="browserComments"></div>
          <form class="browser-feedback" id="browserFeedbackForm">
            <textarea id="browserFeedback" placeholder="记录这个页面上的视觉问题"></textarea>
            <button id="browserFeedbackBtn" type="submit">发送反馈</button>
          </form>
        </div>

        <div class="artifacts-workspace" id="artifactsWorkspace" hidden>
          <form class="artifact-bar" id="artifactForm">
            <input id="artifactPath" autocomplete="off" placeholder="dist/report.pdf">
            <button id="artifactPreviewBtn" type="submit">预览</button>
          </form>
          <div class="artifact-preview" id="artifactPreview"></div>
        </div>

        <div class="terminal-workspace" id="terminalWorkspace" hidden>
          <form class="terminal-bar" id="terminalForm">
            <input id="terminalCommand" autocomplete="off" placeholder="npm run typecheck">
            <button id="terminalRunBtn" type="submit">运行</button>
            <button id="terminalStopBtn" type="button">停止</button>
            <button id="terminalCopyBtn" type="button">复制</button>
          </form>
          <div class="terminal-run-list" id="terminalRunList" aria-label="终端历史"></div>
          <div class="terminal-search">
            <input id="terminalSearchQuery" autocomplete="off" placeholder="搜索当前输出">
            <span id="terminalSearchResult"></span>
            <button id="terminalSearchClearBtn" type="button">清空</button>
          </div>
          <form class="terminal-input-bar" id="terminalInputForm">
            <input id="terminalInput" autocomplete="off" placeholder="向运行中的终端发送输入">
            <button id="terminalInputBtn" type="submit">发送</button>
          </form>
          <div class="terminal-output" id="terminalOutput" aria-live="polite"></div>
        </div>

        <div class="extensions-workspace" id="extensionsWorkspace" hidden>
          <div class="extensions-toolbar">
            <span id="extensionsConfigPath"></span>
            <button id="extensionsRefreshBtn" type="button">刷新</button>
          </div>
          <div class="extensions-list" id="extensionsList"></div>
        </div>

        <div class="memory-workspace" id="memoryWorkspace" hidden>
          <div class="memory-toolbar">
            <select id="memoryScope">
              <option value="project">项目记忆</option>
              <option value="user">用户记忆</option>
            </select>
            <span id="memoryPath"></span>
            <label class="memory-enabled"><input id="memoryEnabled" type="checkbox" checked> 注入 prompt</label>
            <button id="memoryRefreshBtn" type="button">刷新</button>
          </div>
          <div class="memory-structured" id="memoryStructured">
            <textarea id="memoryFacts" placeholder="事实：每行一条"></textarea>
            <textarea id="memoryPreferences" placeholder="偏好：每行一条"></textarea>
            <textarea id="memoryTodos" placeholder="待办：每行一条"></textarea>
            <button id="memoryStructuredApplyBtn" type="button">生成结构化记忆</button>
          </div>
          <textarea id="memoryEditor" placeholder="保存会持续注入后续 agent prompt 的长期记忆"></textarea>
          <div class="memory-actions">
            <button id="memorySaveBtn" type="button">保存</button>
            <button id="memoryClearBtn" type="button">清空</button>
          </div>
          <form class="memory-search" id="memorySearchForm">
            <input id="memorySearchQuery" autocomplete="off" placeholder="搜索用户和项目记忆">
            <button id="memorySearchBtn" type="submit">搜索</button>
          </form>
          <div class="session-memory-panel" id="sessionMemoryPanel"></div>
          <div class="memory-results" id="memoryResults"></div>
        </div>

        <div class="automations-workspace" id="automationsWorkspace" hidden>
          <form class="automation-form" id="automationForm">
            <input id="automationTitle" autocomplete="off" placeholder="每日检查">
            <select id="automationScheduleMode">
              <option value="interval">Interval</option>
              <option value="cron">Cron</option>
            </select>
            <input id="automationInterval" inputmode="numeric" min="1" type="number" value="60">
            <input id="automationCron" autocomplete="off" hidden placeholder="0 9 * * 1-5">
            <select id="automationPermission">
              <option value="auto">Auto</option>
              <option value="read_only">Read-only</option>
            </select>
            <button id="automationCreateBtn" type="submit">创建</button>
            <span class="automation-schedule-preview" id="automationSchedulePreview"></span>
            <textarea id="automationPrompt" placeholder="定期执行的任务 prompt"></textarea>
          </form>
          <div class="automations-list" id="automationsList"></div>
        </div>
      </aside>
    </main>
  </div>
`
