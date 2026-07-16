import assert from "node:assert/strict"
import test from "node:test"

import type { Run, SDKAgent } from "@cursor/sdk"
import { CodingAgentSession, type AgentEvent } from "../src/agent.ts"

function createSession() {
  return new CodingAgentSession({
    apiKey: "unused-test-key",
    context: { enabled: false },
    cwd: process.cwd(),
    force: false,
    model: { id: "test-model" },
  })
}

test("an already requested cancellation finishes before the SDK run starts", async () => {
  const session = createSession()
  const controller = new AbortController()
  const events: AgentEvent[] = []
  controller.abort()

  await session.sendPrompt({
    onEvent: (event) => events.push(event),
    prompt: "test",
    signal: controller.signal,
  })

  assert.deepEqual(events, [
    {
      message: "Run cancelled.",
      status: "cancelled",
      type: "result",
    },
  ])
})

test("a cancellation requested while SDK send is pending cancels the created run", async () => {
  const session = createSession()
  const controller = new AbortController()
  const events: AgentEvent[] = []
  let cancelCalls = 0
  let resolveRun!: (run: Run) => void
  let notifySendStarted!: () => void
  const sendStarted = new Promise<void>((resolve) => {
    notifySendStarted = resolve
  })
  const pendingRun = new Promise<Run>((resolve) => {
    resolveRun = resolve
  })
  const run = {
    cancel: async () => {
      cancelCalls += 1
    },
    supports: () => true,
  } as unknown as Run
  const agent = {
    agentId: "test-agent",
    send: () => {
      notifySendStarted()
      return pendingRun
    },
  } as unknown as SDKAgent
  const internal = session as unknown as {
    agent: Promise<SDKAgent> | null
    agentKey: string | null
    currentAgentKey: () => string
  }
  internal.agent = Promise.resolve(agent)
  internal.agentKey = internal.currentAgentKey()

  const sendPrompt = session.sendPrompt({
    onEvent: (event) => events.push(event),
    prompt: "test",
    signal: controller.signal,
  })
  await sendStarted

  controller.abort()
  const earlyCancel = await session.cancelCurrentRun()
  assert.equal(earlyCancel.cancelled, false)
  resolveRun(run)
  await sendPrompt

  assert.equal(cancelCalls, 1)
  assert.equal(
    events.filter((event) => event.type === "result" && event.status === "cancelled").length,
    1
  )
})
