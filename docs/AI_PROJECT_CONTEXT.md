# AI Project Context

Last reviewed against source on 2026-07-01.

## Purpose

This project implements a local browser-based control surface for a Cursor SDK
coding agent. The app starts an HTTP server, lets the user open local
workspaces, manages chat sessions, streams agent output, shows diffs, supports
attachments, optionally runs multi-agent plans, and keeps compacted conversation
memory so long sessions can continue.

The package can also be installed as the `code-agent-ui` command.

## Primary Features

- Local web UI served from a Node HTTP server.
- API key entry, optional local config persistence, and Cursor model loading.
- Multiple opened projects with per-project persisted sessions.
- Agent runs expose the active session workspace plus other already-opened
  projects as configured workspace roots, allowing one prompt to inspect or
  modify code in A and B without switching the active session workspace.
  Relative paths still resolve inside the active session workspace;
  cross-project access uses the other project's absolute path.
- Session search, pinning, and archiving in the sidebar.
- Per-session Local or managed Git Worktree workspace modes.
- Single Local execution mode for agent runs; sessions may still use Local or
  managed Git Worktree workspace modes.
- Transient per-session IDE context sync API for active/open files, selection,
  and diagnostics; injected into the next run as low-priority workspace context.
- Single-agent runs using `@cursor/sdk`.
- Multi-agent runs using Cursor SDK native subagents through the SDK Task tool,
  with expandable task prompt/output/error/tool/token/permission-boundary
  details. Whole multi-agent runs can be cancelled; SDK subagents do not expose
  independent per-task cancellation.
- Context compaction with structured session memory and deterministic fallback.
- Memory tab session-memory diagnostics for summary quality, prompt snapshots,
  and compaction history.
- Run queueing per session, including higher-priority "guide" corrections.
- File attachments saved under the active workspace's `.coding-agent/uploads`;
  long pasted text is folded into a pending text attachment card instead of
  filling the composer.
- Git diff review panel for the latest session run, including file-level and
  hunk-level actions, commits, push/PR helpers, and feedback-to-prompt
  comments.
- Browser preview, annotation, localhost/file inspection, screenshot attachment,
  static network/resource checks, and Playwright MCP enablement in the UI.
- Artifact preview panel for workspace files, including PDF/image inline preview,
  CSV/TSV table preview, and bounded text previews.
- Optional `web_search` workspace custom tool, disabled by default and enabled
  only through `.coding-agent/web-search.json` or
  `~/.coding-agent/web-search.json` with `{"mode":"live"}`; availability also
  depends on workspace custom tools being exposed for the active permission mode.
- Per-session terminal command panel with streamed output and prompt context
  injection, including switching between recent terminal runs and searching the
  selected output.
- Project-local thread automations persisted under `.coding-agent/automations.json`.
  Git projects prefer managed Worktree execution for unattended runs; non-Git
  projects fall back to Local mode. Failures use exponential backoff before the
  third consecutive failure pauses the automation, and the UI can expand recent
  run history.
- Project memory persisted under `.coding-agent/project-memory.md` and user
  memory persisted under `~/.coding-agent/user-memory.md`; both are injected
  into future agent runs with separate scope labels and can be edited from slash
  commands or the Review panel Memory tab. The Memory tab can generate
  structured Facts/Preferences/Todos Markdown. Per-workspace memory injection
  toggles are stored in `.coding-agent/memory.json`.
- Permission modes for app-owned workspace shell tools, terminal commands, and
  lifecycle hooks, with approval queue support, shell prefix rules, and audit
  logs under `.coding-agent/audit.log`.
- Local HTTP hardening: body limits, cross-origin write protection, and access
  tokens for non-loopback binds.
- Extension runtime and review-panel management for project instructions,
  skills, plugins, MCP servers, and lifecycle hooks.
- Development reload endpoint for the TypeScript watch workflow.
- Composer slash commands and browser-local prompt history for faster UI
  navigation.

## Repository Map

