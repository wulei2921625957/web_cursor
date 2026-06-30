# Codex 对比优化计划

Last reviewed against repository context and Codex public manual on 2026-06-30.

## 背景

本项目是基于 Cursor SDK 的本地 Web UI，用于在用户选择的本地工作区中运行 coding agent。当前已经具备项目/会话管理、Local/Worktree 模式、上下文压缩、附件、diff 审查、Undo、轻量扩展运行时、MCP 配置传递、Hook 和多 Agent 执行。

对比 Codex App / CLI / IDE / Cloud 的完整产品能力，当前差距主要集中在：

- 安全与权限控制已补齐第一版，SDK built-in tools 仍受限于 SDK 暴露能力。
- 本地 Web 服务开放后已有 token / Origin / body limit 防护。
- 已建立轻量测试体系，后续需要继续扩大集成覆盖。
- 服务端和前端主文件仍偏大，功能继续增长会增加维护成本。
- Git 审查发布、终端、浏览器检查、插件/技能生态、多 Agent、自动化均已有
  第一版闭环，后续重点是深水区增强。

本计划按优先级拆成 P0、P1、P2。P0 是继续扩展前必须优先补齐的基础；P1 是对日常工作流收益最大的能力；P2 是更长期的 Codex 产品形态对齐。

## 目标

- 让本项目在本地 coding agent 工作流上更接近 Codex 的安全性、可审查性和可恢复性。
- 在不引入过度复杂架构的前提下，补齐高价值产品能力。
- 保持现有 Cursor SDK 路线、Node.js/TypeScript/原生 Web UI 技术栈。
- 优先保护本地文件、密钥、会话持久化和用户未提交变更。

## P0 实施状态

2026-06-30 已落地第一版 P0：

- 权限模式：`read_only`、`auto`、`full_access`。
- 权限强制范围：本项目自有的 `workspace_shell` custom tool 和
  `UserPromptSubmit` / `PreRun` / `PostRun` Hook。
- 权限审计：shell tool 和 Hook 决策写入 `.coding-agent/audit.log`。
- HTTP 安全：非 loopback 绑定需要访问 token；状态变更 API 做 Origin
  校验；JSON body 有统一大小限制。
- 测试底座：新增 `npm test`，覆盖权限决策和 HTTP 安全纯函数。
- 结构拆分：新增 `src/permissions.ts` 和 `src/http-security.ts`，把 P0
  安全逻辑从 `src/ui.ts` / `src/workspace-tools.ts` 中抽出。

2026-06-30 已继续落地 P0 增强：

- 交互式审批队列：Auto 模式下中高风险 `workspace_shell` 命令会进入
  pending approval，UI 支持 approve once、approve for session 和 deny。
- 审批队列会在 session 删除、项目移除或取消当前运行时主动拒绝悬挂请求，
  避免 agent run 永久等待。
- `GET /api/status` 返回 `pendingApprovals`，前端在任务运行或存在待审批时
  自动轮询状态。
- Cursor SDK 内置本地工具在 Auto 模式下启用 SDK `autoReview`；项目层仍只
  能对自有 custom tools、终端和 Hook 做完全强制。
- SDK 工具边界已落地为可见状态：`GET /api/status` 返回 `sdkToolBoundary`，
  顶栏展示 SDK Sandbox / Auto-review badge，agent runtime instructions 会
  明确 built-in tools 的项目层拦截边界并要求优先使用 `workspace_*` custom
  tools。
- 新增 shell 前缀规则：`~/.coding-agent/permissions.json` 和当前 workspace
  `.coding-agent/permissions.json` 支持 `allow` / `prompt` / `deny`。
- P0.4 继续拆分：新增 `src/approval-queue.ts` 管理审批状态，
  `src/terminal-manager.ts` 管理终端进程、输出缓冲和 prompt context。
- 测试扩展到审批队列、workspace shell 审批、终端管理器、SDK Auto-review
  和 shell 规则解析/决策。

P0 剩余可继续优化：

- SDK built-in tools 没有公开逐工具拦截回调，当前已通过 SDK sandbox、
  SDK Auto-review、状态提示和 runtime instructions 做可落地约束与显式告知。
- `src/ui.ts` 和前端 `client-script.ts` 仍然偏大；已按安全/审批/终端/自动化/
  worktree 清理/记忆领域先拆，后续可继续拆 route/state/persistence 和前端
  panel 模块。

## P1 实施状态

2026-06-30 已落地 P1.1 第一版：

- Review 面板支持文件级 `stage` / `unstage` / `revert`。
- Review 面板支持提交已暂存变更，并返回提交短 SHA。
- 服务端新增 `POST /api/git/file` 和 `POST /api/git/commit`。
- 文件级 revert 会恢复选中文件的 worktree 和 index 状态，并在会话运行中
  拒绝执行。
- 新增 Git 工作区单元测试，覆盖暂存、取消暂存、文件级撤销新增/修改文件
  和 commit。

2026-06-30 已落地 P1.1 第二版：

- Review 面板可基于已暂存 diff 生成提交信息建议。
- `GET /api/changes` 返回当前 Git 发布状态，包括 branch、upstream、
  ahead、remote 和是否可 push。
- Review 面板可在确认后推送当前分支；首次推送会使用 remote 并设置上游。
- 服务端新增 `POST /api/git/commit-message` 和 `POST /api/git/push`。
- 新增 Git 单元测试，覆盖提交信息建议、发布状态和首次 push。

2026-06-30 已落地 P1.1 第三版：

- Review 面板可在确认后通过 `gh` CLI 创建 Draft PR。
- 服务端新增 `POST /api/git/pr`。
- PR 创建前要求当前分支已推送、已设置上游且没有未推送提交。
- 新增 Git 单元测试，覆盖 PR 前置状态。

