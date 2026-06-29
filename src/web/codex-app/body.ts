export const codexAppBody = `  <section class="auth-screen" id="authScreen" aria-label="API Key 登录">
    <form class="auth-panel" id="authForm">
      <div class="auth-brand">Coding Agent</div>
      <h1>输入 API Key</h1>
      <p>验证密钥并加载可用模型后进入工作台。</p>
      <label>
        <span>CURSOR_API_KEY</span>
        <input id="authApiKey" type="password" autocomplete="off" placeholder="crsr_...">
      </label>
      <label class="check" id="authSaveKeyRow">
        <input id="authSaveKey" type="checkbox">
        <span>保存到 Windows 用户环境变量</span>
      </label>
      <button id="authSubmitBtn" class="primary" type="submit">进入</button>
      <div class="toast" id="authToast"></div>
      <div class="auth-status" id="authStatus">等待输入密钥</div>
    </form>
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
            <button id="reviewToggleBtn" class="review-toggle" type="button" aria-pressed="true" title="隐藏审查">审查</button>
          </div>
        </header>

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
	            <textarea id="prompt" placeholder="要求后续变更"></textarea>
	            <div class="composer-footer">
	              <div class="composer-actions">
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
	                <div class="model-picker" id="modelPicker">
	                  <button class="model-picker-button" id="modelPickerButton" type="button" aria-haspopup="true" aria-expanded="false">
	                    <span class="model-picker-label" id="modelPickerLabel">选择模型</span>
	                    <span class="model-picker-caret" aria-hidden="true">⌄</span>
	                  </button>
	                  <div class="model-menu" id="modelMenu" hidden>
	                    <section class="model-menu-list" aria-label="模型列表">
	                      <input class="model-search" id="modelSearch" autocomplete="off" placeholder="Search models">
	                      <button class="model-mode-row" id="modelAutoToggle" type="button" aria-pressed="false">
	                        <span>Auto</span>
	                        <span class="model-switch" aria-hidden="true"><span></span></span>
	                      </button>
	                      <button class="model-mode-row" id="modelMaxToggle" type="button" aria-pressed="false">
	                        <span>MAX Mode</span>
	                        <span class="model-switch" aria-hidden="true"><span></span></span>
	                      </button>
	                      <div class="model-list" id="modelList"></div>
	                      <button class="model-add" id="modelAddButton" type="button">Add Models</button>
	                    </section>
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
          <button class="review-tab active" type="button">上轮对话</button>
          <div class="changes-summary" id="changesSummary">请先打开项目。</div>
        </div>

        <div class="review-workspace">
          <section class="diff-review" aria-label="代码 diff">
            <div class="changes-list" id="changesList"></div>
          </section>

          <aside class="file-review" aria-label="变更文件">
            <div class="file-review-toolbar" aria-label="文件视图操作">
              <button type="button" title="更多" aria-label="更多">...</button>
              <button type="button" title="展开全部" aria-label="展开全部">⌘</button>
              <button type="button" title="文件树" aria-label="文件树">□</button>
            </div>
            <input id="changesFilter" autocomplete="off" placeholder="筛选文件...">
            <div class="change-tree" id="changeTree"></div>
          </aside>
        </div>
      </aside>
    </main>
  </div>
`
