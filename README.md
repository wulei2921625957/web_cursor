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

### Process lifecycle

When starting the web UI or any other long-running local process during a work
session, stop that process before the session ends. Leaving old server processes
running can keep ports occupied and make later page refreshes talk to stale code.

Open a project from the UI when you are ready to work in it. Passing
`--cwd /path/to/project` only changes the startup directory used by the project
picker and the current-directory shortcut; opening or switching projects in the
UI switches the underlying agent process working directory.

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
`--context-retain-chars`, `--context-summary-chars`, or `--no-sandbox` on the
command line. The web UI disables Cursor's local shell sandbox by default; pass
`--sandbox enabled` to opt back in.

## Worktrees and Undo

Sessions can run in either Local mode or Worktree mode. Local mode works in the
opened project directory. Worktree mode creates a managed Git worktree under
`.session/worktrees` so agent changes stay isolated from your current checkout.

Use the Worktree button to start an isolated session. From an existing session,
use the workspace action in the header to migrate between Local and Worktree.
Migration copies the current diff with a Git binary patch and fails instead of
overwriting conflicting files. Use the Undo action to restore the active
session workspace to the Git tree captured at the start of the last run.

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
to configure MCP servers, plugin paths, and hooks. MCP servers are passed to the
Cursor SDK as real MCP configuration, so tools from servers such as Playwright
or Chrome DevTools can be used by the agent.

Supported hook events are `UserPromptSubmit`, `PreRun`, and `PostRun`. Hooks
receive a JSON payload on stdin and run in the active session workspace. On
Windows, hooks run through `cmd.exe`; provide `windowsCommand` when a hook's
normal `command` uses POSIX shell syntax.

## Browser Review

The review panel includes a Browser tab for visual feedback. Open a local or
public URL, enable annotation mode, click the preview to create coordinate
markers, and send comments into the current prompt. For automated browser
control, screenshots, or DevTools inspection, configure a browser MCP server
such as Playwright in `coding-agent.extensions.json`.

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
