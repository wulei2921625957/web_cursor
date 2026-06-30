# Development Guidelines For AI Agents

Last reviewed against source on 2026-06-30.

## Default Workflow

1. Read `AGENTS.md`, this file, and `docs/AI_PROJECT_CONTEXT.md`.
2. Inspect the relevant source before editing.
3. Keep changes scoped to the requested behavior.
4. Run `npm run typecheck` after TypeScript changes.
5. Run `npm test` after changing permission, HTTP security, persistence,
   workspace tool, Hook, queue, or Git/worktree behavior.
6. Run `npm run build` when packaging, emitted behavior, or import structure is
   affected.

The test suite is intentionally lightweight. Unit tests run through Node's test
runner via `tsx`.

## Code Style

- TypeScript strict mode, ESM, `moduleResolution: NodeNext`.
- Prefer Node standard library APIs already used in the project.
- Use double quotes and no semicolons, matching the current source.
- Keep types explicit where they document API/state boundaries.
- Keep comments rare and useful. Existing comments explain edge cases and safety
  rationale, not obvious assignments.
- Do not edit `dist/`; it is generated.
- Do not introduce a frontend framework unless explicitly requested. The current
  UI is static HTML/CSS/client JS assembled from TypeScript strings.

## User-Facing Text

The UI currently uses Chinese for most labels, status messages, and errors.
Preserve that language in new user-facing UI behavior unless a broader copy
change is requested. Internal developer docs can use English or Chinese, but
code identifiers should stay clear and stable.

## Security And Local State

- Treat `coding-agent.config.json` as a secret-bearing local file. It is ignored
  by Git and may contain a Cursor API key.
- Do not log API keys or include them in persisted messages.
- Keep `.session/` and `.coding-agent/` ignored local state.
- Permission decisions for app-owned shell tools, terminal commands, and hooks
  are recorded under `.coding-agent/audit.log`.
- Shell prefix rules are read from `~/.coding-agent/permissions.json` and the
  active workspace's `.coding-agent/permissions.json`. Rules support
  `allow`, `prompt`, and `deny`; read-only mode remains the strongest app mode
  and should not be bypassed by allow rules.
- State-changing HTTP APIs reject cross-origin browser requests. Non-loopback
  server binds require an access token.
- When handling file paths from clients or agents, preserve the existing
  `path.resolve` and `isInsidePath` style protections.
- Keep attachment file names sanitized. Do not serve arbitrary paths through the
  preview endpoint.

## API Contracts

- `POST /api/run` streams `application/x-ndjson`. Each event is exactly one JSON
  object followed by `\n`.
- Client code expects events such as `queued`, `dequeued`, `queue_updated`,
  `queue_cancelled`, `started`, `agent`, `multi`, `finished`, and `error`.
- `GET /api/status` is the main state source for the browser. If you add fields,
  keep existing fields compatible.
- Model selection stores full `ModelSelection` objects and compares them with
  sorted params. Do not collapse model IDs if params are meaningful.
- Queue updates identify runs by `runId`, limited to ASCII letters, digits,
  `_`, and `-`.

## Run And Queue Rules

- Only one run is active per session.
- Additional runs for the same session are queued.
- Guide-mode queued runs are inserted before normal queued runs.
- Runs from other projects block new submissions until finished; the UI permits
  same-project session switching during active work.
- Do not mutate session state without calling `persistState` or ensuring the
  caller does.
- Before a run, capture `changeBaselineTree` when Git is available.
- After a run or failure cleanup, attempt to record `changeResultTree`.

## Worktree And Undo Rules

- Worktree mode is Git-only and uses `git worktree add --detach` under
  `.session/worktrees`.
- Migrations between Local and Worktree carry changes by binary Git patch when
  requested.
- Always keep the `git apply --check` safety check before applying migration or
  restore patches.
- Do not remove managed worktrees outside the managed root.
- Orphan managed worktree cleanup must keep active session worktrees and should
  remove linked Git worktrees through the source repository when possible.
- Keep `.worktreeinclude` support for ignored local files.
- Undo depends on `changeBaselineTree`; avoid resetting it except at the start
  of a new run.
- Review-panel Git actions operate on the active session workspace, not
  necessarily the opened project root.
- Agent runs may also expose other already-opened projects as additional
  workspace roots for custom workspace tools. Do not treat those additional
  roots as the active session workspace for review/undo baselines.
- File-level revert must restore both worktree and index state for the selected
  path and must not run while the session is active.
- Push actions must require an explicit UI confirmation and should preserve Git
  stderr in user-facing errors.
- PR creation must require explicit UI confirmation, create draft PRs by
  default, and preserve `gh` stderr in user-facing errors.
- Hunk-level actions are limited to current unstaged text diffs and must keep a
  `git apply --check` preflight before changing the index or worktree.

## Terminal Rules

