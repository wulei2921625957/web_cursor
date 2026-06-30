import assert from "node:assert/strict"
import test from "node:test"

import { createSandboxOptionsForPermissionMode } from "../src/permissions.ts"
import {
  sdkToolBoundaryRuntimeInstruction,
  sdkToolBoundarySummary,
} from "../src/sdk-tool-boundary.ts"

test("sdk tool boundary reports auto-review and project-enforced paths", () => {
  const summary = sdkToolBoundarySummary(createSandboxOptionsForPermissionMode("auto"))

  assert.equal(summary.permissionMode, "auto")
  assert.equal(summary.builtInToolBoundary.interceptableByProject, false)
  assert.equal(summary.builtInToolBoundary.controls.includes("Cursor SDK autoReview"), true)
  assert.equal(
    summary.enforcedByProject.includes(
      "workspace_* custom tools withheld from SDK MCP approval mode"
    ),
    true
  )
})

test("sdk tool boundary runtime instruction avoids fake interception claims", () => {
  const instruction = sdkToolBoundaryRuntimeInstruction(
    createSandboxOptionsForPermissionMode("read_only")
  )

  assert.match(instruction, /cannot intercept every built-in tool call/)
  assert.match(instruction, /Current permission mode: read_only/)
  assert.match(instruction, /workspace_\* custom tools are not exposed/)
})

test("sdk tool boundary generic instruction has no misleading default mode", () => {
  const instruction = sdkToolBoundaryRuntimeInstruction()

  assert.doesNotMatch(instruction, /Current permission mode:/)
  assert.match(instruction, /SDK tool boundary/)
})

test("sdk tool boundary recommends workspace custom tools when they are exposed", () => {
  const instruction = sdkToolBoundaryRuntimeInstruction(
    createSandboxOptionsForPermissionMode("full_access")
  )

  assert.match(instruction, /Prefer workspace_\*/)
})
