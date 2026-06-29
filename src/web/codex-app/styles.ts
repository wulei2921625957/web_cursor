export const codexAppStyles = `    :root {
      color-scheme: light dark;
      --bg: #fbfbfb;
      --sidebar: #f3f3f4;
      --panel: #ffffff;
      --panel-soft: #f6f6f7;
      --hover: #ededee;
      --selected: #e7e7e9;
      --text: #202124;
      --muted: #707178;
      --faint: #a5a6ad;
      --border: #e3e3e6;
      --accent: #f05a28;
      --accent-soft: #fff1eb;
      --danger: #b42318;
      --warning: #9a5b00;
      --success: #198754;
      --shadow: 0 16px 44px rgba(20, 20, 24, .10);
      --shadow-soft: 0 8px 28px rgba(20, 20, 24, .08);
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
        --warning: #ffd28a;
        --success: #66d19e;
        --shadow: 0 18px 50px rgba(0, 0, 0, .26);
        --shadow-soft: 0 10px 32px rgba(0, 0, 0, .22);
      }
    }

    * {
      box-sizing: border-box;
    }

    [hidden] {
      display: none !important;
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

    .auth-screen {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 24px;
    }

    .auth-panel {
      display: grid;
      width: min(420px, 100%);
      gap: 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 28px;
    }

    .auth-panel.auth-busy {
      border-color: color-mix(in srgb, var(--accent) 52%, var(--border));
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent),
        var(--shadow);
    }

    .auth-brand {
      color: var(--accent);
      font-size: 12px;
      font-weight: 760;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .auth-panel h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.2;
    }

    .auth-panel p {
      margin: 0 0 4px;
      color: var(--muted);
      line-height: 1.6;
    }

    .auth-panel label:not(.check) {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
    }

    .auth-panel input[type="password"] {
      height: 38px;
      padding: 0 10px;
      font-family: var(--mono);
      font-size: 13px;
    }

    .auth-panel .primary {
      height: 38px;
    }

    .auth-panel .primary.loading {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 1;
    }

    .auth-panel .primary.loading:disabled {
      cursor: progress;
      opacity: 1;
    }

    .auth-panel .primary.loading::before {
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, var(--bg) 54%, transparent);
      border-top-color: var(--bg);
      border-radius: 999px;
      content: "";
      animation: auth-spin .8s linear infinite;
    }

    .auth-status {
      display: flex;
      min-height: 32px;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--muted);
      font-size: 12px;
      padding: 0 10px;
    }

    .auth-status.loading {
      border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
      background: var(--accent-soft);
      color: var(--text);
    }

    .auth-status.loading::before {
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: var(--accent);
      content: "";
      animation: auth-pulse 1s ease-in-out infinite;
    }

    @keyframes auth-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes auth-pulse {
      0%,
      100% {
        opacity: .36;
      }

      50% {
        opacity: 1;
      }
    }

    body.authenticated .auth-screen,
    body:not(.authenticated) .app-shell {
      display: none;
    }

    .app-shell {
      display: grid;
      grid-template-columns: 326px minmax(0, 1fr);
      height: 100vh;
      min-height: 0;
      background: var(--bg);
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

    .nav-button.secondary {
      color: var(--muted);
    }

    .nav-button.secondary:hover:not(:disabled) {
      color: var(--text);
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

    .open-project .primary {
      width: 100%;
      min-height: 34px;
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

    .project-item {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 2px;
    }

    .project-row {
      flex: 1;
      min-height: 38px;
      min-width: 0;
      border-radius: 8px;
      padding: 5px 10px;
    }

    .project-item .project-row {
      width: auto;
    }

    .project-row.active,
    .session-row.active {
      background: var(--selected);
    }

    .session-row.running .icon {
      color: var(--accent);
      font-size: 10px;
    }

    .session-row.running .session-title {
      color: var(--text);
      font-weight: 620;
    }

    .project-title,
    .session-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-workspace-badge {
      display: inline-flex;
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      align-items: center;
      justify-content: center;
      border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
      border-radius: 999px;
      color: var(--accent);
      font-size: 10px;
      font-weight: 760;
      line-height: 1;
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

    .project-delete,
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

    .project-item:hover .project-delete,
    .project-delete:focus-visible,
    .session-item:hover .session-delete,
    .session-delete:focus-visible {
      opacity: 1;
    }

    .project-delete:hover:not(:disabled),
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

    .sidebar-bottom:empty {
      display: none;
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
      --review-panel-width: 46vw;
      display: grid;
      grid-template-columns: minmax(360px, 1fr) minmax(320px, var(--review-panel-width));
      min-width: 0;
      min-height: 0;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--panel) 76%, transparent), transparent 220px),
        var(--bg);
    }

    .main.review-hidden {
      grid-template-columns: minmax(0, 1fr);
    }

    .main.review-hidden .side-panel {
      display: none;
    }

    .conversation {
      position: relative;
      display: grid;
      grid-template-rows: 52px minmax(0, 1fr) auto;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .topbar {
      position: relative;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      border-bottom: 1px solid transparent;
      background: color-mix(in srgb, var(--bg) 88%, transparent);
      backdrop-filter: blur(18px);
      padding: 0 18px;
      transition:
        border-color .16s ease,
        box-shadow .16s ease,
        background .16s ease;
    }

    .conversation.messages-scrolled .topbar {
      border-bottom-color: var(--border);
      background: color-mix(in srgb, var(--panel) 88%, transparent);
      box-shadow: 0 1px 0 rgba(0, 0, 0, .02);
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
      min-height: 30px;
      border: 1px solid transparent;
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 620;
      padding: 0 11px;
    }

    .workspace-badge {
      display: inline-flex;
      min-height: 30px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      padding: 0 10px;
      white-space: nowrap;
    }

    .workspace-badge[data-mode="worktree"] {
      border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
      color: var(--accent);
    }

    .workspace-action:hover:not(:disabled) {
      border-color: var(--border);
      background: var(--panel-soft);
      color: var(--text);
    }

    .workspace-action.danger:hover:not(:disabled) {
      border-color: color-mix(in srgb, #b42318 35%, var(--border));
      color: #b42318;
    }

    .toolbar .review-toggle[aria-pressed="true"] {
      border-color: var(--border);
      background: var(--panel-soft);
      color: var(--text);
    }

    .messages {
      display: flex;
      min-height: 0;
      flex-direction: column;
      gap: 18px;
      overflow: auto;
      scroll-behavior: smooth;
      padding: 38px clamp(20px, 8vw, 168px) 160px;
      scrollbar-gutter: stable;
    }

    .message {
      max-width: 100%;
      line-height: 1.65;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .message.user {
      position: relative;
      display: grid;
      align-self: flex-end;
      width: fit-content;
      max-width: min(680px, 82%);
      gap: 12px;
      border-radius: 16px;
      background: color-mix(in srgb, var(--panel-soft) 94%, var(--panel));
      color: var(--text);
      padding: 10px 15px;
      font-size: 15px;
      font-weight: 560;
      white-space: normal;
    }

    .message.user.queued {
      padding-right: 138px;
    }

    .message.user.queued {
      border: 1px solid color-mix(in srgb, var(--muted) 20%, transparent);
      background: color-mix(in srgb, var(--panel-soft) 88%, var(--panel));
    }

    .message.user.guide {
      border: 1px solid color-mix(in srgb, #0f766e 38%, transparent);
      background: color-mix(in srgb, #ecfeff 58%, var(--panel-soft));
    }

    .user-message-label {
      width: fit-content;
      border-radius: 999px;
      background: color-mix(in srgb, var(--text) 8%, transparent);
      color: var(--muted);
      font-size: 11px;
      font-weight: 720;
      line-height: 1;
      padding: 4px 7px;
    }

    .queued-message-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--muted);
    }

    .queued-action,
    .queued-icon-action,
    .queued-menu button {
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
    }

    .queued-action {
      height: 24px;
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
      padding: 0 7px;
    }

    .queued-action:not(:disabled):hover,
    .queued-icon-action:not(:disabled):hover {
      background: color-mix(in srgb, var(--text) 7%, transparent);
      color: var(--text);
    }

    .queued-action:disabled {
      color: color-mix(in srgb, var(--muted) 56%, transparent);
    }

    .queued-icon-action {
      display: grid;
      width: 24px;
      height: 24px;
      place-items: center;
      border-radius: 999px;
      font-size: 14px;
      line-height: 1;
      padding: 0;
    }

    .queued-more {
      position: relative;
    }

    .queued-menu {
      position: absolute;
      z-index: 50;
      top: 30px;
      right: 0;
      display: grid;
      min-width: 116px;
      gap: 2px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 7px;
    }

    .queued-menu[hidden] {
      display: none;
    }

    .queued-menu button {
      min-height: 30px;
      border-radius: 8px;
      color: var(--text);
      font-size: 13px;
      font-weight: 650;
      text-align: left;
      white-space: nowrap;
      padding: 0 8px;
    }

    .queued-menu button:hover {
      background: var(--panel-soft);
    }

    .user-message-text {
      line-height: 1.65;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .user-attachments {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      min-width: min(240px, 100%);
      padding-top: 2px;
    }

    .message.user .attachment-preview-card {
      width: 116px;
    }

    .message.user .attachment-preview {
      border-radius: 16px;
      background: color-mix(in srgb, var(--panel) 90%, var(--bg));
    }

    .message.user .attachment-preview-remove {
      display: none;
    }

    .message.assistant {
      align-self: center;
      width: min(880px, 100%);
      color: var(--text);
      font-size: 16px;
      line-height: 1.72;
    }

    .message.meta,
    .activity-group,
    .multi-run {
      width: min(880px, 100%);
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
      align-self: center;
      border: 0;
      background: transparent;
      color: var(--faint);
      font-size: 12px;
      font-weight: 650;
      padding: 0 2px;
    }

    .message.error {
      color: var(--danger);
    }

    .message.meta.error {
      border: 1px solid color-mix(in srgb, var(--danger) 26%, var(--border));
      border-radius: 8px;
      background: color-mix(in srgb, var(--danger) 8%, var(--panel));
      padding: 8px 10px;
    }

    .activity-group {
      align-self: center;
      border: 0;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
      background: transparent;
      color: var(--faint);
      font-size: 13px;
      padding: 0 2px 8px;
    }

    .activity-group summary {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 28px;
      cursor: pointer;
      list-style: none;
      padding: 0;
      user-select: none;
    }

    .activity-group summary::-webkit-details-marker {
      display: none;
    }

    .activity-group summary::after {
      flex: 0 0 auto;
      color: var(--faint);
      content: "›";
      font-family: var(--sans);
      font-size: 18px;
      line-height: 1;
      transition: transform .12s ease;
    }

    .activity-group[open] summary::after {
      transform: rotate(90deg);
    }

    .activity-group.empty summary {
      cursor: default;
    }

    .activity-group.empty summary::after {
      display: none;
    }

    .activity-group summary:hover {
      color: var(--muted);
    }

    .activity-title {
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
    }

    .activity-elapsed {
      flex: 0 0 auto;
      color: var(--text);
      font-weight: 760;
    }

    .activity-latest {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      color: var(--faint);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .activity-count {
      flex-shrink: 0;
      color: var(--faint);
      font-size: 12px;
    }

    .activity-process {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 28px;
      margin-top: 4px;
    }

    .activity-process-title {
      flex-shrink: 0;
      color: var(--muted);
      font-size: 14px;
      font-weight: 700;
    }

    .activity-process-latest {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      color: var(--faint);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .activity-process-count {
      flex-shrink: 0;
      color: var(--faint);
      font-size: 12px;
    }

    .activity-items {
      display: grid;
      gap: 2px;
      border-left: 1px solid var(--border);
      margin: 4px 0 0 7px;
      padding: 2px 0 0 12px;
    }

	    .activity-item {
	      line-height: 1.5;
	      overflow-wrap: anywhere;
	      padding: 3px 0;
	      white-space: pre-wrap;
	    }

	    .activity-item.thought {
	      color: var(--faint);
	      line-height: 1.58;
	    }

	    .activity-item.warning {
	      color: var(--warning);
	    }

	    .activity-item.error {
	      color: var(--danger);
	    }

	    .multi-run {
	      display: grid;
	      align-self: center;
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
      position: relative;
      display: grid;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      justify-items: center;
      padding: 12px 22px 20px;
      background:
        linear-gradient(to top, var(--bg) 76%, color-mix(in srgb, var(--bg) 88%, transparent) 92%, transparent);
      backdrop-filter: blur(12px);
    }

    .composer-floats {
      position: absolute;
      z-index: 30;
      bottom: calc(100% + 10px);
      left: 50%;
      display: grid;
      justify-items: center;
      gap: 8px;
      pointer-events: none;
      transform: translateX(-50%);
    }

    .scroll-bottom-btn {
      display: grid;
      width: 42px;
      height: 42px;
      min-height: 42px;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--panel);
      box-shadow: var(--shadow);
      color: var(--text);
      font-size: 28px;
      font-weight: 360;
      line-height: 1;
      padding: 0;
      pointer-events: auto;
      transition:
        background .14s ease,
        border-color .14s ease,
        color .14s ease,
        transform .14s ease;
    }

    .scroll-bottom-btn:hover:not(:disabled) {
      background: var(--panel-soft);
      border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
      color: var(--accent);
      transform: translateY(-1px);
    }

    .changes-float {
      display: inline-flex;
      min-height: 38px;
      align-items: center;
      gap: 9px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--panel) 94%, transparent);
      box-shadow: var(--shadow-soft);
      color: var(--muted);
      font-size: 13px;
      font-weight: 650;
      padding: 0 16px;
      pointer-events: auto;
      white-space: nowrap;
    }

    .changes-float:hover:not(:disabled),
    .changes-float[aria-pressed="true"] {
      background: var(--panel);
      border-color: color-mix(in srgb, var(--accent) 34%, var(--border));
      color: var(--text);
    }

    .composer {
      display: grid;
      width: min(812px, 100%);
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
      gap: 10px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: color-mix(in srgb, var(--panel) 96%, transparent);
      box-shadow: var(--shadow);
      padding: 13px;
      transition:
        border-color .16s ease,
        box-shadow .16s ease,
        transform .16s ease;
    }

    .composer:focus-within {
      border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
      box-shadow:
        0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent),
        var(--shadow);
    }

    .composer.drag-over {
      border-color: color-mix(in srgb, var(--accent) 54%, var(--border));
      background: color-mix(in srgb, var(--accent) 5%, var(--panel));
    }

    .attachment-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      min-width: 0;
      padding: 0 2px 2px;
    }

    .attachment-list .attachment-preview-card {
      width: 122px;
    }

    .attachment-list .attachment-caption {
      display: none;
    }

    .attachment-preview-card {
      position: relative;
      display: grid;
      width: 126px;
      gap: 6px;
      min-width: 0;
    }

    .attachment-preview {
      display: grid;
      width: 100%;
      aspect-ratio: 1;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--panel-soft);
      overflow: hidden;
    }

    .attachment-preview img {
      display: block;
      width: 100%;
      height: 100%;
      background: #fff;
      object-fit: contain;
    }

    .attachment-file-type {
      color: var(--muted);
      font-size: 13px;
      font-weight: 760;
      letter-spacing: 0;
    }

    .attachment-caption {
      min-width: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 620;
      line-height: 1.25;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .attachment-preview-remove {
      position: absolute;
      top: -8px;
      right: -8px;
      display: grid;
      width: 30px;
      height: 30px;
      min-height: 30px;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: #111;
      color: #fff;
      font-size: 22px;
      font-weight: 360;
      line-height: 1;
      padding: 0;
      box-shadow: 0 8px 18px rgba(0, 0, 0, .18);
    }

    .attachment-preview-remove:hover:not(:disabled) {
      background: #000;
      transform: translateY(-1px);
    }

    .queued-run-list {
      display: grid;
      gap: 8px;
      margin: 0 0 6px;
    }

    .queued-run-list[hidden] {
      display: none;
    }

    .queued-run-item {
      position: relative;
      display: grid;
      min-height: 38px;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: color-mix(in srgb, var(--panel) 96%, var(--panel-soft));
      color: var(--text);
      padding: 7px 138px 7px 10px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
    }

    .queued-run-item.guide {
      border-color: color-mix(in srgb, #0f766e 38%, var(--border));
      background: color-mix(in srgb, #ecfeff 54%, var(--panel));
    }

    .queued-run-grip {
      color: color-mix(in srgb, var(--muted) 62%, transparent);
      font-size: 13px;
      letter-spacing: -3px;
      line-height: 1;
    }

    .queued-run-body {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    .queued-run-text {
      min-width: 0;
      overflow: hidden;
      color: var(--text);
      font-size: 14px;
      font-weight: 650;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .queued-run-meta {
      color: var(--muted);
      font-size: 12px;
      font-weight: 620;
      line-height: 1.2;
    }

    .composer textarea {
      min-height: 54px;
      max-height: 190px;
      resize: none;
      border: 0;
      padding: 3px 4px 0;
      line-height: 1.55;
      overflow-y: auto;
    }

    .composer textarea:focus {
      box-shadow: none;
    }

    .composer-footer {
      display: flex;
      min-width: 0;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .context-meter {
      --context-used: 0%;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      border-radius: 999px;
      color: var(--muted);
      cursor: default;
      font-size: 12px;
      font-weight: 680;
      outline: none;
      padding: 0 6px;
      white-space: nowrap;
    }

    .context-meter:hover,
    .context-meter:focus-visible {
      background: var(--panel-soft);
      color: var(--text);
    }

    .context-meter[aria-disabled="true"] {
      opacity: .52;
    }

    .context-meter-ring {
      position: relative;
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: conic-gradient(var(--accent) var(--context-used), var(--border) 0);
      flex: 0 0 auto;
    }

    .context-meter[data-level="warning"] .context-meter-ring {
      background: conic-gradient(#c77900 var(--context-used), var(--border) 0);
    }

    .context-meter[data-level="danger"] .context-meter-ring {
      background: conic-gradient(var(--danger) var(--context-used), var(--border) 0);
    }

    .context-meter-ring::after {
      content: "";
      position: absolute;
      inset: 4px;
      border-radius: inherit;
      background: var(--panel);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 70%, transparent);
    }

    .context-popover {
      position: absolute;
      right: 0;
      bottom: calc(100% + 10px);
      z-index: 20;
      width: max-content;
      min-width: 268px;
      max-width: min(360px, calc(100vw - 40px));
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--panel);
      box-shadow: var(--shadow);
      color: var(--text);
      opacity: 0;
      padding: 12px 16px;
      pointer-events: none;
      text-align: center;
      transform: translateY(4px);
      transition: opacity .16s ease, transform .16s ease;
    }

    .context-popover::after {
      content: "";
      position: absolute;
      right: 18px;
      bottom: -6px;
      width: 10px;
      height: 10px;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      transform: rotate(45deg);
    }

    .context-meter:hover .context-popover,
    .context-meter:focus-visible .context-popover,
    .context-meter:focus-within .context-popover {
      opacity: 1;
      transform: translateY(0);
    }

    .context-popover-title {
      color: var(--muted);
      font-size: 13px;
      font-weight: 720;
      margin-bottom: 4px;
    }

    .context-popover-percent {
      font-size: 15px;
      font-weight: 780;
      margin-bottom: 4px;
    }

    .context-popover-tokens {
      font-size: 13px;
      font-weight: 620;
    }

	    .composer-actions {
	      display: flex;
	      width: auto;
      min-width: 0;
      flex: 1 1 auto;
      flex-wrap: wrap;
	      align-items: center;
	      justify-content: flex-end;
	      gap: 8px;
	      margin-left: auto;
	    }

    .attachment-button {
      display: grid;
      width: 34px;
      height: 34px;
      min-height: 34px;
      place-items: center;
      border: 0;
      border-radius: 999px;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 20px;
      font-weight: 420;
      line-height: 1;
      padding: 0;
    }

    .attachment-button:hover:not(:disabled) {
      background: color-mix(in srgb, var(--accent) 9%, var(--panel-soft));
      color: var(--text);
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

    .model-picker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 1 1 190px;
      position: relative;
      max-width: min(42vw, 320px);
      min-width: 0;
    }

    .model-select {
      display: inline-flex;
      min-height: 34px;
      align-items: center;
      border: 0;
      border-radius: 999px;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 13px;
      font-weight: 620;
      gap: 8px;
      justify-content: space-between;
      overflow: hidden;
      padding: 0 12px;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .model-base-button {
      flex: 1 1 112px;
      min-width: 0;
      width: clamp(126px, 15vw, 190px);
    }

    .model-base-button::after {
      content: "⌄";
      flex: 0 0 auto;
      font-size: 12px;
      line-height: 1;
    }

    .model-base-button:hover:not(:disabled),
    .model-base-button[aria-expanded="true"] {
      background: color-mix(in srgb, var(--accent) 9%, var(--panel-soft));
      color: var(--text);
    }

    .model-menu {
      position: absolute;
      left: 0;
      bottom: calc(100% + 10px);
      z-index: 50;
      display: grid;
      width: min(360px, calc(100vw - 28px));
      gap: 8px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 10px;
    }

    .model-menu[hidden] {
      display: none;
    }

    .model-search {
      height: 34px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel-soft);
      color: var(--text);
      font-size: 13px;
      font-weight: 620;
      padding: 0 10px;
    }

    .model-list {
      display: grid;
      max-height: min(360px, 52vh);
      gap: 2px;
      overflow: auto;
      padding-right: 2px;
    }

    .model-option,
    .model-empty {
      min-height: 32px;
      border-radius: 7px;
      color: var(--text);
      font-size: 13px;
      font-weight: 650;
      line-height: 1.2;
      padding: 0 9px;
      text-align: left;
    }

    .model-option {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
    }

    .model-option:hover:not(:disabled),
    .model-option.active {
      background: var(--panel-soft);
    }

    .model-option.active {
      color: var(--accent);
    }

    .model-option-check {
      width: 12px;
      flex: 0 0 12px;
      color: currentColor;
      font-size: 12px;
      line-height: 1;
      text-align: center;
    }

    .model-option-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .model-empty {
      display: flex;
      align-items: center;
      color: var(--muted);
    }

    .model-param-toggle {
      display: inline-flex;
      flex: 0 1 auto;
      height: 34px;
      min-height: 34px;
      max-width: 132px;
      align-items: center;
      border: 0;
      border-radius: 999px;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
      gap: 6px;
      line-height: 1;
      overflow: hidden;
      padding: 0 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .model-param-toggle::after {
      content: "⌄";
      flex: 0 0 auto;
      font-size: 12px;
      line-height: 1;
    }

    .model-param-toggle:hover:not(:disabled),
    .model-param-toggle[aria-expanded="true"] {
      background: color-mix(in srgb, var(--accent) 9%, var(--panel-soft));
      color: var(--text);
    }

    .model-param-toggle[hidden] {
      display: none;
    }

    .model-param-popover {
      position: absolute;
      right: 0;
      bottom: calc(100% + 10px);
      z-index: 45;
      width: min(420px, calc(100vw - 28px));
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: var(--shadow);
      color: var(--text);
      padding: 12px;
    }

    .model-param-list {
      display: grid;
      gap: 10px;
    }

    .model-param-row {
      display: grid;
      grid-template-columns: 84px minmax(0, 1fr);
      align-items: center;
      gap: 10px;
    }

    .model-param-name {
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .model-param-segment {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      gap: 5px;
    }

    .model-param-choice,
    .model-param-switch {
      min-height: 28px;
      border-radius: 7px;
      border: 1px solid var(--border);
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
      line-height: 1;
    }

    .model-param-choice {
      padding: 0 9px;
    }

    .model-param-choice.active {
      border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
      background: color-mix(in srgb, var(--accent) 14%, var(--panel-soft));
      color: var(--text);
    }

    .model-param-switch {
      display: inline-flex;
      width: 52px;
      align-items: center;
      justify-content: flex-start;
      padding: 0 4px;
    }

    .model-param-switch::before {
      content: "";
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--muted);
      transition: transform .14s ease, background .14s ease;
    }

    .model-param-switch.active {
      border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
      background: color-mix(in srgb, var(--accent) 16%, var(--panel-soft));
    }

    .model-param-switch.active::before {
      background: var(--accent);
      transform: translateX(22px);
    }

    .guide-toggle {
      display: grid;
      height: 34px;
      min-height: 34px;
      place-items: center;
      border-radius: 999px;
      border: 0;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
      line-height: 1;
      padding: 0 12px;
    }

    .guide-toggle.active {
      background: #0f766e;
      color: #ffffff;
    }

    .send {
      display: grid;
      width: 34px;
      height: 34px;
      min-height: 34px;
      place-items: center;
      border-radius: 999px;
      padding: 0;
      font-size: 18px;
      line-height: 1;
    }

    .send.running {
      background: color-mix(in srgb, var(--text) 92%, var(--panel));
      color: #ffffff;
    }

    .send.running:hover:not(:disabled) {
      background: color-mix(in srgb, var(--text) 92%, var(--panel));
    }

    .send.cancel-mode::before {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background: currentColor;
      content: "";
    }

    .side-panel {
      position: relative;
      display: grid;
      grid-template-rows: 52px auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      border-left: 1px solid var(--border);
      background: var(--panel);
    }

    .side-panel-resizer {
      position: absolute;
      z-index: 20;
      top: 0;
      bottom: 0;
      left: -5px;
      width: 10px;
      cursor: col-resize;
      touch-action: none;
    }

    .side-panel-resizer::before {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 5px;
      width: 1px;
      background: transparent;
      content: "";
      transition: background .14s ease;
    }

    .side-panel-resizer:hover::before,
    body.resizing-review .side-panel-resizer::before {
      background: var(--accent);
    }

    body.resizing-review {
      cursor: col-resize;
      user-select: none;
    }

    .review-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      padding: 0 12px;
    }

    .review-title {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 760;
    }

    .review-title-icon {
      display: inline-grid;
      width: 22px;
      height: 22px;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 7px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1;
    }

    .review-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .review-header-actions button {
      display: grid;
      width: 30px;
      min-height: 30px;
      place-items: center;
      color: var(--muted);
      padding: 0;
    }

    .review-switcher {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--border);
      padding: 8px 12px;
    }

    .review-tab {
      height: 30px;
      min-height: 30px;
      border-radius: 7px;
      background: var(--panel-soft);
      font-weight: 700;
    }

    .review-tab.active {
      color: var(--text);
      outline: 1px solid var(--border);
    }

    .changes-summary {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 6px;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.45;
    }

    .review-summary-text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .review-workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
    }

    .review-workspace.has-changes {
      grid-template-columns: minmax(0, 1fr) 220px;
    }

    .diff-review {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .review-workspace.has-changes .diff-review {
      border-right: 1px solid var(--border);
    }

    .changes-list {
      height: 100%;
      min-height: 0;
      overflow: auto;
      background: var(--panel);
    }

    .diff-file {
      min-width: 0;
      border-bottom: 1px solid var(--border);
      scroll-margin-top: 0;
    }

    .diff-file.active .diff-file-header {
      background: var(--panel-soft);
    }

    .diff-file-header {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      width: 100%;
      min-height: 38px;
      align-items: center;
      gap: 8px;
      border-radius: 0;
      border-bottom: 1px solid var(--border);
      color: var(--text);
      padding: 0 10px;
      text-align: left;
    }

    .diff-file-status {
      border-radius: 6px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 11px;
      font-weight: 760;
      padding: 4px 6px;
      white-space: nowrap;
    }

    .diff-file-title {
      min-width: 0;
      overflow: hidden;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diff-file-stats {
      display: inline-flex;
      gap: 6px;
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 720;
      white-space: nowrap;
    }

    .diff-lines {
      overflow-x: auto;
      background: var(--panel);
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.5;
    }

    .diff-line {
      display: grid;
      grid-template-columns: 44px 44px minmax(360px, 1fr);
      min-height: 22px;
    }

    .diff-line.add {
      background: color-mix(in srgb, var(--success) 13%, transparent);
    }

    .diff-line.del {
      background: color-mix(in srgb, var(--danger) 12%, transparent);
    }

    .diff-line.hunk,
    .diff-line.meta {
      background: var(--panel-soft);
      color: var(--muted);
    }

    .diff-num {
      color: var(--faint);
      padding: 2px 8px;
      text-align: right;
      user-select: none;
    }

    .diff-code {
      min-width: 0;
      border-left: 1px solid var(--border);
      overflow: visible;
      padding: 2px 10px;
      white-space: pre;
    }

    .diff-line.add .diff-code::before {
      color: var(--success);
      content: "+";
      margin-right: 8px;
    }

    .diff-line.del .diff-code::before {
      color: var(--danger);
      content: "-";
      margin-right: 8px;
    }

    .diff-line.context .diff-code::before {
      content: " ";
      margin-right: 8px;
    }

    .diff-empty {
      color: var(--muted);
      font-size: 12px;
      padding: 12px;
    }

    .file-review {
      display: none;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
      background: var(--panel);
    }

    .review-workspace.has-changes .file-review {
      display: grid;
    }

    .file-review input {
      width: auto;
      height: 32px;
      margin: 8px 8px 6px;
      border-radius: 999px;
      padding: 0 12px;
      font-size: 12px;
    }

    .browser-workspace {
      display: grid;
      min-height: 0;
      grid-template-rows: auto minmax(260px, 1fr) auto auto;
      gap: 10px;
      padding: 12px;
    }

    .browser-workspace[hidden] {
      display: none;
    }

    .browser-bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 8px;
    }

    .browser-bar input,
    .browser-feedback textarea {
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel-soft);
      color: var(--text);
      font: inherit;
    }

    .browser-bar input {
      height: 34px;
      min-width: 0;
      padding: 0 10px;
    }

    .browser-bar button,
    .browser-feedback button {
      min-height: 34px;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      font-size: 12px;
      font-weight: 700;
      padding: 0 10px;
    }

    .browser-bar button.active {
      border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
      color: var(--accent);
    }

    .browser-stage {
      position: relative;
      min-height: 260px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: white;
    }

    .browser-stage iframe {
      width: 100%;
      height: 100%;
      min-height: 420px;
      border: 0;
      background: white;
    }

    .browser-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .browser-stage.annotating .browser-overlay {
      cursor: crosshair;
      pointer-events: auto;
    }

    .browser-marker {
      position: absolute;
      display: inline-grid;
      width: 22px;
      height: 22px;
      place-items: center;
      transform: translate(-50%, -50%);
      border: 2px solid white;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
      color: white;
      font-size: 11px;
      font-weight: 800;
      pointer-events: auto;
    }

    .browser-marker.draft {
      background: #b42318;
    }

    .browser-comments {
      display: grid;
      max-height: 124px;
      gap: 6px;
      overflow: auto;
    }

    .browser-comment,
    .browser-comment-empty {
      display: grid;
      gap: 3px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel-soft);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      padding: 8px;
    }

    .browser-comment-label {
      color: var(--accent);
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 800;
    }

    .browser-feedback {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
    }

    .browser-feedback textarea {
      min-height: 58px;
      resize: vertical;
      padding: 9px 10px;
    }

    .change-tree {
      min-height: 0;
      overflow: auto;
      padding: 4px 6px 12px;
    }

    .change-tree-root {
      overflow: hidden;
      color: var(--text);
      font-size: 13px;
      font-weight: 740;
      padding: 6px 8px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .change-tree-row {
      --tree-depth: 0;
      display: flex;
      width: 100%;
      min-width: 0;
      min-height: 30px;
      align-items: center;
      gap: 7px;
      border-radius: 7px;
      color: var(--muted);
      font-size: 13px;
      padding: 0 8px 0 calc(8px + var(--tree-depth) * 15px);
      text-align: left;
    }

    .change-tree-row.folder {
      font-weight: 650;
    }

    .change-tree-row.file.active {
      background: var(--selected);
      color: var(--text);
    }

    .tree-caret,
    .tree-file-icon {
      display: inline-grid;
      width: 18px;
      flex: 0 0 18px;
      place-items: center;
      color: var(--faint);
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1;
    }

    .tree-file-icon {
      color: var(--accent);
      font-weight: 760;
    }

    .tree-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-stats {
      flex: 0 0 auto;
      margin-left: auto;
      color: var(--faint);
      font-family: var(--mono);
      font-size: 10px;
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

    @media (max-width: 1120px) {
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
        padding: 22px 18px 138px;
      }

      .topbar {
        min-height: 52px;
        align-items: flex-start;
        padding: 8px 12px;
      }

      .toolbar {
        max-width: 54vw;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .toolbar button {
        min-height: 28px;
        padding: 0 8px;
      }

      .composer-wrap {
        padding: 10px 12px 14px;
      }

      .composer-floats {
        bottom: calc(100% + 8px);
      }

      .changes-float {
        max-width: calc(100vw - 34px);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .model-picker {
        max-width: 54vw;
      }

      .model-base-button {
        width: clamp(96px, 28vw, 148px);
      }

      .model-menu {
        left: -8px;
        width: calc(100vw - 24px);
      }

      .model-param-toggle {
        max-width: 92px;
        padding: 0 10px;
      }

      .model-param-popover {
        right: -46px;
        width: calc(100vw - 24px);
      }

      .model-param-row {
        grid-template-columns: 70px minmax(0, 1fr);
      }
    }`