2026-06-30 已落地 P1.1 第四版：

- Review 面板支持对单个变更文件写入反馈。
- 文件反馈会以 `代码审查反馈：<path>` 的结构追加到主输入框，用户可编辑
  后发送给 agent。
- 该能力复用现有会话输入流，不新增后端存储格式。

2026-06-30 已落地 P1.1 第五版：

- Review 面板支持 hunk 级 stage / revert。
- hunk 操作基于当前未暂存文本 diff，服务端用 `git apply --check` 校验后
  再执行。
- hunk stage 只写 index；hunk revert 只反向修改 worktree。
- 新增 Git 单元测试，覆盖单 hunk 暂存和单 hunk 撤销。

P1.1 已完成核心计划。后续可继续增强更细的远端错误恢复和分支展示。

2026-06-30 已落地 P1.2 第一版：

- Review 面板新增 Terminal 标签页，可在当前 session workspace 中启动
  shell 命令。
- 终端输出按 stdout / stderr / system 行展示，前端通过 line cursor 增量
  轮询。
- 支持停止当前运行中的终端命令；删除 session 和服务关闭时会清理子进程。
- 终端命令复用 P0 权限模式和 `.coding-agent/audit.log` 审计。
- agent 下一次运行时会收到同一 session 最近终端输出，便于根据用户手动
  验证结果继续诊断。
- Terminal 标签页支持在同一 session 的多个 terminal run 之间切换查看输出。
- Terminal 标签页支持复制当前选中 run 的输出。
- Terminal 标签页支持搜索当前输出并高亮匹配行。
- 服务端新增 `/api/terminal/list`、`/api/terminal/output`、
  `/api/terminal/start`、`/api/terminal/stop`。

2026-06-30 已落地 P1.2 第二版：

- 服务端终端子进程保留 stdin 管道，新增 `/api/terminal/input` 可向运行中
  进程发送输入。
- Terminal 面板新增运行中输入栏，支持 Enter 发送到当前 active terminal。
- Terminal 面板新增快捷键：命令输入框中 `Cmd/Ctrl+Enter` 运行命令；
  Terminal 面板打开且有运行中进程时，`Esc` 请求停止。
- stdin 行会显示在 Terminal 输出中，便于用户回看交互步骤；后续 agent prompt
  注入仍只使用进程输出和系统行，避免把用户手动输入自动带入 agent 上下文。

2026-06-30 已落地 P1.2 第三版：

- Terminal 输出显示层会清理 ANSI escape/control sequence，避免彩色命令输出
  直接暴露原始控制字符。
- 输出搜索基于清理后的可见文本执行，复制当前输出时也复制清理后的文本。

P1.2 已完成可用的命令终端闭环、多运行记录切换、复制输出、输出搜索、
stdin 输入、基础快捷键和 ANSI 控制序列清理。后续增强项：真正的交互式 PTY、
终端尺寸同步、ANSI 颜色渲染、全屏终端体验和更完整的快捷键映射。

2026-06-30 已落地 P1.3 第一版：

- Browser 面板新增检查能力：默认允许 localhost 和当前 session workspace
  内的 `file:` 页面，公网 URL 需要配置 `browser.allow`。
- 检查结果包含 DOM 摘要、标题/描述/headings、关键资源检查、视口和告警。
- 关键资源检查会返回 network/resource 检查表，包含类型、URL、状态、
  content-type、大小、耗时和错误；摘要会注入后续 agent prompt。
- 如果本机存在 Chrome/Chromium，可自动截图并保存为 session 附件；没有
  浏览器可执行文件时降级为 DOM/资源检查并给出提示。
- Browser 检查上下文会注入下一次 agent prompt。
- 视觉标注反馈会自动附带 URL、视口和已生成的截图路径。
- Browser 面板新增一键启用 Playwright MCP，会写入
  `.coding-agent/extensions.json`，下一次 agent 运行加载。
- `coding-agent.extensions.example.json` 新增 `browser.allow` / `browser.deny`
  示例策略。
- 新增 Browser 策略和 DOM 摘要单元测试。

2026-06-30 已落地 P1.3 第二版：

- Browser 检查结果中的资源检查升级为静态 network waterfall 视图。
- Waterfall 展示资源数量、ok/issue 数、最大耗时、单资源状态、URL、耗时条、
  大小、content-type 和错误信息。

P1.3 已完成可用的受控检查、静态 network/resource 检查、静态 waterfall
展示和 MCP 启用闭环。后续增强项：真正内置的交互式点击/回放、运行时 console
log 捕获、DevTools 级 runtime network waterfall 和连接用户 Chrome profile。

2026-06-30 已落地 P1.4 第一版：

- Extension runtime 支持禁用 Skills、Plugins、MCP servers；禁用项不会进入
  后续 agent runtime instructions 或 MCP config。
- Review 面板新增 Extensions 标签页，展示当前 session workspace 发现的
  Skills、Plugins、MCP servers、Hooks 和 warnings。
- UI 支持启用/禁用 Skill、Plugin、MCP server，状态写入
  `.coding-agent/extensions.json`。
- Skill 支持保守的隐式触发：除显式 `$skill-name` 外，也会按 skill 名称/
  描述与 prompt 的关键词匹配加载 body。
- Plugin discovery 支持 `plugin.json` 和标准 `.codex-plugin/plugin.json`。
- Plugin inventory 会展示 manifest 中的版本、MCP server 数量和依赖摘要。
- MCP 支持 `disabledMcpServers`、server deny，以及 tool allow / prompt /
  deny 策略；策略会显示在 Extensions 面板并写入 agent runtime instructions。
