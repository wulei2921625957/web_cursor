import assert from "node:assert/strict"
import test from "node:test"

import {
  automationFailureBackoffMs,
  nextAutomationRunAt,
  nextCronRunAt,
  normalizeCronExpression,
} from "../src/automation-schedule.ts"

test("automation failure backoff doubles from the configured interval", () => {
  assert.equal(automationFailureBackoffMs(5, 1), 5 * 60_000)
  assert.equal(automationFailureBackoffMs(5, 2), 10 * 60_000)
  assert.equal(automationFailureBackoffMs(5, 3), 20 * 60_000)
})

test("automation failure backoff is capped at one day", () => {
  assert.equal(automationFailureBackoffMs(60, 20), 24 * 60 * 60_000)
})

test("normalizes and validates five-part cron expressions", () => {
  assert.equal(normalizeCronExpression("  */15   9-17 * * 1,3,5 "), "*/15 9-17 * * 1,3,5")
  assert.throws(() => normalizeCronExpression("* * *"), /5 段/)
  assert.throws(() => normalizeCronExpression("60 * * * *"), /minute/)
})

test("cron schedule returns the next matching local minute", () => {
  const from = new Date(2026, 5, 30, 8, 59, 20).getTime()
  assert.equal(nextCronRunAt("0 9 * * *", from), new Date(2026, 5, 30, 9, 0).getTime())
  assert.equal(
    nextAutomationRunAt({ cron: "*/30 9 * * *", intervalMinutes: 60 }, from),
    new Date(2026, 5, 30, 9, 0).getTime()
  )
})

test("cron weekday accepts 7 as Sunday", () => {
  const from = new Date(2026, 6, 4, 23, 59).getTime()
  assert.equal(nextCronRunAt("0 0 * * 7", from), new Date(2026, 6, 5, 0, 0).getTime())
})
