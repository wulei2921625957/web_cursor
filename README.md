# Coding Agent Web UI

A small local web UI that runs a Cursor SDK agent against local workspaces.

## Getting Started

Use Node.js 20 or newer.

Install dependencies:

```bash
npm install
```

### Windows notes

Use a normal Windows desktop shell such as PowerShell or Windows Terminal.
Node.js 20 or newer is required. `better-sqlite3` uses a native module; if its
prebuilt package cannot be downloaded for your Node version, `npm install` may
need Python and Visual Studio Build Tools so `node-gyp` can compile it.

Local chat sessions can run in non-Git directories. The review panel, Undo, and
Worktree mode require Git for Windows to be installed and available on `PATH`.
The built-in workspace search uses `ripgrep` when available and falls back to a
Node.js search implementation when `rg` is not installed.

Start the local web UI:

```bash
npm run dev
```

In development, `npm run dev` watches the TypeScript source. After a code change,
the server restarts automatically and the already-open browser tab reloads when
the server is ready again. Use `npm run dev:once` for a single non-watching dev
run.

If no usable API key is already configured, the web UI shows a login-style
screen first. Enter your Cursor API key there; the app verifies it and loads the
available model list before showing the workspace UI. If you choose to save it,
the key is stored in the app project's `coding-agent.config.json` file and loaded
automatically on the next start. Copy `coding-agent.config.example.json` to
`coding-agent.config.json` when you want to edit the config directly:

```json
{
  "apiKey": "crsr_...",
  "port": 3030
}
```

The saved config key is tried before `CURSOR_API_KEY`; if the saved key is
invalid, the UI returns to the key input screen. `--port` overrides the config
port for one run.

Build and run the compiled UI:

```bash
npm run build
npm start
```

The web UI starts a local server and prints the URL. By default it binds to
`127.0.0.1:3030` and does not open the browser automatically.

```bash
npm run dev -- --open
npm run dev -- --port 3031
npm run dev -- --host 0.0.0.0 --port 3031
```

When binding to a non-loopback host such as `0.0.0.0`, the server requires an
access token and prints a one-time access URL. You can also set
`CURSOR_UI_AUTH_TOKEN` to provide a stable token yourself. State-changing API
requests are rejected when they come from a different browser origin.

### Process lifecycle

When starting the web UI or any other long-running local process during a work
session, stop that process before the session ends. Leaving old server processes
running can keep ports occupied and make later page refreshes talk to stale code.

Open a project from the UI when you are ready to work in it. Passing
`--cwd /path/to/project` only changes the startup directory used by the project
picker and the current-directory shortcut; opening or switching projects in the
UI switches the underlying agent process working directory.

When multiple projects are already open in the sidebar, an agent run can work
across them in one prompt. The active session workspace remains the primary
root, and relative paths resolve there; reference another opened project by its
absolute path when you want the agent to inspect or modify that project too.
Cross-project writes rely on the app-owned `workspace_*` tools, so use Full
Access when you need the agent to modify another opened project.

## Context compaction

The web UI keeps a lightweight transcript for each session. When the estimated
conversation history grows past the configured limit, it asks a fresh Cursor SDK
agent to summarize older turns, starts a new agent, and injects that compressed
memory into future prompts.

Useful settings:

```bash
export CURSOR_AUTO_COMPACT=true
export CURSOR_CONTEXT_MAX_CHARS=120000
export CURSOR_CONTEXT_RETAIN_CHARS=24000
export CURSOR_CONTEXT_SUMMARY_CHARS=16000
```

You can also pass `--no-auto-compact`, `--context-max-chars`,
`--context-retain-chars`, or `--context-summary-chars` on the command line.

## Permissions

The UI supports three local permission modes:

- `read_only`: read/search only. The app blocks its `workspace_shell` tool and
  lifecycle hooks.
- `auto`: Low-risk read and validation commands are allowed; mutation
  and high-risk `workspace_shell` commands create an approval request in the UI.
- `full_access`: default. App-level shell tools and hooks are allowed, with
  decisions recorded in `.coding-agent/audit.log`.

Set the startup mode with:

```bash
npm run dev -- --permissions read-only
npm run dev -- --permissions auto
npm run dev -- --permissions full-access
```

You can also use `CURSOR_PERMISSION_MODE=read_only|auto|full_access`. The older
`--sandbox enabled`, `--sandbox disabled`, and `--no-sandbox` flags still work
as compatibility aliases. Cursor SDK built-in tools are constrained by Cursor's
own sandbox and SDK Auto-review when available; this app's permission classifier
is enforced for workspace custom tools, terminal commands, and configured hooks.
Because SDK custom tools are exposed as MCP tools and local SDK runs cannot
grant interactive MCP approval, workspace custom tools are only exposed when the
SDK sandbox/Auto-review approval path is not active. In sandboxed modes, the
agent uses SDK built-in local tools for file/search/shell operations.

