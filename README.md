# Coding Agent CLI

A small example CLI that runs a Cursor SDK agent against a local workspace.

## Getting Started

Use Bun 1.3 or newer. This CLI is Bun-only because OpenTUI's native renderer
is exposed through `bun:ffi`.

Install dependencies:

```bash
pnpm install
```

Start the local web UI:

```bash
bun run dev:ui
```

If no usable API key is already configured, the web UI shows a login-style
screen first. Enter your Cursor API key there; the app verifies it and loads the
available model list before showing the workspace UI.

Ask for a one-shot task in the current directory:

```bash
export CURSOR_API_KEY="crsr_..."
bun run dev -- "Explain how this project is structured"
```

Start the TUI by omitting the prompt:

```bash
bun run dev
```

The web UI starts a local server and prints the URL without selecting a
workspace or opening the browser automatically. Pass `--open` if you want the
browser to open after startup. Open a project from the UI when you are ready to
work in it. Passing `--cwd /path/to/project` only changes the startup directory
used by the project picker and the current-directory shortcut; opening or
switching projects in the UI switches the underlying agent process working
directory.

## Context compaction

The CLI keeps a lightweight transcript of each TUI session. When the estimated
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
command line. The web UI disables Cursor's local shell sandbox by default to
avoid sandbox/PTY tool hangs; pass `--sandbox enabled` to opt back in.

## Packaging

Build and create a tarball:

```bash
npm run build
npm pack
```

Install the tarball on another machine:

```bash
npm install -g ./coding-agent-cli-0.1.0.tgz
export CURSOR_API_KEY="crsr_..."
code-agent --cwd /path/to/project "Explain this project"
```

The installed CLI still requires Bun 1.3 or newer because the executable uses a
`#!/usr/bin/env bun` entrypoint.

To create a portable archive that includes Bun and `node_modules`:

```bash
npm run package:portable
```

This creates `release/coding-agent-cli-<version>-<platform>.tar.gz`. The archive
can be copied to another machine with the same OS/CPU architecture and run
without installing Bun or npm dependencies:

```bash
tar -xzf coding-agent-cli-0.1.0-darwin-arm64.tar.gz
export CURSOR_API_KEY="crsr_..."
./coding-agent-cli-0.1.0-darwin-arm64/bin/code-agent --cwd /path/to/project "Explain this project"
```

Build one portable archive per target platform. A macOS arm64 archive will not
run on Linux, Windows, or Intel macOS.

To build a Windows x64 portable archive from macOS or Linux:

```bash
npm run package:portable -- --target win32-x64
```

This creates `release/coding-agent-cli-0.1.0-win32-x64.zip`. On Windows:

```powershell
Expand-Archive .\coding-agent-cli-0.1.0-win32-x64.zip
.\coding-agent-cli-0.1.0-win32-x64\install.cmd
```

Open a new PowerShell window after installation:

```powershell
cd C:\path\to\project
code-agent "Explain this project"
```

Or open the browser UI:

```powershell
cd C:\path\to\project
code-agent-ui
```

If the API key was entered incorrectly, start the TUI and set it again:

```powershell
code-agent
```

Then type:

```text
/set_apiKey --save
```

Paste the key on the next input line and press Enter.

Without installing, run the root launcher directly:

```powershell
$env:CURSOR_API_KEY = "crsr_..."
cd C:\path\to\project
C:\path\to\coding-agent-cli-0.1.0-win32-x64\code-agent.cmd "Explain this project"
C:\path\to\coding-agent-cli-0.1.0-win32-x64\code-agent-ui.cmd
```

## Notes

Inside the TUI, type `/` to open the command menu. You can choose a model, update the API key, switch to local mode, or exit from there.
