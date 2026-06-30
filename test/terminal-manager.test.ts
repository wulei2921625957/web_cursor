import assert from "node:assert/strict"
import { once } from "node:events"
import { mkdtempSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { setTimeout as delay } from "node:timers/promises"

import { createSandboxOptionsForPermissionMode } from "../src/permissions.ts"
import { TerminalManager } from "../src/terminal-manager.ts"

test("terminal manager runs low-risk commands and captures output", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "terminal-manager-"))
  const manager = new TerminalManager(() => "terminal-1")

  try {
    const run = manager.start({
      command: "pwd",
      cwd,
      permissions: createSandboxOptionsForPermissionMode("auto"),
      sessionId: "session-1",
    })
    if (run.child) {
      await once(run.child, "close")
    }

    assert.equal(run.status, "exited")
    assert.equal(manager.publicRun(run).lineCount > 0, true)
    assert.match(
      run.lines.map((line) => line.text).join("\n"),
      new RegExp(escapeRegExp(cwd))
    )
    assert.match(manager.buildPromptContext("session-1"), /Recent terminal output/)
  } finally {
    manager.stopAll()
    rmSync(cwd, { force: true, recursive: true })
  }
})

test("terminal manager respects read-only permissions", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "terminal-manager-"))
  const manager = new TerminalManager(() => "terminal-1")

  try {
    assert.throws(
      () =>
        manager.start({
          command: "pwd",
          cwd,
          permissions: createSandboxOptionsForPermissionMode("read_only"),
          sessionId: "session-1",
        }),
      /read-only mode blocks shell commands/
    )
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
})

test("terminal manager can send stdin to a running process", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "terminal-manager-"))
  const manager = new TerminalManager(() => "terminal-1")

  try {
    const run = manager.start({
      command: "cat",
      cwd,
      permissions: createSandboxOptionsForPermissionMode("auto"),
      sessionId: "session-1",
    })

    manager.writeInput(run.id, "hello from stdin\n")
    await waitForLine(run, "stdout", "hello from stdin")

    assert.equal(
      run.lines.some((line) => line.stream === "stdin" && line.text === "hello from stdin"),
      true
    )
    assert.equal(
      run.lines.some((line) => line.stream === "stdout" && line.text === "hello from stdin"),
      true
    )
    assert.doesNotMatch(manager.buildPromptContext("session-1"), /\[stdin\]/)

    manager.stopRun(run.id)
    if (run.child) {
      await once(run.child, "close")
    }
  } finally {
    manager.stopAll()
    rmSync(cwd, { force: true, recursive: true })
  }
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function waitForLine(
  run: { lines: Array<{ stream: string; text: string }> },
  stream: string,
  text: string
) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < 3000) {
    if (run.lines.some((line) => line.stream === stream && line.text.includes(text))) {
      return
    }
    await delay(25)
  }
  assert.fail(`Timed out waiting for ${stream} line containing ${text}`)
}