- `src/ui.ts`
  Main executable and HTTP server. Owns CLI parsing, API routes, in-memory UI
  state, project/session persistence, worktree migration, run queueing, file
  attachments, Git diff extraction, and shutdown.

- `src/agent.ts`
  Wraps `@cursor/sdk`. Owns `CodingAgentSession`, model selection, prompt
  assembly, context compaction orchestration, local agent creation,
  cancellation, Cursor SDK event normalization, and model context-window
  inference.

- `src/workspace-tools.ts`
  Defines the local custom tools passed into Cursor SDK agents when SDK
  sandbox/Auto-review will not force local MCP interactive approval:
  `workspace_project_snapshot`, `workspace_read_file`, `workspace_list_files`,
  `workspace_grep`, and `workspace_shell`.

- `src/approval-queue.ts`
  Owns interactive shell approval state, including pending approvals,
  approve-once, approve-for-session, and session cleanup.

- `src/terminal-manager.ts`
  Owns per-session terminal child processes, bounded output buffers, line-cursor
  polling state, permission checks, and recent-output prompt context.

- `src/git-workspace.ts`
  Owns Git tree snapshots, binary patch application, session diff extraction,
  diff parsing, and untracked-file diff previews.

- `src/session-memory.ts`
  Durable conversation memory model. Normalizes snapshots, stores recent entries,
  creates compaction plans, parses structured JSON summaries, renders summaries,
  and creates deterministic fallback summaries.

- `src/project-memory.ts`
  Project/user-level editable memory file helpers for reading, writing,
  deleting, searching, and rendering prompt context.

- `src/browser-inspection.ts`
  Browser inspection helpers: URL normalization, allow/deny policy resolution,
  DOM summaries, static resource checks, and local file content-type detection.

- `src/sdk-tool-boundary.ts`
  Describes the enforceable boundary between app-owned custom tools and Cursor
  SDK built-in tools. Provides status summaries and runtime instructions for
  sandbox/auto-review limitations.

- `src/extensions.ts`
  Loads runtime instructions and tools from the active session workspace:
  `AGENTS.override.md` or `AGENTS.md`, `.agents/skills/*/SKILL.md`,
  `~/.agents/skills`, `.coding-agent/plugins/*/plugin.json`,
  `coding-agent.extensions.json`, `.coding-agent/extensions.json`, MCP servers,
  and hooks.

- `src/multi-agent.ts`
  Wraps Cursor SDK native subagents. It registers SDK `agents`, sends the
  coordinator prompt, maps SDK Task tool calls into UI task state, and
  summarizes results back into the main session.

- `src/web/codex-app/render.ts`
  Assembles the full HTML document from body, styles, and client script strings.

- `src/web/codex-app/body.ts`
  Static HTML shell. Contains the auth screen, sidebar, conversation area,
  composer, review panel, diff view, browser preview, and annotation controls.

- `src/web/codex-app/styles.ts`
  CSS for the web UI.

- `src/web/codex-app/client-script.ts`
  Browser-side state and interactions. Calls the JSON/NDJSON API, renders
  messages, handles streaming, attachments, model picker, queue UI, diff review,
  browser preview comments, and dev reload.

## Runtime Data

- App-level config:
  `coding-agent.config.json`, ignored by Git. Stores `apiKey`, `port`, and
  `version` when the user chooses to save the key.

- App-level registry:
  `.session/projects.json`, ignored by Git. Tracks opened project paths and the
  active project/session.

- Per-opened-project state:
  `<opened-workspace>/.coding-agent/sessions.sqlite`, ignored by Git. Stores
  project metadata, sessions, messages, agent snapshots, change baselines, change
  results, and workspace metadata.

- Cursor SDK native agent store:
  `<opened-workspace>/.coding-agent/sdk-agent-store/`, ignored by Git. Stores
  SDK local agent/run/checkpoint JSONL data used by `Agent.resume(agentId)`.

- Attachments:
  `<opened-workspace>/.coding-agent/uploads/<session-id>/...`, ignored by Git.
  Text-like files get a prompt preview; image/binary files are referenced by
  saved paths. The browser client also turns large plain-text paste events into
  temporary `.txt` attachments before submission.