- Terminal commands run in the active session workspace, not necessarily the
  opened project root.
- Agent `workspace_shell` tool calls may run in any configured workspace root;
  terminal-panel commands remain scoped to the active session workspace.
- Terminal commands are subject to the current app permission mode and must write
  permission decisions to `.coding-agent/audit.log`.
- Terminal process lifecycle and output buffering live in `src/terminal-manager.ts`;
  keep `src/ui.ts` route handling thin.
- Keep terminal output bounded in memory and expose it through line cursors so
  browser polling does not resend the full buffer indefinitely.
- Recent terminal output can be appended to the next agent prompt, but do not
  persist it into the session transcript unless the user explicitly sends it.
- Stop running terminal child processes when a session is deleted or the server
  shuts down.

## Persistence Rules

- Current per-project persistence is SQLite in `.coding-agent/sessions.sqlite`.
- Legacy `.session/sessions.json` migration is still supported.
- For new persisted fields:
  - Add tolerant normalizers for missing or malformed data.
  - Add SQLite schema migration through `ensureProjectStateSchema`.
  - Keep JSON snapshots serializable.
  - Do not break old sessions that lack the new field.

## Context Memory Rules

- `SessionMemoryManager` owns transcript entries, recent entries, summaries,
  compaction records, and prompt snapshots.
- Structured compaction summaries must match `SESSION_MEMORY_JSON_SCHEMA`.
- If LLM compaction fails, deterministic fallback summary behavior should remain.
- Context usage uses roughly four characters per token and can be bounded by
  inferred model context windows.

## Multi-Agent Rules

- Planner output is capped at six tasks. Keep task prompts self-contained.
- Classify subtasks as read-only or write-capable before execution.
- Read-only subagents must run with read-only permissions even when the parent
  session mode is broader.
- Write-capable subtasks in the same dependency rank should run serially to
  reduce silent overwrite and merge risk.
- Per-task cancellation should cancel only the targeted subagent run and preserve
  completed task results for session memory.
- Per-task tool usage should stay bounded and summarized; do not persist full
  tool payloads in multi-agent state.
- `multiAgent.agents` profiles from extension config may override subagent
  instructions, model, and permission mode; malformed profile entries should be
  ignored rather than blocking the run.

## Automation Rules

- Automations are project-local and persisted in `.coding-agent/automations.json`.
- Automations must bind to an existing session and continue that session context.
- Automations use interval scheduling by default and may optionally use a
  validated five-part cron expression. Keep legacy interval-only data working.
- Automations require an explicit `read_only` or `auto` permission mode. Do not
  allow unattended `full_access` automations.
- When the current app permission mode does not match the automation's required
  mode, record a failure instead of running with broader permissions.
- Git projects should run unattended automation in managed Worktree mode when
  possible; non-Git projects may fall back to Local mode.
- Failures use exponential backoff through `src/automation-schedule.ts`.
- Three consecutive failures pause an automation.
- Clear automation timers when a project is removed or the server shuts down.

## Extension Runtime Rules

- `loadExtensionRuntime` reads from the active session workspace.
- Project instructions prefer `AGENTS.override.md` over `AGENTS.md` per
  directory.
- Skills are listed by frontmatter name/description; full bodies load only for
  explicit `$skill-name` references or conservative implicit matches against the
  prompt.
- Disabled Skills, Plugins, and MCP servers from `.coding-agent/extensions.json`
  must stay visible in inventory APIs but must not enter runtime instructions or
  MCP config.
- Disabled hooks from `.coding-agent/extensions.json` must stay visible in
  inventory APIs but must not enter lifecycle execution.
- Plugin discovery supports both `plugin.json` and
  `.codex-plugin/plugin.json`; keep both formats working.
- Plugin inventory may display optional manifest `version` and `dependencies`;
  treat invalid or missing metadata as empty display data.
- `mcpPolicies` supports server deny and tool-level allow / prompt / deny. Keep
  policies visible in inventory and runtime instructions, but do not mutate the
  SDK MCP server config shape.
- Hook commands receive JSON on stdin and run in the active workspace.
- Hook commands are subject to the current app permission mode.
- On Windows, hooks use `cmd.exe`; keep `windowsCommand` support.
- MCP server configs are passed through to Cursor SDK. Validate structure enough
  to avoid crashes, but do not reinterpret valid SDK config. The SDK does not
  currently expose MCP tool-call approval callbacks, so prompt policies are
  instructional until a hard interception point exists.

## Frontend Rules

- Keep DOM IDs in `body.ts` synchronized with lookups in `client-script.ts`.
- Keep CSS class names synchronized across `body.ts`, `styles.ts`, and
  `client-script.ts`.
- The client stores browser-only preferences in `localStorage`, including review
  panel layout.
- When changing streaming UI behavior, check both single-agent and multi-agent
  rendering paths.
