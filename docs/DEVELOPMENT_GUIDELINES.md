# Development Guidelines For AI Agents

Last reviewed against source on 2026-06-30.

## Default Workflow

1. Read `AGENTS.md`, this file, and `docs/AI_PROJECT_CONTEXT.md`.
2. Inspect the relevant source before editing.
3. Keep changes scoped to the requested behavior.
4. Run `npm run typecheck` after TypeScript changes.
5. Run `npm run build` when packaging, emitted behavior, or import structure is
   affected.

There is no dedicated test suite in this repository at the time of writing.
Type checking and build are the baseline verification steps.

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
- Keep `.worktreeinclude` support for ignored local files.
- Undo depends on `changeBaselineTree`; avoid resetting it except at the start
  of a new run.

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

## Extension Runtime Rules

- `loadExtensionRuntime` reads from the active session workspace.
- Project instructions prefer `AGENTS.override.md` over `AGENTS.md` per
  directory.
- Skills are listed by frontmatter name/description; full bodies load only for
  explicit `$skill-name` references.
- Hook commands receive JSON on stdin and run in the active workspace.
- On Windows, hooks use `cmd.exe`; keep `windowsCommand` support.
- MCP server configs are passed through to Cursor SDK. Validate structure enough
  to avoid crashes, but do not reinterpret valid SDK config.

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

## Common Change Map

- Add or change a server route:
  update `src/ui.ts`, then update `src/web/codex-app/client-script.ts` callers
  and this documentation if the contract changes.

- Add persisted session data:
  update types in `src/ui.ts`, SQLite schema/migrations, normalizers, write/read
  paths, and status serialization if the browser needs it.

- Change agent prompt behavior:
  update `src/agent.ts`, then verify context compaction and extension
  instructions still compose in the intended order.

- Change local workspace tools:
  update `src/workspace-tools.ts`, then verify single-agent and multi-agent runs
  can still read, list, search, and shell in the active workspace.

- Change Git diff, Undo, or workspace patch behavior:
  update `src/git-workspace.ts`, then smoke test the review panel, migration
  patching, and Undo on a disposable Git repository.

- Change session memory shape:
  update `src/session-memory.ts`, compaction schema, normalizers, and persisted
  snapshot compatibility.

- Change extension behavior:
  update `src/extensions.ts`, `coding-agent.extensions.example.json`, and README
  user-facing docs when configuration changes.

- Change the visual UI:
  update `body.ts`, `styles.ts`, and `client-script.ts` together. Run the dev
  server and manually inspect the affected workflow.

## Verification Checklist

- `npm run typecheck`
- `npm run build` when appropriate
- Manual `npm run dev:once` or `npm run dev` smoke test for UI/server changes
- For Git/worktree changes: smoke test Local to Worktree migration, Worktree to
  Local migration, and Undo on a disposable Git repository
- For persistence changes: open an existing project state, create a new session,
  restart the server, and confirm the session restores