- Automations:
  `<opened-workspace>/.coding-agent/automations.json`, ignored by Git. Stores
  project-local thread automations, interval or cron schedules, prompt text,
  permission mode, workspace mode, last/next run state, failure count, and
  short history.

- Project memory:
  `<opened-workspace>/.coding-agent/project-memory.md`, ignored by Git. Stores
  user-editable workspace memory managed through slash commands or the Memory
  tab and injected into future runs.

- Memory settings:
  `<opened-workspace>/.coding-agent/memory.json`, ignored by Git. Stores
  project/user prompt injection toggles for the active workspace.

- User memory:
  `~/.coding-agent/user-memory.md`. Stores user-editable cross-workspace memory
  managed through slash commands or the Memory tab and injected into future
  runs.

- Managed worktrees:
  `<app-root>/.session/worktrees/<project>-<session-id>`, ignored by Git.
  Startup, project removal, and shutdown clean orphan directories in this root
  when they are no longer referenced by an active session.

- Build output:
  `dist/`, ignored by Git and generated by `npm run build`.

## HTTP API Surface

The server is defined in `src/ui.ts` with a single `createServer` request
handler.

- `GET /`: render the full UI HTML.
- `GET /api/status`: return current UI state, active project/session, running
  sessions, model state, pending approvals, and context usage.
- `POST /api/approvals/resolve`: approve once, approve for session, or deny a
  pending shell approval request.
- `GET /api/dev/events`: SSE endpoint for reload readiness in dev mode.
- `GET /api/changes?sessionId=...`: return session diff metadata and diff lines.
- `POST /api/git/file`: stage, unstage, or revert one file in the session
  workspace when the session is idle.
- `POST /api/git/hunk`: stage or revert one unstaged text hunk in the session
  workspace when the session is idle.
- `POST /api/git/commit`: commit currently staged changes in the session
  workspace.
- `POST /api/git/commit-message`: suggest a commit message from the staged diff.
- `POST /api/git/push`: push the current branch when it has a remote target and
  local commits ahead.
- `POST /api/git/pr`: create a draft GitHub pull request for the pushed current
  branch through `gh`.
- `GET /api/terminal/list?sessionId=...`: list terminal commands for a session.
- `GET /api/terminal/output?terminalId=...&since=...`: poll terminal output
  lines after a client line cursor.
- `POST /api/terminal/start`: start a shell command in the active session
  workspace, subject to the app permission mode.
- `POST /api/terminal/stop`: stop a running terminal command.
- `GET /api/project-memory?sessionId=...`: read project memory for a session
  workspace.
- `POST /api/project-memory`: replace project memory for a session workspace.
- `DELETE /api/project-memory`: delete project memory for a session workspace.
- `GET /api/memory?scope=project|user|all&sessionId=...`: read scoped memory.
- `GET /api/memory/search?query=...&sessionId=...`: search project and user
  memory.
- `GET /api/session-memory?sessionId=...`: read session memory diagnostics,
  including summary quality, compaction history, prompt snapshots, and recent
  entries.
- `GET /api/ide-context?sessionId=...`: read transient IDE context for a
  session.
- `POST /api/ide-context`: replace transient IDE context for a session.
- `DELETE /api/ide-context`: clear transient IDE context for a session.
- `POST /api/memory`: replace project or user memory.
- `POST /api/memory/settings`: enable or disable project/user memory injection
  for the active workspace.
- `DELETE /api/memory`: delete project or user memory.
- `POST /api/browser/inspect`: inspect an allowed localhost or workspace-local
  `file:` page, summarize DOM/resource state, and save a screenshot attachment
  when a Chrome/Chromium executable is available.
- `POST /api/browser/playwright-mcp`: write the recommended Playwright MCP
  server config into the active session workspace's
  `.coding-agent/extensions.json`.
- `GET /api/artifacts/preview?sessionId=...&path=...`: summarize and preview a
  workspace artifact path with size and path-safety limits.