- Hook 支持在 Extensions 面板按单条启用/禁用，禁用状态写入
  `.coding-agent/extensions.json` 的 `disabledHooks`。
- 新增扩展运行时单元测试，覆盖隐式 skill、disabled skill、`.codex-plugin`
  manifest、disabled plugin/MCP、MCP tool policy 和 disabled hook。

P1.4 已完成本地扩展管理、版本/依赖展示、Hook 开关和禁用闭环。后续增强项：
OAuth、远程安装和 SDK tool-call 级拦截式审批。

2026-06-30 已落地 P1.5 第一版：

- Multi-agent task state 新增 read/write access mode、agent profile name、
  changed files 摘要。
- read-only 子任务默认强制使用 read-only 权限，不继承更宽的父 session
  权限。
- 同一 dependency rank 内，read-only 子任务并发执行，write-capable 子任务
  串行执行，降低静默覆盖风险。
- 支持 `.coding-agent/extensions.json` / `coding-agent.extensions.json` 的
  `multiAgent.agents` profile：`name`、`description`、`instructions`、
  `model`、`permissionMode`。
- 子 Agent task card 显示 profile、access mode、changed files，并支持取消
  单个运行中的子 Agent。
- 子 Agent task card 支持展开查看 prompt、输出、错误、tool usage 和 token
  usage。
- 服务端新增 `POST /api/multi-agent/task/cancel`。
- 多 Agent 最终 summary 继续进入 session memory，失败任务不会丢失已完成
  子任务结果。

2026-06-30 已落地 P1.5 第二版：

- 子 Agent task card 对 PENDING / RUNNING 任务支持追加 steering note。
- 服务端新增 `POST /api/multi-agent/task/steer`，记录 task 级用户指导。
- 对尚未启动的 PENDING 子任务，steering note 会附加进该子 Agent 的 prompt。
- 对已经 RUNNING 的子任务，steering note 会记录并展示在详情中；真正 live
  注入运行中的 SDK run 仍受 SDK 能力限制。

P1.5 已完成可观察性、安全执行策略、单子任务取消、子任务详情和 tool usage
展示、steering note 第一版。后续增强项：真正 live steering、每个子 Agent
独立线程查看和 patch 级合并/冲突 UI。

2026-06-30 已落地 P1.6 第一版：

- Review 面板新增 Automations 标签页，支持创建、暂停/启用、删除和立即运行。
- 自动化绑定当前 session，按分钟间隔或可选 cron 表达式触发 prompt，并继续
  该 session 的 agent 上下文。
- 自动化状态持久化在 `.coding-agent/automations.json`，包括 enabled、interval、
  可选 cron、prompt、permissionMode、last/next run、failureCount 和短历史。
- 自动化权限模式必须显式为 `read_only` 或 `auto`；无人值守自动化不允许
  `full_access`。
- 自动化运行前要求当前 app 权限模式与自动化权限模式一致，否则记为失败。
- Git 项目自动化会优先把绑定 session 迁移到 managed Worktree 后台执行；
  非 Git 项目保留 Local 执行。
- 连续 3 次失败后自动暂停。
- 失败重试在暂停前使用指数退避。
- 自动化列表可展开查看最近运行历史详情。
- 自动化列表展示当前后台执行 workspace mode。
- 自动化创建表单支持 Interval/Cron 调度模式切换，并通过服务端预览下一次
  运行时间。
- 项目移除和服务退出会清理 automation timer。
- 启动、项目移除和服务退出会扫描 `.session/worktrees`，自动清理不再被
  活跃 session 引用的 managed worktree。
- 服务端新增 `/api/automations`、`/api/automations/toggle`、
  `/api/automations/run`。

P1.6 已完成本地 thread automation、运行历史详情、失败退避、cron 调度、
Git 项目后台 Worktree 执行、managed worktree orphan 自动清理和基础调度
编辑器。

P1 已完成第一版闭环：Git 审查发布、集成终端、Browser 检查/Playwright MCP
启用、扩展管理、多 Agent 安全执行策略和本地 thread automation 均已有可用
实现，并通过 `npm test` 与 `npm run build` 验证。

## P2 实施状态

2026-06-30 已落地 P2.5 交互效率第一版：

- Composer 支持本地 slash commands，不进入 agent run。
- `/help` 展示可用命令。
- `/status` 刷新状态和变更。
- `/review`、`/terminal [command]`、`/browser [url]`、`/extensions`、
  `/automations`、`/artifacts [路径]` 可快速打开对应工作区。
- 本地 prompt history 存在浏览器 localStorage；`/history [关键词]` 可搜索，
  composer 上下方向键可召回最近 prompt。
- `/permission read_only|auto|full_access` 可切换权限模式，仍走既有后端
  权限切换约束。
- 侧边栏支持按标题/workspace 搜索会话。
- 会话支持置顶和归档；默认隐藏归档会话，可切换显示并恢复。

2026-06-30 已落地 P2.3 记忆系统第一版：

- 新增项目级可编辑记忆文件 `.coding-agent/project-memory.md`。
- 新增用户级可编辑记忆文件 `~/.coding-agent/user-memory.md`。
- agent run 会把用户记忆和当前 session workspace 的项目记忆分 scope 注入
  prompt。
- 新增 `/api/project-memory` 兼容接口和 `/api/memory` 读写/删除/搜索接口。
- Composer slash command 支持 `/memory` 查看、`/memory set <内容>` 替换、
  `/memory clear` 删除项目记忆，也支持 `/memory user set <内容>`、
  `/memory user clear` 和 `/memory search <关键词>`。