The active workspace can add project-local shell prefix rules in
`.coding-agent/permissions.json`. User-level rules can be placed in
`~/.coding-agent/permissions.json` and are checked first.

```json
{
  "shellRules": [
    { "action": "allow", "prefix": "npm run verify" },
    { "action": "prompt", "prefix": "npm install" },
    { "action": "deny", "prefix": "rm -rf" }
  ]
}
```

The compact form is also supported:

```json
{
  "shell": {
    "allow": ["npm run typecheck"],
    "prompt": ["npm install"],
    "deny": ["git reset --hard"]
  }
}
```

## Testing

Run the baseline checks after TypeScript changes:

```bash
npm run typecheck
npm test
```

## Worktrees and Undo

Sessions can run in either Local mode or Worktree mode. Local mode works in the
opened project directory. Worktree mode creates a managed Git worktree under
`.session/worktrees` so agent changes stay isolated from your current checkout.
Stale managed worktrees that no active session references are cleaned on app
startup, project removal, and shutdown.

Use the Worktree button to start an isolated session. From an existing session,
use the workspace action in the header to migrate between Local and Worktree.
Migration copies the current diff with a Git binary patch and fails instead of
overwriting conflicting files. Use the Undo action to restore the active
session workspace to the Git tree captured at the start of the last run.

The review panel can also stage, unstage, and revert individual files or hunks
from the latest session diff. File-level revert restores that file to the
session's captured baseline tree and refuses to run while the session is active.
Hunk actions operate on the current unstaged text diff. Enter a commit message
in the review panel to commit currently staged changes, or use the generated
suggestion. When the current branch has commits ahead of its upstream, the
review panel can push the branch after confirmation. After the branch is pushed
and clean, the PR action creates a draft GitHub pull request through the `gh`
CLI. Use the Feedback action on a changed file to append file-specific review
notes to the next prompt for the agent.

Review and Undo are scoped to the active session workspace. If a run also
modifies another opened project through an absolute path, switch to that project
to review, stage, or commit its changes.

If a worktree needs ignored local files, add a `.worktreeinclude` file at the
project root. Exact paths and Git ignore-style patterns are expanded before the
managed worktree starts. Existing files in the target worktree are not
overwritten.

```text
.env
.env.local
config/secrets.json
```

## Extension Runtime

At run time, the app loads project instructions and extensions from the active
session workspace:

- `AGENTS.override.md` or `AGENTS.md`, from the Git root down to the current
  workspace directory.
- Skills from `.agents/skills/*/SKILL.md` along that path and
  `~/.agents/skills`. Explicit `$skill-name` references load the full skill.
- Plugin manifests from `.coding-agent/plugins/*/plugin.json` and paths listed
  in `coding-agent.extensions.json`.
- MCP servers and lifecycle hooks from `coding-agent.extensions.json` or
  `.coding-agent/extensions.json`.

Copy `coding-agent.extensions.example.json` to `coding-agent.extensions.json`
to configure MCP servers, plugin paths, hooks, and optional `mcpPolicies`. MCP
servers are passed to the Cursor SDK as real MCP configuration, so tools from
servers such as Playwright or Chrome DevTools can be used by the agent.
`mcpPolicies` supports server deny and tool-level allow / prompt / deny
metadata. Tool prompt policies are included in agent runtime instructions; they
are not a hard SDK interception point.

The review panel's Extensions tab lists discovered Skills, Plugins, MCP servers,
and Hooks for the active session workspace. Skills, Plugins, and MCP servers can
be enabled or disabled locally; the app writes those toggles to
`.coding-agent/extensions.json`, and disabled items are excluded from future
agent runs. Plugin discovery supports both `plugin.json` and
`.codex-plugin/plugin.json` manifests. Hooks can also be disabled per entry;
the app stores their generated IDs in `disabledHooks`. MCP rows show any
configured tool policy summary, and plugin rows show manifest version, MCP count,
and dependency summary when present.

Supported hook events are `UserPromptSubmit`, `PreRun`, and `PostRun`. Hooks
receive a JSON payload on stdin and run in the active session workspace. On
Windows, hooks run through `cmd.exe`; provide `windowsCommand` when a hook's
normal `command` uses POSIX shell syntax.

