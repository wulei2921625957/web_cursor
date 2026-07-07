import assert from "node:assert/strict"
import test from "node:test"
import {
  SessionMemoryManager,
  contextEntriesToText,
  inputTokensFromMemoryText,
} from "../src/session-memory.ts"

test("extracts input token usage from result memory text", () => {
  assert.equal(
    inputTokensFromMemoryText("status=completed input=115947 output=8 total=115955"),
    115947
  )
  assert.equal(inputTokensFromMemoryText("status=completed output=8"), 0)
})

test("session memory reports latest run input tokens", () => {
  const memory = new SessionMemoryManager({
    retainRecentChars: 24_000,
    summaryMaxChars: 16_000,
  })

  memory.appendEntries([
    { role: "result", text: "status=completed input=120000 output=12" },
    { role: "assistant", text: "done" },
    { role: "result", text: "status=completed input=42 output=2" },
  ])

  assert.equal(memory.lastRunInputTokens(), 42)
})

test("native SDK summaries merge into summary without expanding recent history", () => {
  const memory = new SessionMemoryManager({
    retainRecentChars: 24_000,
    summaryMaxChars: 16_000,
  })

  assert.equal(memory.addNativeSdkSummary("Important retained fact."), true)
  assert.equal(memory.addNativeSdkSummary("Important retained fact."), false)

  const snapshot = memory.snapshot()
  assert.match(snapshot.summaryText, /Cursor SDK native summary/)
  assert.match(snapshot.summaryText, /Important retained fact\./)
  assert.equal(snapshot.recentEntries.length, 0)
  assert.equal(snapshot.transcriptEntries.length, 0)
})

test("session memory transcript diagnostics are bounded", () => {
  const memory = new SessionMemoryManager({
    retainRecentChars: 24_000,
    summaryMaxChars: 16_000,
  })

  for (let index = 0; index < 500; index += 1) {
    memory.appendEntries([
      { role: "assistant", text: `entry ${index} ${"x".repeat(1000)}` },
    ])
  }

  const snapshot = memory.snapshot()
  assert.ok(snapshot.transcriptEntries.length < 500)
  assert.ok(contextEntriesToText(snapshot.transcriptEntries).length <= 130_000)
})