- Review 面板新增 Memory/记忆标签页，可在 UI 中切换项目记忆和用户记忆，
  支持读取、编辑保存、清空、搜索，以及按 scope 启用/停用 prompt 注入。
- Memory 标签页展示当前 session memory 摘要质量、recent/transcript 数量、
  prompt snapshot 数量、compaction 历史和摘要预览。
- `/memory panel` 可快速打开记忆面板。
- Memory 标签页提供结构化编辑第一版：Facts、Preferences、Todos 三组字段可
  生成稳定 Markdown 长期记忆。
- 新增项目记忆单元测试。

2026-06-30 已落地 P2.5 产品细节第二版：

- 顶部工具栏新增主题选择：跟随系统、浅色、深色。
- 主题偏好持久化到浏览器 localStorage，并通过 `data-theme` 覆盖系统偏好。
- Review 侧栏布局偏好继续持久化隐藏状态和宽度，并新增当前标签页恢复。

2026-06-30 已落地 P2.5 产品细节第四版：

- 顶部工具栏新增“弹出”按钮，可打开 `?popout=conversation` 对话窗口。
- Pop-out 窗口使用 conversation-focused 布局，隐藏项目侧栏和 Review 侧栏，
  不修改原窗口的 Review 布局持久化偏好。
- 同源窗口之间通过 `BroadcastChannel` 同步 agent run 流事件和 multi-agent
  task state，弹出窗口可跟随主窗口的运行输出更新。

P2 已完成本地可落地第一版：Cloud/Local execution mode、IDE context sync
接收/注入、受控 Web Search、artifact 预览/验证、结构化 memory 编辑和
会话 pin/archive/search、主题/布局持久化、Pop-out conversation window
第一版和同源窗口运行事件同步。仍需真实外部环境支持的方向包括 SSH remote project、remote app
server/WebSocket 控制、完整 Cloud 远端任务状态、自动启动外部编辑器并监听回写、
跨设备/远端多窗口状态同步。

## 非目标

- 不直接复制 Codex Cloud、ChatGPT workspace、OpenAI 托管环境或企业管理能力。
- 不依赖 Codex 私有接口。
- 不在短期内引入大型前端框架，除非后续 UI 复杂度已经超过原生实现的收益边界。
- 不破坏现有 `.coding-agent/sessions.sqlite`、legacy `.session/sessions.json` 迁移和 NDJSON 流式 API 合约。

## P0：基础安全、可靠性和可维护性

### P0.1 权限与沙箱体系

当前状态：

- 已有 Read-only / Auto / Full Access 模式，并可通过 UI / CLI 切换。
- `workspace_shell`、终端命令和 Hook 会经过权限分类、规则匹配和审计。
- Auto 模式下中高风险 `workspace_shell` 命令进入 UI 审批队列。
- 已有命令前缀 allow / prompt / deny 规则文件。
- SDK built-in tools 仍不能由项目层逐工具拦截；当前通过 SDK sandbox、
  SDK Auto-review、`sdkToolBoundary` 状态、顶栏 badge 和 runtime instructions
  显式约束与告知。

目标：

- 建立可解释、可持久化、可审计的权限模型。
- 避免 agent 在无感知状态下执行高风险命令、访问工作区外路径或使用网络。

建议交付：

- 新增权限模式：
  - `read_only`：允许读取和搜索，禁止写入、shell、Hook 写操作。
  - `auto`：允许工作区内低风险读取/编辑和常规验证命令，高风险操作需要用户确认。
  - `full_access`：允许更宽权限，但仍记录审计日志并保留危险操作提示。
- 为 `workspace_shell` 增加命令分类：
  - 低风险：`git status`、`npm run typecheck`、`rg`、`ls` 等。
  - 中风险：安装依赖、启动服务、写文件、运行格式化。
  - 高风险：`rm -rf`、`git reset --hard`、`git clean`、写工作区外路径、网络下载执行脚本。
- 增加审批请求流：
  - 服务端生成 pending approval。
  - 前端展示命令、工作目录、原因、风险等级。
  - 支持 approve once、approve for session、deny。
- 增加规则文件或配置项：
  - 命令前缀 allow / prompt / deny。
  - 支持项目级和用户级配置。
- 记录审计日志：
  - 命令、cwd、权限模式、审批结果、时间、sessionId、runId。
  - 日志存到 `.coding-agent/`，不进入 Git。

涉及文件：

- `src/workspace-tools.ts`
- `src/agent.ts`
- `src/ui.ts`
- `src/web/codex-app/body.ts`
- `src/web/codex-app/client-script.ts`
- `src/web/codex-app/styles.ts`
- `docs/DEVELOPMENT_GUIDELINES.md`
- `README.md`

验收标准：

- Read-only 模式下，agent 无法执行 shell 或修改文件。
- Auto 模式下，工作区外路径访问必须被拒绝或要求审批。
- 高风险命令不会静默执行。
- 用户能在 UI 中看到并处理审批请求。
- 审计日志能还原每次被允许或拒绝的操作。
- TypeScript 类型检查通过。
- 有覆盖命令分类、权限决策、审批状态流的自动化测试。

### P0.2 本地 Web 服务安全

当前状态：

- 默认绑定 `127.0.0.1`，但支持 `--host 0.0.0.0`。
- 非 loopback 绑定需要 capability token；状态变更 API 做 Origin 校验。
- JSON body 有统一大小限制。
- `/api/run` 可以触发 agent 执行，并受同源/访问 token 防护。
- API key 可保存到 `coding-agent.config.json`，保存文件权限保持收紧。

目标：

- 本地使用保持低摩擦。
- 一旦服务暴露到非 localhost，必须有最小访问控制。
- 防止网页跨站请求触发本地 agent 执行。

