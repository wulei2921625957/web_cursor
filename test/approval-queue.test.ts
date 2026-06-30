import assert from "node:assert/strict"
import test from "node:test"

import { ShellApprovalQueue } from "../src/approval-queue.ts"
import {
  createSandboxOptionsForPermissionMode,
  evaluateShellPermission,
  type ShellApprovalRequest,
} from "../src/permissions.ts"

test("approval queue resolves pending requests and remembers session approvals", async () => {
  let nextId = 1
  const queue = new ShellApprovalQueue(() => `approval-${nextId++}`)
  const handler = queue.createHandler("project-1", "session-1")
  const request = createApprovalRequest("npm install left-pad")

  const pending = handler(request)
  assert.equal(queue.publicPendingApprovals().length, 1)

  queue.resolve("approval-1", "approve_session")
  const approved = await pending
  assert.equal(approved.approved, true)
  assert.equal(approved.scope, "session")

  const repeated = await handler(request)
  assert.equal(repeated.approved, true)
  assert.equal(repeated.scope, "session")
  assert.equal(queue.publicPendingApprovals().length, 0)
})

test("approval queue denies all pending requests for a session", async () => {
  let nextId = 1
  const queue = new ShellApprovalQueue(() => `approval-${nextId++}`)
  const handler = queue.createHandler("project-1", "session-1")

  const first = handler(createApprovalRequest("npm install left-pad"))
  const second = handler(createApprovalRequest("node -e \"console.log(1)\""))
  assert.equal(queue.publicPendingApprovals().length, 2)

  queue.denySession("session-1", "session ended")

  assert.equal((await first).approved, false)
  assert.equal((await second).message, "session ended")
  assert.equal(queue.publicPendingApprovals().length, 0)
})

function createApprovalRequest(command: string): ShellApprovalRequest {
  const permission = evaluateShellPermission({
    command,
    cwd: "/tmp/project",
    permissions: createSandboxOptionsForPermissionMode("auto"),
    source: "workspace_shell",
    workspaceRoot: "/tmp/project",
  })
  assert.equal(permission.decision, "approval_required")
  return {
    command,
    cwd: "/tmp/project",
    permission,
    source: "workspace_shell",
    workspaceRoot: "/tmp/project",
  }
}
