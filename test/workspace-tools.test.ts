import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import type { SDKJsonValue } from "@cursor/sdk"

import {
  createSandboxOptionsForPermissionMode,
  type ShellApprovalRequest,
} from "../src/permissions.ts"
import { createWorkspaceCustomTools } from "../src/workspace-tools.ts"

test("workspace shell executes approval-required commands after approval", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "workspace-tools-"))
  const requests: ShellApprovalRequest[] = []

  try {
    const tools = createWorkspaceCustomTools(
      cwd,
      createSandboxOptionsForPermissionMode("auto"),
      async (request) => {
        requests.push(request)
        return { approved: true, message: "approved", scope: "once" }
      }
    )

    const result = await tools.workspace_shell.execute(
      { command: "node -e \"console.log('approved')\"" },
      {}
    )
    const output = result as Record<string, SDKJsonValue>

    assert.equal(requests.length, 1)
    assert.equal(requests[0].permission.decision, "approval_required")
    assert.equal(output.exitCode, 0)
    assert.match(String(output.stdout), /approved/)
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
})

test("workspace shell rejects approval-required commands when denied", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "workspace-tools-"))

  try {
    const tools = createWorkspaceCustomTools(
      cwd,
      createSandboxOptionsForPermissionMode("auto"),
      async () => ({ approved: false, message: "denied by test", scope: "once" })
    )

    await assert.rejects(
      () =>
        tools.workspace_shell.execute(
          { command: "node -e \"console.log('denied')\"" },
          {}
        ),
      /denied by test/
    )
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
})

test("workspace tools can target additional opened workspace roots", async () => {
  const primary = mkdtempSync(path.join(os.tmpdir(), "workspace-tools-a-"))
  const secondary = mkdtempSync(path.join(os.tmpdir(), "workspace-tools-b-"))
  const outside = mkdtempSync(path.join(os.tmpdir(), "workspace-tools-outside-"))

  try {
    mkdirSync(path.join(secondary, "src"), { recursive: true })
    writeFileSync(path.join(secondary, "src", "index.ts"), "export const answer = 42\n")

    const tools = createWorkspaceCustomTools(
      primary,
      createSandboxOptionsForPermissionMode("full_access"),
      undefined,
      [secondary]
    )

    const roots = (await tools.workspace_roots.execute({}, {})) as Record<
      string,
      SDKJsonValue
    >
    assert.equal(Array.isArray(roots.roots), true)
    assert.equal((roots.roots as SDKJsonValue[]).length, 2)

    const readResult = (await tools.workspace_read_file.execute(
      { path: path.join(secondary, "src", "index.ts") },
      {}
    )) as Record<string, SDKJsonValue>
    assert.match(String(readResult.content), /answer = 42/)
    assert.equal(readResult.path, path.join(secondary, "src", "index.ts"))

    const grepResult = (await tools.workspace_grep.execute(
      { pattern: "answer", path: secondary },
      {}
    )) as Record<string, SDKJsonValue>
    assert.equal(grepResult.count, 1)

    await tools.workspace_shell.execute(
      {
        command: "node -e \"require('node:fs').writeFileSync('changed.txt', 'ok')\"",
        workingDirectory: secondary,
      },
      {}
    )
    assert.equal(readFileSync(path.join(secondary, "changed.txt"), "utf8"), "ok")

    assert.throws(
      () =>
        tools.workspace_read_file.execute(
          { path: path.join(outside, "secret.txt") },
          {}
        ),
      /outside configured workspace roots/
    )
  } finally {
    rmSync(primary, { force: true, recursive: true })
    rmSync(secondary, { force: true, recursive: true })
    rmSync(outside, { force: true, recursive: true })
  }
})