建议交付：

- capability token：
  - 服务启动时生成随机 token。
  - 非 localhost 绑定时强制启用。
  - token 可通过 URL fragment、cookie 或 header 传递，避免打印到普通日志。
- Origin / Host 校验：
  - 默认只接受当前服务 host。
  - 禁止外站网页直接 POST 到本地 API。
- 请求体大小上限：
  - JSON body 上限。
  - 附件总大小继续保留服务端权威校验。
- 敏感 API 防护：
  - `/api/key`
  - `/api/run`
  - `/api/sessions/discard`
  - `/api/sessions/workspace`
  - 删除项目/会话接口。
- 密钥处理：
  - 不把 API key 写入消息、Hook payload 或日志。
  - 保存配置时继续使用 `0600` 权限。
  - UI 明确显示密钥来源：手动、环境变量、配置文件。

涉及文件：

- `src/ui.ts`
- `src/web/codex-app/client-script.ts`
- `README.md`

验收标准：

- 外站 Origin 无法调用敏感 API。
- 超大 JSON 请求被拒绝，服务不会无限读入内存。
- `--host 0.0.0.0` 启动时必须启用访问 token。
- token 缺失或错误时返回 401/403。
- API key 不出现在普通日志和会话消息中。
- 有 API 安全相关集成测试。

### P0.3 自动化测试体系

当前状态：

- 已新增 `npm test` / `npm run test:unit` / `npm run test:integration`。
- 测试覆盖权限决策、审批队列、HTTP 安全、Git/worktree、managed worktree
  orphan 清理、Browser policy、Extension runtime、workspace shell 审批和
  终端管理器。
- 基线验证仍保留 `npm run typecheck`，入口或发布相关变更运行
  `npm run build`。

目标：

- 给高风险模块建立最小但有效的测试网。
- 后续改权限、持久化、Worktree、NDJSON 流时能快速发现回归。

建议交付：

- 增加测试脚本：
  - `npm test`
  - `npm run test:unit`
  - `npm run test:integration`
- 优先使用 Node.js 内置测试能力或轻量测试工具，避免过早引入复杂测试框架。
- 单测覆盖：
  - 路径边界和附件文件名清洗。
  - 权限决策和命令分类。
  - session memory normalizer。
  - extension runtime 解析。
  - diff parser 和 Git 状态解析。
- 集成测试覆盖：
  - `POST /api/run` NDJSON 事件格式。
  - SQLite schema 初始化和 legacy JSON 迁移。
  - Worktree 创建、迁移 patch、Undo。
  - 附件上传和 preview 路径隔离。
  - Hook 成功/失败/超时。
  - 队列更新和取消。

涉及文件：

- `package.json`
- `src/*`
- `test/*` 或 `tests/*`
- `docs/DEVELOPMENT_GUIDELINES.md`

验收标准：

- `npm test` 可在本地稳定运行。
- 测试不依赖用户真实项目、真实 API key 或真实网络。
- Git/Worktree 测试使用临时目录。
- CI 或本地检查文档明确推荐 `npm run typecheck && npm test`。

### P0.4 代码结构拆分

当前状态：

- `src/ui.ts` 同时承担 HTTP 路由、状态管理、SQLite、工作树迁移、附件、运行队列、服务启动等职责。
- `src/web/codex-app/client-script.ts` 同时承担前端状态、渲染、事件绑定、流处理、模型选择、diff、browser preview 等职责。

2026-06-30 已落地第一批低风险拆分：

- `src/permissions.ts`：权限模式、shell 风险判断、规则和审计。
- `src/approval-queue.ts`：shell approval 队列。
- `src/http-security.ts`：本地 Web 服务 token、Origin 和 body size 防护。
- `src/terminal-manager.ts`：终端进程、输出缓冲和搜索所需数据。
- `src/automation-schedule.ts`：interval/cron 调度和失败退避。
- `src/project-memory.ts`：项目/用户长期记忆读写、搜索和注入设置。
- `src/browser-inspection.ts`：Browser URL 策略、DOM 摘要、静态资源检查和
  content-type 判断。
- `src/sdk-tool-boundary.ts`：SDK built-in tool 边界摘要、状态展示数据和
  agent runtime instruction。
- `src/worktree-cleanup.ts`：managed worktree orphan 清理。

目标：

- 降低后续实现权限、终端、Git 操作、自动化时的修改风险。
- 保持现有 API 合约不变，先拆内部边界。

建议交付：

- 服务端拆分：
  - `server/routes.ts`
  - `server/state.ts`
  - `server/persistence.ts`
  - `server/run-queue.ts`
  - `server/attachments.ts`
  - `server/worktrees.ts`
  - `server/security.ts`
- 前端拆分：
  - `web/codex-app/state.ts`
  - `web/codex-app/api-client.ts`
  - `web/codex-app/messages.ts`
  - `web/codex-app/model-picker.ts`
  - `web/codex-app/review-panel.ts`
  - `web/codex-app/browser-panel.ts`
  - `web/codex-app/queue.ts`
- 保留最终 `render.ts` 组装方式，避免一次性迁移到框架。

验收标准：

- 拆分后功能行为不变。
- `POST /api/run` NDJSON 合约不变。
- `GET /api/status` 字段保持兼容。
- `npm run typecheck` 和测试通过。

## P1：高价值产品能力

### P1.1 Git 审查与发布链路

当前状态：

- 有 diff panel、Undo、文件级 stage / unstage / revert、commit、提交信息
  建议、当前分支 push、Draft PR 创建、文件级反馈和 hunk 级 stage /
  revert。

目标：

- 把 agent 产出的变更从“可看”提升到“可审、可整理、可提交”。

