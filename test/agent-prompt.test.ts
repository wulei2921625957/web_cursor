import assert from "node:assert/strict"
import test from "node:test"
import type { RunResult } from "@cursor/sdk"
import {
  buildPrompt,
  shouldRolloverSdkAgentContext,
  summarizeRunResultError,
} from "../src/agent.ts"
import { createSandboxOptionsForPermissionMode } from "../src/permissions.ts"

test("agent prompt treats analysis tasks as read-only", () => {
  const prompt = buildPrompt(
    "分析项目",
    { recentEntries: [], recentText: "", summaryText: "" },
    "",
    createSandboxOptionsForPermissionMode("auto"),
    ["/tmp/project"]
  )

  assert.match(prompt, /analysis, overview, explanation, review, diagnostics/)
  assert.match(prompt, /treat it as read-only/)
  assert.match(prompt, /do not modify files, run tests, typecheck, build/)
  assert.match(prompt, /unless the user explicitly asks/)
})

test("auto permission instructions do not make validation automatic", () => {
  const prompt = buildPrompt(
    "分析项目",
    { recentEntries: [], recentText: "", summaryText: "" },
    "",
    createSandboxOptionsForPermissionMode("auto"),
    ["/tmp/project"]
  )

  assert.match(prompt, /Allowed validation commands are not automatic/)
  assert.match(prompt, /do not run tests, typecheck, build/)
})

test("SDK context rollover only triggers for hidden native context bloat", () => {
  assert.equal(
    shouldRolloverSdkAgentContext({
      estimatedContextTokens: 12_000,
      lastRunInputTokens: 115_000,
      localBudgetTokens: 30_000,
    }),
    true
  )

  assert.equal(
    shouldRolloverSdkAgentContext({
      estimatedContextTokens: 90_000,
      lastRunInputTokens: 115_000,
      localBudgetTokens: 30_000,
    }),
    false
  )

  assert.equal(
    shouldRolloverSdkAgentContext({
      estimatedContextTokens: 12_000,
      lastRunInputTokens: 50_000,
      localBudgetTokens: 30_000,
    }),
    false
  )
})

test("SDK error results include a visible fallback detail", () => {
  const message = summarizeRunResultError({
    durationMs: 154_500,
    id: "run-test",
    model: { id: "composer-test" },
    requestId: "request-test",
    status: "error",
  })

  assert.match(message, /Cursor SDK 返回 error 状态/)
  assert.match(message, /没有提供具体错误详情/)
  assert.match(message, /runId=run-test/)
  assert.match(message, /requestId=request-test/)
  assert.match(message, /model=composer-test/)
  assert.match(message, /duration=154\.5s/)
})

test("SDK error results preserve explicit result text", () => {
  const result = {
    id: "run-test",
    result: "模型服务暂时不可用",
    status: "error",
  } satisfies RunResult

  assert.equal(summarizeRunResultError(result), "模型服务暂时不可用")
})
