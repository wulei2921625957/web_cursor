const AUTOMATION_MAX_BACKOFF_MINUTES = 24 * 60
const CRON_SEARCH_LIMIT_MINUTES = 366 * 24 * 60

export function automationFailureBackoffMs(
  intervalMinutes: number,
  failureCount: number
) {
  const baseMinutes = Math.max(1, Math.floor(intervalMinutes) || 1)
  const attempts = Math.max(1, Math.floor(failureCount) || 1)
  const multiplier = 2 ** Math.min(attempts - 1, 8)
  const minutes = Math.min(AUTOMATION_MAX_BACKOFF_MINUTES, baseMinutes * multiplier)
  return minutes * 60_000
}

export function normalizeCronExpression(value: string) {
  const expression = value.trim().replace(/\s+/g, " ")
  if (!expression) {
    return ""
  }

  const fields = expression.split(" ")
  if (fields.length !== 5) {
    throw new Error("cron 表达式必须是 5 段：minute hour day month weekday。")
  }

  parseCronField(fields[0], 0, 59, "minute")
  parseCronField(fields[1], 0, 23, "hour")
  parseCronField(fields[2], 1, 31, "day")
  parseCronField(fields[3], 1, 12, "month")
  parseCronField(fields[4], 0, 7, "weekday")
  return expression
}

export function nextAutomationRunAt(
  schedule: { cron?: string; intervalMinutes: number },
  fromMs: number
) {
  const cron = schedule.cron ? normalizeCronExpression(schedule.cron) : ""
  if (!cron) {
    return fromMs + Math.max(1, Math.floor(schedule.intervalMinutes) || 1) * 60_000
  }
  return nextCronRunAt(cron, fromMs)
}

export function nextCronRunAt(expression: string, fromMs: number) {
  const fields = normalizeCronExpression(expression).split(" ")
  const minutes = parseCronField(fields[0], 0, 59, "minute")
  const hours = parseCronField(fields[1], 0, 23, "hour")
  const days = parseCronField(fields[2], 1, 31, "day")
  const months = parseCronField(fields[3], 1, 12, "month")
  const weekdays = parseCronField(fields[4], 0, 7, "weekday")

  const cursor = new Date(fromMs)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  for (let attempt = 0; attempt < CRON_SEARCH_LIMIT_MINUTES; attempt += 1) {
    const weekday = cursor.getDay()
    if (
      minutes.has(cursor.getMinutes()) &&
      hours.has(cursor.getHours()) &&
      days.has(cursor.getDate()) &&
      months.has(cursor.getMonth() + 1) &&
      (weekdays.has(weekday) || (weekday === 0 && weekdays.has(7)))
    ) {
      return cursor.getTime()
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }

  throw new Error("cron 表达式在一年内没有可触发时间。")
}

function parseCronField(
  value: string,
  min: number,
  max: number,
  label: string
) {
  const result = new Set<number>()
  for (const rawPart of value.split(",")) {
    const part = rawPart.trim()
    if (!part) {
      throw new Error(`cron ${label} 字段为空。`)
    }

    const [rangePart, stepPart] = part.split("/")
    const step = stepPart === undefined ? 1 : Number(stepPart)
    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`cron ${label} step 无效。`)
    }

    const [start, end] =
      rangePart === "*"
        ? [min, max]
        : rangePart.includes("-")
          ? rangePart.split("-").map(Number)
          : [Number(rangePart), Number(rangePart)]
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      throw new Error(`cron ${label} 字段超出范围。`)
    }

    for (let item = start; item <= end; item += step) {
      result.add(item)
    }
  }

  if (result.size === 0) {
    throw new Error(`cron ${label} 字段没有可用值。`)
  }
  return result
}