建议交付顺序：

1. 文件级 revert。
2. 文件级 stage / unstage。
3. hunk 级 stage / revert。
4. inline comment 反馈给 agent。
5. commit message 生成和 commit。
6. push。
7. GitHub PR 创建，可优先通过 `gh` CLI 或 GitHub MCP。

验收标准：

- 用户可以只接受部分文件或部分 hunk。
- Revert 操作不会影响未选中的用户变更。
- Commit/push/PR 前有清晰确认。
- Git 操作失败时 UI 展示可理解错误。

### P1.2 集成终端

当前状态：

- agent 可通过 shell tool 执行命令。
- Review 面板已有 per-session 终端命令面板，支持 stdout/stderr 展示、停止
  运行中命令和多 terminal run 切换。
- 运行中 terminal 支持通过 `/api/terminal/input` 发送 stdin，Terminal 面板
  提供输入栏和基础快捷键。
- 当前选中 terminal run 支持前端输出搜索、高亮和匹配行计数。
- agent 下一次运行可读取同 session 最近终端输出。
- 尚未实现真正交互式 PTY、终端尺寸同步和 ANSI 颜色渲染；已完成 ANSI
  控制序列清理第一版。

目标：

- 让用户在同一 UI 内运行验证命令、开发服务和 Git 操作。
- 让 agent 能参考当前终端输出继续诊断。

建议交付：

- 每个 session 一个或多个终端运行记录，短期用子进程 stdin/stdout/stderr
  闭环；长期升级为真正 PTY。
- 终端输出流式展示。
- 支持启动/停止长运行进程和向运行中进程发送 stdin。
- agent 可读取最近 N 行终端输出。
- 服务退出时清理子进程。
- 前端支持终端面板、快捷键、复制输出。
- 当前输出搜索。

验收标准：

- `npm run dev`、`npm test` 等长短命令都可运行。
- 服务关闭时不会留下孤儿进程。
- agent 能基于终端错误继续修复。
- 权限模式能约束终端命令。

### P1.3 Browser 自动化能力

当前状态：

- Review panel 有 iframe 预览和坐标标注。
- Browser 面板已有 localhost/file 受控检查、DOM 摘要、资源检查、截图附件和
  Playwright MCP 一键启用。
- 交互式点击/回放、运行时 console log 和 DevTools 级 network waterfall
  仍依赖外部 MCP 或后续浏览器控制通道。
- 内置检查已支持静态资源 network 检查、错误展示和 waterfall 视图。

目标：

- 把 Browser 从“视觉反馈面板”升级为“可检查、可截图、可点击、可回放”的测试工具。

建议交付：

- 内置 Playwright MCP 推荐配置和一键启用。
- 页面截图、DOM 摘要、静态 network/resource error 和 waterfall 展示。
- console log 和 DevTools 级 runtime waterfall。
- 允许 agent 运行受控 browser actions。
- 允许/阻止站点列表。
- 对 localhost/file preview 默认友好，对公网网站保守。
- 后续支持连接用户 Chrome profile。

验收标准：

- 用户可以打开 localhost 页面并让 agent 截图检查。
- Browser actions 受权限模式约束。
- 视觉标注能自动附带 URL、视口、坐标、截图路径。
- 登录态需求明确提示使用 Chrome 连接或外部 MCP。

### P1.4 插件、技能和 MCP 生态完善

当前状态：

- 可发现 `.agents/skills/*/SKILL.md` 和 `~/.agents/skills`。
- 支持显式 `$skill-name` 和保守隐式触发加载 skill body。
- 插件支持 `plugin.json` 和 `.codex-plugin/plugin.json`。
- Plugin inventory 会显示 manifest 版本、MCP 数量和依赖摘要。
- Review 面板 Extensions 标签页可查看并启用/禁用 Skill、Plugin、MCP server。
- Hook 可按单条启用/禁用，禁用后不会进入下一次 agent lifecycle hook。
- MCP 支持禁用、server deny 和 tool allow / prompt / deny；prompt 策略目前
  是 runtime instruction 约束，因为 SDK 暂未提供 MCP tool-call 级审批回调。
- OAuth、远程安装和拦截式 per-tool 审批仍是后续增强。

目标：

- 让扩展系统更接近 Codex 的技能/插件/MCP 使用体验。

建议交付：

- 技能：
  - 支持隐式技能触发。
  - 支持技能启用/禁用。
  - 技能列表超长时更清晰地裁剪和告警。
  - 支持 skill references/scripts 的安全读取策略。
- 插件：
  - 支持标准 `.codex-plugin/plugin.json`。
  - 支持本地插件目录和 marketplace manifest。
  - 插件启用/禁用状态持久化。
  - 插件依赖说明展示。
- Hook：
  - Hook 列表展示。
  - Hook 启用/禁用状态持久化。
- MCP：
  - MCP server 管理 UI。
  - server 启用/禁用。
  - tool allow/prompt/deny。
  - OAuth login 状态。
  - tool timeout/startup timeout 配置。

验收标准：

- 用户能在 UI 中看到可用 Skills、Plugins、MCP servers。
- 禁用的 skill/plugin/MCP 不会进入 agent 上下文。
- MCP 工具策略能被权限系统识别。
- 配置错误不会导致整个 run 崩溃，能给出可读 warning。

### P1.5 多 Agent 体系升级

当前状态：

- UI 有“多 Agent”开关。
- Planner 最多拆 6 个任务，按依赖 rank 并发执行。
- 支持 `multiAgent.agents` profile 覆盖 name、description、instructions、
  model 和 permissionMode。
- 子 Agent task card 显示 profile、access mode、changed files，并可取消单个
  运行中的子 Agent。