- `GET /api/artifacts/file?sessionId=...&path=...`: stream previewable
  image/PDF artifacts from inside the session workspace.
- `GET /api/extensions?sessionId=...`: return discovered Skills, Plugins, MCP
  servers, Hooks, warnings, and the local extension config path.
- `POST /api/extensions/toggle`: enable or disable a Skill, Plugin, or MCP
  server by writing disabled lists to `.coding-agent/extensions.json`.
- `GET /api/attachments/preview?sessionId=...&name=...`: stream previewable
  image attachments.
- `GET /api/models`: validate/load models with the current API key.
- `POST /api/key`: set API key, optionally persist to `coding-agent.config.json`.
- `POST /api/model`: select a loaded model.
- `POST /api/permissions`: switch the app permission mode when no session run is
  active.
- `POST /api/projects/pick`: native directory picker where supported.
- `POST /api/projects/open`: open a workspace path.
- `POST /api/projects/select`: switch active project.
- `DELETE /api/projects`: remove an opened project and its local persisted state.
- `POST /api/sessions` and `POST /api/new-session`: create or reuse an empty
  session.
- `POST /api/sessions/select`: switch active session.
- `POST /api/sessions/flags`: update session pin/archive flags.
- `DELETE /api/sessions`: delete a session and cleanup attachments/worktrees.
- `POST /api/sessions/messages`: persist browser-side message rendering state.
- `POST /api/sessions/workspace`: migrate a session between Local and Worktree.
- `POST /api/sessions/discard`: restore the session workspace to the run
  baseline tree.
- `POST /api/cancel`: cancel the active single-agent or multi-agent run.
- `POST /api/multi-agent/task/cancel`: records that per-subagent cancellation
  was requested, but SDK native subagents currently require cancelling the whole
  active multi-agent run.
- `GET /api/automations`: list project-local automations for the active project.
- `POST /api/automations/preview`: validate interval/cron input and return the
  next scheduled run time for the automation editor.
- `POST /api/automations`: create a thread automation bound to a session.
- `POST /api/automations/toggle`: pause or enable an automation.
- `POST /api/automations/run`: request an immediate automation run.
- `DELETE /api/automations`: delete an automation and clear its timer.
- `POST /api/run/queue/update`: edit/reprioritize a queued run.
- `POST /api/run/queue/cancel`: remove a queued run.
- `POST /api/run`: submit a run and stream NDJSON events. Runs keep the active
  session workspace as the primary root and expose other already-opened
  projects as additional workspace roots for custom workspace tools.

## Run Lifecycle

1. `POST /api/run` validates prompt, attachments, selected session, project
   activity, API key, and model readiness.
2. `submitSessionRun` either starts immediately or enqueues the run for that
   session.
3. `executeSessionRun` rebinds the session agent if the workspace path changed
   and refreshes its configured workspace roots from the current opened projects.
4. It captures `changeBaselineTree` from the active session workspace when Git is
   available.
5. It changes process cwd to the session workspace and verifies shell access.
6. Attachments are saved and appended to the prompt with paths and previews.
7. Guide-mode prompts are wrapped as corrections to earlier in-flight work.
8. `loadExtensionRuntime` reads active instructions, skills, plugins, MCP
   servers, and hooks.
9. `UserPromptSubmit` and `PreRun` hooks run with JSON payloads on stdin.
10. Project memory, recent terminal output, and Browser inspection context from
    the same session are appended to the prompt when available.
11. The run starts as either:
    - single-agent: `CodingAgentSession.sendPrompt`.
    - multi-agent: `MultiAgentRunner.run`, then summarized into session memory.
12. `PostRun` hooks run after success.
13. `changeResultTree` is captured, the session is persisted, and the next queued
    run starts.

## Agent Behavior

`CodingAgentSession` builds a prompt from:

- built-in agent instructions,
- project extension instructions,
- compacted session memory summary,
- recent uncompressed conversation,
- current user task.

