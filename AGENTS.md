# AI Project Guide

This repository is a TypeScript/Node.js local web UI for running a Cursor SDK
coding agent against user-selected workspaces.

Future AI agents should read these files before making non-trivial changes:

- `docs/AI_PROJECT_CONTEXT.md`: project purpose, feature map, architecture, data
  flow, persistence, API surface, and runtime behavior.
- `docs/DEVELOPMENT_GUIDELINES.md`: coding conventions, behavioral contracts,
  validation expectations, and common change patterns.
- `README.md`: user-facing setup and usage.

## Fast Facts

- Runtime: Node.js 20+, ESM, TypeScript strict mode.
- Main server entry: `src/ui.ts`.
- Cursor SDK wrapper: `src/agent.ts`.
- Workspace custom tools for local agents: `src/workspace-tools.ts`.
- Git diff, tree snapshots, and patch helpers: `src/git-workspace.ts`.
- Session memory and context compaction: `src/session-memory.ts`.
- Extension runtime for `AGENTS.md`, skills, plugins, MCP, and hooks:
  `src/extensions.ts`.
- Multi-agent execution: `src/multi-agent.ts`.
- Browser UI strings/styles/client code:
  `src/web/codex-app/{body,styles,client-script,render}.ts`.
- Build output is `dist/`; do not edit generated output.

## Commands

```bash
npm install
npm run dev
npm run dev:once
npm run typecheck
npm run build
npm start
```

Run `npm run typecheck` after TypeScript changes. Run `npm run build` when the
change touches emitted package behavior or before release-related work.

## Important Boundaries

- Do not commit `coding-agent.config.json`, `.session/`, `.coding-agent/`,
  `node_modules/`, or `dist/`. They are ignored local state, secrets, or build
  output.
- Preserve persisted session compatibility. Project session state is stored in
  `.coding-agent/sessions.sqlite` inside opened workspaces, with legacy JSON
  migration support from `.session/sessions.json`.
- Preserve the NDJSON streaming contract of `POST /api/run`: each event is one
  JSON object followed by a newline.
- Preserve worktree and undo safety. The app snapshots Git trees, applies binary
  patches with `git apply --check`, and manages worktrees under
  `.session/worktrees`.
- UI text is currently Chinese. Keep user-facing error/status text consistent
  unless the product direction changes.