- 子 Agent task card 可展开查看 prompt、输出、错误、tool usage 和 token
  usage。
- 已实现 task 级 steering note：PENDING 任务会带入 prompt，RUNNING 任务会
  记录并展示；尚未实现 SDK run 级 live steering、独立线程查看和 patch 级
  合并/冲突 UI。

目标：

- 从“一次性 planner 并发任务”升级成可观察、可配置、可引导的 subagent 工作流。

建议交付：

- 自定义 agent 配置：
  - name
  - description
  - instructions
  - model
  - reasoning/effort 参数
  - sandbox/permission override
- 子 Agent 运行详情页：
  - prompt
  - 状态
  - streamed output
  - tool calls
  - changed files
  - token usage
- 支持向运行中的子 Agent 发送指导或取消。
- 写操作隔离：
  - read-only subagent 默认禁止写。
  - write-heavy 子任务优先独立 worktree 或串行合并。
- 冲突处理：
  - 任务输出 patch。
  - 合并前检查。
  - 冲突时回到主线程决策。

验收标准：

- 用户能知道每个子 Agent 在做什么。
- 子 Agent 失败不会让主 session 丢失可用结果。
- 多个写任务不会静默覆盖彼此变更。
- 多 Agent 模式的结果能进入 session memory。

### P1.6 自动化和线程唤醒

当前状态：

- Review 面板已有 Automations 标签页。
- 自动化绑定当前 session，按分钟间隔或 cron 表达式触发 prompt，保留上下文
  继续运行。
- 自动化状态持久化在 `.coding-agent/automations.json`，失败 3 次自动暂停。
- 自动化失败重试有指数退避，列表可展开查看最近运行历史。
- 自动化要求显式 `read_only` 或 `auto` 权限模式，不允许无人值守
  `full_access`。

目标：

- 支持重复性本地任务，例如每日检查测试、定期查看日志、持续跟踪一个修复任务。

建议交付：

- Automation model：
  - project automation
  - thread automation
  - schedule
  - prompt
  - workspace mode
  - enabled/disabled
  - last run / next run / failure count
- 后台执行：
  - Git 项目优先使用专用 worktree。
  - 非 Git 项目直接使用项目目录，但风险提示更强。
- UI：
  - 自动化列表。
  - 创建/暂停/删除。
  - 最近运行历史。
- 安全：
  - 自动化必须使用明确权限模式。
  - 高风险命令不能在无人值守时直接执行。

验收标准：

- 自动化能在服务运行时按计划触发。
- 同一 thread automation 能保留上下文继续运行。
- 失败不会无限重试。
- Git 项目后台 worktree 可自动准备并清理 orphan。

## P2：长期 Codex 形态对齐

### P2.1 Cloud、Remote 和 IDE Sync

2026-06-30 已落地 IDE context sync 接收/注入第一版：

- 服务端新增 `/api/ide-context` GET/POST/DELETE。
- 外部 IDE/脚本可提交当前 session 的 active file、open files、selection 和
  diagnostics。
- 文件路径只接受当前 session workspace 内路径；selection 和 diagnostics 做长度
  与数量限制。
- 下一次 agent run 会把 IDE context 作为低优先级 workspace context 注入 prompt。

2026-06-30 已落地 Cloud/Local execution mode 第一版：

- 顶部工具栏新增 Local/Cloud 执行模式切换。
- 服务端新增 `/api/sessions/execution-mode`，仅允许空闲 session 切换。
- 执行模式持久化在 agent snapshot；Cloud 运行继续依赖 Cursor SDK 和 GitHub
  remote 前置条件。

目标：

- 让本地 UI 支持更丰富的执行环境。

候选能力：

- Cloud execution mode 的完整 UI 和状态管理。
  - 已有 Local/Cloud 切换和状态持久化第一版；完整 Cloud 任务队列/远端状态
    仍待真实云端执行体验继续完善。
- SSH remote project。
- remote app server / WebSocket 控制。
- IDE context sync：
  - 当前打开文件。
  - 选区。
  - diagnostics。
  - 当前分支和编辑器状态。

落地前提：

- P0 权限和安全模型完成。
- P1 终端和工作区模型稳定。

### P2.2 Web Search 和资料工具

2026-06-30 已落地 P2.2 受控来源搜索第一版：

- 新增 workspace custom tool `web_search`。
- 默认 disabled；需要 `.coding-agent/web-search.json` 或
  `~/.coding-agent/web-search.json` 设置 `{"mode":"live"}` 才会访问网络。
- `read_only` 权限模式下阻止 live web search。
- 结果只返回 title、url、source、snippet 和不可信来源提示，不把网页内容提升为
  高优先级指令。

目标：

- 给 agent 稳定、可控、可引用的外部资料能力。

候选能力：

- 内置 web search provider。
- 官方文档优先策略。
- 结果缓存。
- 来源展示。
- 网页 prompt injection 风险提示。
- search disabled / cached / live 模式。

验收标准：

- agent 使用外部资料时能展示来源。
- 网络能力受权限系统约束。
- 默认不让任意网页内容污染高优先级指令。

### P2.3 记忆系统升级

当前状态：

- 每个 session 有压缩摘要和 recent entries。
- 已有项目级可编辑记忆 `.coding-agent/project-memory.md` 和用户级全局记忆
  `~/.coding-agent/user-memory.md`，可通过 slash command 和 Review 面板
  Memory 标签页查看、替换、删除、搜索，并注入后续 agent run。
- Memory 标签页可按 project/user scope 启用或停用 prompt 注入；设置保存在
  当前 workspace 的 `.coding-agent/memory.json`。