Before each run it estimates context size. If enabled and over the effective
budget, it compacts older entries with a fresh Cursor SDK agent. If compaction
fails, it uses deterministic middle-truncation fallback text. On context-limit
errors before meaningful agent work, it forces compaction and retries once.

Local agents receive custom workspace tools:

- `workspace_roots`
- `workspace_project_snapshot`
- `workspace_read_file`
- `workspace_list_files`
- `workspace_grep`
- `workspace_shell`

`workspace_shell` is controlled by the app permission mode. Read-only mode
blocks shell commands; Auto mode allows low-risk read/validation commands and
creates UI approvals for mutating or high-risk `workspace_shell` commands; Full
Access allows the app-owned shell tool while recording audit entries. Cursor SDK
built-in local tools use the SDK sandbox and Auto-review where available. Since
SDK custom tools are exposed as MCP tools, the app withholds `workspace_*`
custom tools while SDK sandbox/Auto-review approval mode is active; otherwise
local SDK runs would reject them because interactive MCP approval is unavailable.
Shell prefix rules are read from `~/.coding-agent/permissions.json` and the
active workspace's `.coding-agent/permissions.json`.

## Worktree And Undo Model

Local mode uses the opened project directory. Worktree mode creates a detached
managed Git worktree under `.session/worktrees`. Migration can carry current
workspace changes by generating a binary Git patch from the source tree and
applying it to the target after `git apply --check`.

Undo uses `changeBaselineTree`, captured at run start. The current workspace
tree is compared to the baseline; if different, the app creates a reverse binary
patch and applies it. This is intentionally Git-tree based rather than a simple
file overwrite so staged, unstaged, added, deleted, and binary changes can be
represented more safely.

`.worktreeinclude` at the project root can list ignored local files or
Git-ignore-style patterns to copy into managed worktrees.

## Extension Runtime

Runtime instructions are loaded from the active session workspace, not the app
repository unless the app repository is itself the opened project.

Instruction discovery:

- Walk from Git root to cwd.
- For each directory, use `AGENTS.override.md` if present; otherwise use
  `AGENTS.md`.
- Total loaded instruction bytes are capped.

Skill discovery:

- `.agents/skills/*/SKILL.md` from Git root down to cwd.
- `~/.agents/skills`.
- The rendered prompt lists available enabled skills. Full skill body is loaded
  when the user references `$skill-name` or when the prompt clearly matches the
  skill name/description.

Plugin and config discovery:

- Plugin manifests from configured paths, `.coding-agent/plugins/*/plugin.json`,
  and `.coding-agent/plugins/*/.codex-plugin/plugin.json`.
- Plugin inventory shows manifest version, MCP server count, and dependency
  summaries when present.
- Extension configs from `coding-agent.extensions.json` or
  `.coding-agent/extensions.json`.
- MCP servers are passed directly to Cursor SDK run options.
- `mcpPolicies` can deny whole servers or describe tool-level allow / prompt /
  deny policies. Tool policies are visible in inventory and runtime
  instructions; prompt policies are not hard SDK approvals until the SDK exposes
  a tool-call interception hook.
- Hooks support `UserPromptSubmit`, `PreRun`, and `PostRun`.
- `.coding-agent/extensions.json` can disable Skills, Plugins, and MCP servers
  locally. Disabled items remain visible in the Extensions tab but are excluded
  from future agent runtime instructions and MCP config.
- `.coding-agent/extensions.json` can also disable individual hooks through
  generated `disabledHooks` IDs; disabled hooks remain visible in inventory but
  are excluded from lifecycle execution.
- `multiAgent.agents` can define subagent profiles with `name`, `description`,
  `instructions`, optional `model`, and optional `permissionMode`.

## Persistence Compatibility

SQLite is the current storage format for project sessions. The app still reads
legacy `.session/sessions.json`, migrates it into per-project SQLite, and keeps
normalizers tolerant of missing or malformed fields.

When adding fields:

- Add normalizer fallbacks.
- Add SQLite migration logic in `ensureProjectStateSchema`.
- Preserve legacy JSON read paths unless intentionally removing migration.
- Keep session snapshots serializable as JSON.