- Attachment limits are duplicated client-side and server-side. Server-side
  validation is authoritative.
- The browser preview iframe uses sandbox attributes; keep that boundary unless
  the security implications are explicitly reviewed.
- Browser inspection must remain conservative by default: allow localhost and
  workspace-local `file:` URLs, require `browser.allow` for public URLs, and keep
  `browser.deny` as the strongest rule. URL policy, DOM summaries, and static
  resource checks live in `src/browser-inspection.ts`.
- Browser screenshots are best-effort through a local Chrome/Chromium executable
  and should degrade to DOM/resource inspection with a clear warning when no
  browser binary is available.
- Browser resource checks should stay conservative: request same-origin or
  loopback HTTP(S) resources, inspect workspace-local `file:` resources, and
  avoid fetching arbitrary third-party assets unless browser policy allows it.
- Playwright MCP enablement writes local config under `.coding-agent/`; do not
  silently modify user-global MCP configuration.

## Common Change Map

- Change shell permissions or approval behavior:
  update `src/permissions.ts`, `src/sdk-tool-boundary.ts`,
  `src/approval-queue.ts`, `src/workspace-tools.ts`,
  `src/terminal-manager.ts`, and `src/extensions.ts` together when needed, then
  run permission and workspace tool tests.

- Add or change a server route:
  update `src/ui.ts`, then update `src/web/codex-app/client-script.ts` callers
  and this documentation if the contract changes.

- Add persisted session data:
  update types in `src/ui.ts`, SQLite schema/migrations, normalizers, write/read
  paths, and status serialization if the browser needs it.
  Session pin/archive flags are soft UI state; they must not delete attachments,
  worktrees, or agent snapshots.

- Change agent prompt behavior:
  update `src/agent.ts`, then verify context compaction and extension
  instructions still compose in the intended order.

- Change project/user memory behavior:
  update `src/project-memory.ts`, `/api/memory` routes, slash commands, and the
  Review panel Memory tab together. Keep `.coding-agent/memory.json` compatible;
  missing settings default to enabled for both project and user memory.
- Change session memory diagnostics:
  update `src/session-memory.ts`, `/api/session-memory`, and the Memory tab
  session-memory panel together.

- Change local workspace tools:
  update `src/workspace-tools.ts`, then verify single-agent and multi-agent runs
  can still read, list, search, and shell in the active workspace. Remember that
  `workspace_*` custom tools are withheld while SDK sandbox/Auto-review MCP
  approval mode is active; sandboxed runs should use SDK built-in tools instead.

- Change Git diff, Undo, or workspace patch behavior:
  update `src/git-workspace.ts`, then smoke test the review panel, migration
  patching, file-level stage/unstage/revert, hunk-level stage/revert, commit
  message generation, commit, push, PR preflight behavior, and Undo on a
  disposable Git repository.

- Change terminal behavior:
  update `src/ui.ts`, `body.ts`, `styles.ts`, and `client-script.ts` together,
  then smoke test command start, output polling, stop, permission rejection, and
  cleanup on server shutdown.

- Change Browser inspection behavior:
  update `src/browser-inspection.ts`, `src/ui.ts`, `body.ts`, `styles.ts`,
  `client-script.ts`,
  `coding-agent.extensions.example.json`, README, and Browser policy tests.

- Change Web Search behavior:
  keep live search disabled by default, enforce permission-mode checks, and
  return source summaries as untrusted content with URLs.

- Change session memory shape:
  update `src/session-memory.ts`, compaction schema, normalizers, and persisted
  snapshot compatibility.

- Change extension behavior:
  update `src/extensions.ts`, `src/ui.ts`, extension UI files,
  `coding-agent.extensions.example.json`, tests, and README user-facing docs
  when configuration changes.

- Change the visual UI:
  update `body.ts`, `styles.ts`, and `client-script.ts` together. Run the dev
  server and manually inspect the affected workflow.

## Verification Checklist

- `npm run typecheck`
- `npm test`
- `npm run build` when appropriate
- Manual `npm run dev:once` or `npm run dev` smoke test for UI/server changes
- For Git/worktree changes: smoke test file-level stage/unstage/revert, commit,
  hunk-level stage/revert, commit message generation, push, PR preflight
  behavior, Local to Worktree migration, Worktree to Local migration, and Undo
  on a disposable Git repository
- For terminal changes: smoke test short commands, long-running commands, stop,
  permission rejection, and recent-output prompt context
- For Browser changes: smoke test localhost/file inspection, blocked public URL,
  Playwright MCP config write, screenshot fallback when no browser binary exists,
  and visual feedback prompt text including viewport/screenshot path
- For automation changes: smoke test create, pause/enable, delete, immediate run
  request, permission-mode mismatch failure, and timer cleanup
- For persistence changes: open an existing project state, create a new session,
  restart the server, and confirm the session restores