- Memory 标签页展示 session memory 摘要质量、compaction 历史和摘要预览。
- Memory 标签页已有 Facts、Preferences、Todos 结构化编辑第一版，保存仍使用
  Markdown 文件，兼容旧记忆内容。

候选能力：

- Project memory。
- User memory。
- Memory enable/disable。
- Memory search。
- 结构化记忆编辑。
- 更准确 tokenizer 估算。
- 摘要质量评估和历史 compaction 查看。

验收标准：

- 用户能查看、删除、禁用记忆。
- 记忆不会把敏感附件或 API key 持久化。
- session summary 与长期 memory 边界清晰。

### P2.4 非代码 artifact 能力

2026-06-30 已落地 P2.4 预览和验证第一版：

- Review 面板新增 Artifacts/产物标签页，可输入当前 session workspace 内的
  文件路径进行预览。
- 服务端新增 `/api/artifacts/preview` 和 `/api/artifacts/file`。
- 预览路径必须位于当前 session workspace 内，单文件最大 20MB。
- PDF 和常见图片支持内联预览；CSV/TSV 支持前 40 行表格预览；文本类文件
  支持 256KB 截断预览。
- 其它二进制产物只展示元数据，不内联执行或解析。

目标：

- 支持 PDF、表格、文档、PPT、图片等非代码产物的创建、预览和验证。

候选能力：

- PDF 预览和渲染检查。
- Spreadsheet/CSV 分析和导出。
- DOCX/PPTX 生成。
- 图片输入理解。
- 图片生成或编辑。
- Artifact side panel。

落地建议：

- 先支持“预览和验证”，再支持“生成和编辑”。
- 大文件处理必须有大小限制和临时文件清理。

### P2.5 交互效率和产品细节

当前状态：

- Slash commands、Prompt history search 已落地。
- 会话 pin/archive/search 已落地，并持久化到项目 session SQLite 状态。
- 顶栏主题选择和 Review 侧栏布局/当前标签页恢复已落地，持久化在
  localStorage。
- Pop-out conversation window 第一版已落地，支持专注对话窗口。

候选能力：

- Slash commands。
- Prompt history search。
- 会话 pin/archive/search。
- Project/thread 快速切换。
- Pop-out conversation window（conversation-focused 窗口和同源运行事件同步已
  完成第一版；跨设备/远端状态同步仍是后续项）。
- 主题和布局持久化（已完成第一版）。
- 语音输入。
- 更好的移动端查看。

落地建议：

- 优先做 slash commands、history search、pin/archive。
- 语音和 pop-out 放到更后。

## 推荐实施顺序

### 阶段 1：安全入口和测试底座

范围：

- P0.2 本地 Web 服务安全。
- P0.3 测试脚本和第一批核心单测。

原因：

- 这两项能立刻降低本地服务和后续重构风险。
- 对现有用户工作流影响较小。

完成标准：

- `npm run typecheck`
- `npm test`
- API 安全 smoke test

### 阶段 2：权限与沙箱

范围：

- P0.1 权限模式。
- 审批请求流。
- 命令分类和审计日志。

原因：

- 这是终端、Browser automation、自动化、多 Agent 写操作继续扩展的前置条件。

完成标准：

- Read-only / Auto / Full Access 可在 UI 切换。
- 高风险命令必须审批。
- 权限相关测试通过。

### 阶段 3：结构拆分

范围：

- P0.4 服务端和前端拆分。
- 不改变外部 API。

原因：

- 在进入 P1 大功能前降低耦合。

完成标准：

- 行为回归测试通过。
- 关键模块职责清晰。

### 阶段 4：Git 和终端

范围：

- P1.1 Git 审查发布链路。
- P1.2 集成终端。

原因：

- 这是 coding agent 本地 UI 的核心闭环：改代码、跑验证、审查、提交。

完成标准：

- 文件/hunk 级操作可用。
- per-session terminal 可用。
- agent 可读取终端输出。

### 阶段 5：Browser、扩展和多 Agent

范围：

- P1.3 Browser 自动化。
- P1.4 插件/技能/MCP 管理。
- P1.5 多 Agent 升级。

原因：

- 这些能力依赖前面的权限、终端、结构拆分。

完成标准：

- Browser 截图和 console/network 检查可用。
- UI 可管理 MCP/技能/插件启用状态。
- 子 Agent 状态和结果可检查。

### 阶段 6：自动化和 P2 长期能力

范围：

- P1.6 自动化。
- P2 中按实际产品方向选择。

原因：

- 自动化需要权限、安全、运行历史和后台 worktree 都足够稳定。

完成标准：

- thread automation 可创建、暂停、运行和查看历史。
- P2 只按明确需求推进。

## 风险和注意事项

- 权限系统不要只做 UI 提示，必须在服务端和工具层强制执行。
- Worktree、Undo、stage/revert 都必须保护用户未提交变更。
- Hook 和 MCP 都可能扩大执行面，必须接入权限和审计。
- 自动化不能默认继承 Full Access。
- 引入测试后要避免依赖真实 Cursor API key，可通过 mock agent 或测试专用接口隔离。
- 扩展系统需要明确“项目配置可信”与“用户配置可信”的边界。

## 验证矩阵

| 能力 | 必跑验证 |
| --- | --- |
| TypeScript 改动 | `npm run typecheck` |
| 打包或入口改动 | `npm run build` |
| API/权限/持久化 | `npm test` |
| Worktree/Undo/Git 操作 | 临时 Git 仓库集成测试 |
| UI 交互 | 本地 dev server 手动 smoke test |
| Browser 自动化 | Playwright smoke test |
| MCP/Hook | 成功、失败、超时、禁用四类场景 |
| 自动化 | 定时触发、失败退避、取消、清理 |