The optional `multiAgent.agents` config defines subagent profiles. Profiles can
set `name`, `description`, `instructions`, `model`, and `permissionMode`.
Read-only subtasks are forced into read-only permissions by default, while
write-capable subtasks are serialized within each dependency rank to reduce
silent overwrite risk. Running subagents can be cancelled from their task card,
and task details include prompt, output, errors, tool usage, and token usage.

## Automations

The review panel includes an Automations tab for the active project. Create a
thread automation from the current session by setting a title, interval, optional
five-part cron expression, explicit permission mode (`auto` or `read_only`), and
prompt. Automations are persisted in the opened workspace at
`.coding-agent/automations.json`, run only while the UI server is running, and
continue the bound session context. Git projects prefer Worktree mode for
unattended automation runs; non-Git projects use Local mode. Three consecutive
failures pause the automation; earlier failures use exponential backoff before
retrying. The editor previews the next run time, and each automation row can
expand recent run history.

## Browser Review

The review panel includes a Browser tab for visual feedback. Open a local or
public URL, enable annotation mode, click the preview to create coordinate
markers, and send comments into the current prompt. For automated browser
checks, use the Inspect action. The built-in inspector allows localhost and
workspace-local `file:` pages by default, extracts a DOM summary, checks local
page resources with status, timing, size, content-type, and error details, and
saves a screenshot when Chrome or Chromium is available. Inspection results are
included in the next agent prompt. Public sites are blocked unless added to
`browser.allow` in `coding-agent.extensions.json` or
`.coding-agent/extensions.json`.

Use Enable MCP to write a local Playwright MCP config into
`.coding-agent/extensions.json`. The next agent run can then use Playwright MCP
for controlled browser actions, screenshots, and interactive page testing.

## Terminal

The review panel includes a Terminal tab for the active session workspace. Run a
short validation command or a long-running local process, stream stdout/stderr in
the UI, switch between recent terminal runs, and stop the selected running
command when needed. The selected terminal output can be copied or searched from
the toolbar. Terminal commands use the same app permission mode and audit log as
workspace shell tools. Recent terminal output is appended to the next agent
prompt so the agent can diagnose errors the user ran manually.

## Slash commands

Type `/help` in the composer to see local UI commands. Current commands include
`/status`, `/review`, `/terminal [command]`, `/browser [url]`,
`/artifacts [path]`, `/extensions`, `/automations`, `/history [query]`,
`/memory`, and
`/permission read_only|auto|full_access`. Sent prompts are kept in browser-local
history; use `/history` to search recent prompts or press Up/Down in the
composer to recall them.

The sidebar can search sessions by title or workspace. Use the session row
actions to pin important sessions or archive old ones; archived sessions are
hidden until the archive toggle is enabled.

The Artifacts tab previews files inside the active session workspace. PDF and
image files render inline, CSV/TSV files render as a bounded table preview, and
text files render with a size-limited preview.

External IDE integrations can send transient context for the active session with
`POST /api/ide-context`: active/open files, selection text, and diagnostics are
validated against the session workspace and appended to the next agent prompt as
low-priority workspace context.

## Web Search

The optional `web_search` workspace tool is disabled by default. Enable live
source search for a workspace by creating `.coding-agent/web-search.json`:

```json
{ "mode": "live" }
```

Live search is a workspace custom tool, so it is available only when workspace
custom tools are exposed; it is also blocked in `read_only` permission mode.
Results are returned as untrusted source summaries with URLs; the agent should
cite sources when using them.

Project memory is stored in the active workspace at
`.coding-agent/project-memory.md` and is appended to future agent runs for that
workspace. Use `/memory` to view it, `/memory set <content>` to replace it, and
`/memory clear` to delete it. User memory is stored under
`~/.coding-agent/user-memory.md` and is appended across workspaces; manage it
with `/memory user`, `/memory user set <content>`, and `/memory user clear`.
Use `/memory search <query>` to search both memory scopes. The review panel's
Memory tab provides the same project/user memory editing, clearing, and search
workflow, plus Facts/Preferences/Todos structured fields that generate stable
Markdown memory. Per-scope prompt injection toggles are stored in the active
workspace at `.coding-agent/memory.json`. `/memory panel` opens the Memory tab
directly. The Memory tab also includes a read-only session memory section with
summary quality, compaction history, prompt snapshots, and summary preview.

## Installed command

After installing the package globally or linking it locally, run:

```bash
code-agent-ui
```

Useful options:

```bash
code-agent-ui --open
code-agent-ui --cwd /path/to/project
code-agent-ui --port 3031
```
