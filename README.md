# Coding Agent Web UI

A small local web UI that runs a Cursor SDK agent against local workspaces.

## Getting Started

Use Node.js 20 or newer.

Install dependencies:

```bash
npm install
```

Start the local web UI:

```bash
npm run dev
```

If no usable API key is already configured, the web UI shows a login-style
screen first. Enter your Cursor API key there; the app verifies it and loads the
available model list before showing the workspace UI.

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
