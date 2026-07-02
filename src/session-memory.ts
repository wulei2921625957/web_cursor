export type SessionMemoryEntryRole =
  | "assistant"
  | "result"
  | "status"
  | "task"
  | "tool"
  | "user"

export type SessionMemoryEntry = {
  role: SessionMemoryEntryRole
  text: string
}

export type StructuredSessionMemory = {
  schemaVersion: 1
  objective: string
  decisions: string[]
  changedFiles: string[]
  commandsRun: string[]
  testResults: string[]
  openIssues: string[]
  userPreferencesInThisSession: string[]
  nextSteps: string[]
  notes: string[]
}

export type SessionMemoryCompactionRecord = {
  id: string
  createdAt: number
  errorMessage?: string
  inputChars: number
  reason: string
  retainedChars: number
  status: "fallback" | "success"
  summaryChars: number
}

export type SessionMemoryPromptSnapshot = {
  id: string
  createdAt: number
  promptChars: number
  recentChars: number
  recentEntryCount: number
  summaryChars: number
  totalChars: number
}

export type SessionMemorySnapshot = {
  version: 1
  compactions: SessionMemoryCompactionRecord[]
  promptSnapshots: SessionMemoryPromptSnapshot[]
  recentEntries: SessionMemoryEntry[]
  summary: StructuredSessionMemory | null
  summaryText: string
  transcriptEntries: SessionMemoryEntry[]
}

export type SessionMemoryContextOptions = {
  retainRecentChars: number
  summaryMaxChars: number
}

export type SessionMemoryInitialState = {
  contextSummary?: unknown
  history?: unknown
  memory?: unknown
}

export type SessionMemoryPromptContext = {
  recentEntries: SessionMemoryEntry[]
  recentText: string
  summaryText: string
}

export type SessionMemoryCompactionPlan = {
  entriesToCompact: SessionMemoryEntry[]
  originalChars: number
  previousSummaryText: string
  retainedChars: number
  retainedEntries: SessionMemoryEntry[]
}

export type SessionMemoryCompactionOutput = {
  summary: StructuredSessionMemory | null
  summaryText: string
}

const MAX_COMPACTION_RECORDS = 50
const MAX_PROMPT_SNAPSHOTS = 20

export const SESSION_MEMORY_JSON_SCHEMA = [
  "{",
  '  "schemaVersion": 1,',
  '  "objective": "current user goal or empty string",',
  '  "decisions": ["important decisions and constraints"],',
  '  "changedFiles": ["workspace-relative or absolute file paths changed or inspected"],',
  '  "commandsRun": ["commands and important outcomes"],',
  '  "testResults": ["tests/checks run and pass/fail status"],',
  '  "openIssues": ["unresolved blockers, bugs, or risks"],',
  '  "userPreferencesInThisSession": ["preferences stated by the user in this session"],',
  '  "nextSteps": ["concrete next actions"],',
  '  "notes": ["other durable facts needed to continue this session"]',
  "}",
].join("\n")

export class SessionMemoryManager {
  private compactions: SessionMemoryCompactionRecord[]
  private promptSnapshots: SessionMemoryPromptSnapshot[]
  private recentEntries: SessionMemoryEntry[]
  private summary: StructuredSessionMemory | null
  private summaryText: string
  private transcriptEntries: SessionMemoryEntry[]

  constructor(
    private readonly options: SessionMemoryContextOptions,
    initialState?: SessionMemoryInitialState
  ) {
    const legacySummary = stringOrEmpty(initialState?.contextSummary)
    const legacyHistory = normalizeMemoryEntries(initialState?.history)
    const snapshot = normalizeSessionMemorySnapshot(initialState?.memory, {
      history: legacyHistory,
      summaryText: legacySummary,
    })

    this.compactions = snapshot.compactions
    this.promptSnapshots = snapshot.promptSnapshots
    this.recentEntries = snapshot.recentEntries
    this.summary = snapshot.summary
    this.summaryText = clampText(snapshot.summaryText, this.options.summaryMaxChars)
    this.transcriptEntries = snapshot.transcriptEntries
  }

  reset() {
    this.compactions = []
    this.promptSnapshots = []
    this.recentEntries = []
    this.summary = null
    this.summaryText = ""
    this.transcriptEntries = []
  }

  appendEntries(entries: SessionMemoryEntry[]) {
    const normalized = normalizeMemoryEntries(entries)
    this.recentEntries.push(...normalized)
    this.transcriptEntries.push(...normalized)
  }

  addExternalSummary(summary: string) {
    const text = summary.trim()
    if (!text) {
      return
    }

    this.summary = null
    this.summaryText = clampText(
      [this.summaryText, text].filter(Boolean).join("\n\n"),
      this.options.summaryMaxChars
    )
    this.appendEntries([{ role: "result", text }])
  }

  addNativeSdkSummary(summary: string) {
    const text = summary.trim()
    if (!text || summaryTextIncludes(this.summaryText, text)) {
      return false
    }

    this.summary = null
    this.summaryText = appendSummaryTextPreservingLatest(
      this.summaryText,
      renderNativeSdkSummary(text),
      this.options.summaryMaxChars
    )
    return true
  }

  canCompact() {
    return this.recentEntries.length > 0 || Boolean(this.summaryText)
  }

  estimateContextChars(extraPrompt = "") {
    return (
      this.summaryText.length +
      contextEntriesToText(this.recentEntries).length +
      extraPrompt.length
    )
  }

  lastRunInputTokens() {
    for (let index = this.recentEntries.length - 1; index >= 0; index -= 1) {
      const entry = this.recentEntries[index]
      const tokens = inputTokensFromMemoryText(entry.text)
      if (tokens > 0) {
        return tokens
      }
    }

    return 0
  }

  buildPromptContext(): SessionMemoryPromptContext {
    return {
      recentEntries: this.recentEntries.map((entry) => ({ ...entry })),
      recentText: contextEntriesToText(this.recentEntries),
      summaryText: this.summaryText,
    }
  }

  recordPromptSnapshot(prompt: string, context: SessionMemoryPromptContext) {
    const recentChars = context.recentText.length
    const summaryChars = context.summaryText.length

    this.promptSnapshots.push({
      id: createMemoryRecordId("prompt"),
      createdAt: Date.now(),
      promptChars: prompt.length,
      recentChars,
      recentEntryCount: context.recentEntries.length,
      summaryChars,
      totalChars: prompt.length + recentChars + summaryChars,
    })
    this.promptSnapshots = this.promptSnapshots.slice(-MAX_PROMPT_SNAPSHOTS)
  }

  createCompactionPlan(force: boolean): SessionMemoryCompactionPlan | undefined {
    if (!this.recentEntries.length) {
      return undefined
    }

    const retainedEntries = takeRecentEntries(
      this.recentEntries,
      this.options.retainRecentChars
    )
    const retainedCount = retainedEntries.length
    const compactableCount = this.recentEntries.length - retainedCount
    const entriesToCompact =
      compactableCount > 0
        ? this.recentEntries.slice(0, compactableCount)
        : this.recentEntries
    const finalRetainedEntries = compactableCount > 0 ? retainedEntries : []

    if (!force && compactableCount <= 0) {
      return undefined
    }

    return {
      entriesToCompact,
      originalChars: this.estimateContextChars(),
      previousSummaryText: this.summaryText,
      retainedChars: contextEntriesToText(finalRetainedEntries).length,
      retainedEntries: finalRetainedEntries,
    }
  }

  commitCompaction({
    errorMessage,
    output,
    plan,
    reason,
    status,
  }: {
    errorMessage?: string
    output: SessionMemoryCompactionOutput
    plan: SessionMemoryCompactionPlan
    reason: string
    status: "fallback" | "success"
  }) {
    this.summary = output.summary
    this.summaryText = clampText(output.summaryText, this.options.summaryMaxChars)
    this.recentEntries = plan.retainedEntries
    this.compactions.push({
      id: createMemoryRecordId("compact"),
      createdAt: Date.now(),
      errorMessage,
      inputChars: contextEntriesToText(plan.entriesToCompact).length,
      reason,
      retainedChars: plan.retainedChars,
      status,
      summaryChars: this.summaryText.length,
    })
    this.compactions = this.compactions.slice(-MAX_COMPACTION_RECORDS)
  }

  snapshot(): SessionMemorySnapshot {
    return {
      version: 1,
      compactions: this.compactions.map((entry) => ({ ...entry })),
      promptSnapshots: this.promptSnapshots.map((entry) => ({ ...entry })),
      recentEntries: this.recentEntries.map((entry) => ({ ...entry })),
      summary: this.summary ? cloneStructuredSummary(this.summary) : null,
      summaryText: this.summaryText,
      transcriptEntries: this.transcriptEntries.map((entry) => ({ ...entry })),
    }
  }
}

export function normalizeSessionMemorySnapshot(
  value: unknown,
  legacy: { history: SessionMemoryEntry[]; summaryText: string }
): SessionMemorySnapshot {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const summary = normalizeStructuredSummary(record.summary)
  const summaryText = stringOrEmpty(record.summaryText) || legacy.summaryText
  const recentEntries = normalizeMemoryEntries(record.recentEntries)
  const transcriptEntries = normalizeMemoryEntries(record.transcriptEntries)

  return {
    version: 1,
    compactions: normalizeCompactionRecords(record.compactions),
    promptSnapshots: normalizePromptSnapshots(record.promptSnapshots),
    recentEntries: recentEntries.length ? recentEntries : legacy.history,
    summary,
    summaryText: summaryText || (summary ? renderSessionMemorySummary(summary) : ""),
    transcriptEntries:
      transcriptEntries.length || recentEntries.length
        ? transcriptEntries.length
          ? transcriptEntries
          : recentEntries
        : legacy.history,
  }
}

export function normalizeMemoryEntries(entries: unknown): SessionMemoryEntry[] {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .filter(
      (entry): entry is SessionMemoryEntry =>
        Boolean(entry) &&
        typeof entry === "object" &&
        isSessionMemoryEntryRole((entry as SessionMemoryEntry).role) &&
        typeof (entry as SessionMemoryEntry).text === "string" &&
        (entry as SessionMemoryEntry).text.trim().length > 0
    )
    .map((entry) => ({ role: entry.role, text: entry.text }))
}

export function isSessionMemoryEntryRole(
  value: unknown
): value is SessionMemoryEntryRole {
  return (
    value === "assistant" ||
    value === "result" ||
    value === "status" ||
    value === "task" ||
    value === "tool" ||
    value === "user"
  )
}

export function parseSessionMemorySummary(
  rawText: string,
  maxChars: number
): SessionMemoryCompactionOutput {
  const text = rawText.trim()
  const parsed = parseJsonObject(stripJsonCodeFence(text))
  const summary = normalizeStructuredSummary(parsed)

  if (!summary || !hasStructuredSummaryContent(summary)) {
    return {
      summary: null,
      summaryText: clampText(text, maxChars),
    }
  }

  return {
    summary,
    summaryText: clampText(renderSessionMemorySummary(summary), maxChars),
  }
}

export function createFallbackSessionMemorySummary({
  entries,
  existingSummary,
  maxChars,
}: {
  entries: SessionMemoryEntry[]
  existingSummary: string
  maxChars: number
}): SessionMemoryCompactionOutput {
  const transcript = contextEntriesToText(entries)
  const sections = [
    existingSummary.trim()
      ? `Existing session memory:\n${existingSummary.trim()}`
      : undefined,
    `Deterministic compacted history:\n${clampTextMiddle(transcript, maxChars)}`,
  ].filter(Boolean)
  const summaryText = clampText(sections.join("\n\n"), maxChars)

  return {
    summary: null,
    summaryText,
  }
}

export function renderSessionMemorySummary(summary: StructuredSessionMemory) {
  return [
    renderSummarySection("Objective", summary.objective ? [summary.objective] : []),
    renderSummarySection("Decisions", summary.decisions),
    renderSummarySection("Changed files", summary.changedFiles),
    renderSummarySection("Commands run", summary.commandsRun),
    renderSummarySection("Test results", summary.testResults),
    renderSummarySection("Open issues", summary.openIssues),
    renderSummarySection(
      "User preferences in this session",
      summary.userPreferencesInThisSession
    ),
    renderSummarySection("Next steps", summary.nextSteps),
    renderSummarySection("Notes", summary.notes),
  ]
    .filter(Boolean)
    .join("\n\n")
}

export function contextEntriesToText(entries: SessionMemoryEntry[]) {
  return entries.map(contextEntryToText).join("\n\n")
}

export function contextEntryToText(entry: SessionMemoryEntry) {
  return `## ${entry.role}\n${entry.text.trim()}`
}

export function inputTokensFromMemoryText(text: string) {
  const match = /\binput=(\d+)\b/i.exec(text)
  if (!match) {
    return 0
  }

  const tokens = Number(match[1])
  return Number.isFinite(tokens) && tokens > 0 ? Math.floor(tokens) : 0
}

function renderNativeSdkSummary(summary: string) {
  return `Cursor SDK native summary:\n${summary.trim()}`
}

function summaryTextIncludes(summaryText: string, text: string) {
  const normalizedSummary = normalizeSummaryForComparison(summaryText)
  const normalizedText = normalizeSummaryForComparison(text)

  return Boolean(normalizedText && normalizedSummary.includes(normalizedText))
}

function normalizeSummaryForComparison(text: string) {
  return text.trim().replace(/\s+/g, " ")
}

function appendSummaryTextPreservingLatest(
  existingSummary: string,
  latestSummary: string,
  maxChars: number
) {
  const existing = existingSummary.trim()
  const latest = latestSummary.trim()
  const combined = [existing, latest].filter(Boolean).join("\n\n")

  if (combined.length <= maxChars) {
    return combined
  }

  if (latest.length >= maxChars) {
    return clampText(latest, maxChars)
  }

  const marker = "[earlier summary truncated]"
  const separator = "\n\n"
  const retainedExistingChars = Math.max(
    0,
    maxChars - latest.length - marker.length - separator.length * 2
  )
  const retainedExisting = retainedExistingChars
    ? existing.slice(Math.max(0, existing.length - retainedExistingChars)).trimStart()
    : ""

  return [marker, retainedExisting, latest].filter(Boolean).join(separator)
}

function takeRecentEntries(entries: SessionMemoryEntry[], maxChars: number) {
  const retained: SessionMemoryEntry[] = []
  let chars = 0

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]
    const entryChars = contextEntryToText(entry).length

    if (retained.length > 0 && chars + entryChars > maxChars) {
      break
    }

    retained.unshift(entry)
    chars += entryChars
  }

  return retained
}

function normalizeStructuredSummary(value: unknown): StructuredSessionMemory | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  return {
    schemaVersion: 1,
    objective: stringOrEmpty(record.objective),
    decisions: normalizeStringArray(record.decisions),
    changedFiles: normalizeStringArray(record.changedFiles),
    commandsRun: normalizeStringArray(record.commandsRun),
    testResults: normalizeStringArray(record.testResults),
    openIssues: normalizeStringArray(record.openIssues),
    userPreferencesInThisSession: normalizeStringArray(
      record.userPreferencesInThisSession
    ),
    nextSteps: normalizeStringArray(record.nextSteps),
    notes: normalizeStringArray(record.notes),
  }
}

function hasStructuredSummaryContent(summary: StructuredSessionMemory) {
  return Boolean(
    summary.objective ||
      summary.decisions.length ||
      summary.changedFiles.length ||
      summary.commandsRun.length ||
      summary.testResults.length ||
      summary.openIssues.length ||
      summary.userPreferencesInThisSession.length ||
      summary.nextSteps.length ||
      summary.notes.length
  )
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
}

function normalizeCompactionRecords(value: unknown): SessionMemoryCompactionRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const status: SessionMemoryCompactionRecord["status"] =
        item.status === "fallback" ? "fallback" : "success"

      return {
        id: stringOrEmpty(item.id) || createMemoryRecordId("compact"),
        createdAt: finiteNumberOrNow(item.createdAt),
        errorMessage: stringOrEmpty(item.errorMessage) || undefined,
        inputChars: finiteNumberOrZero(item.inputChars),
        reason: stringOrEmpty(item.reason),
        retainedChars: finiteNumberOrZero(item.retainedChars),
        status,
        summaryChars: finiteNumberOrZero(item.summaryChars),
      }
    })
    .slice(-MAX_COMPACTION_RECORDS)
}

function normalizePromptSnapshots(value: unknown): SessionMemoryPromptSnapshot[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: stringOrEmpty(item.id) || createMemoryRecordId("prompt"),
      createdAt: finiteNumberOrNow(item.createdAt),
      promptChars: finiteNumberOrZero(item.promptChars),
      recentChars: finiteNumberOrZero(item.recentChars),
      recentEntryCount: finiteNumberOrZero(item.recentEntryCount),
      summaryChars: finiteNumberOrZero(item.summaryChars),
      totalChars: finiteNumberOrZero(item.totalChars),
    }))
    .slice(-MAX_PROMPT_SNAPSHOTS)
}

function cloneStructuredSummary(summary: StructuredSessionMemory): StructuredSessionMemory {
  return {
    schemaVersion: 1,
    objective: summary.objective,
    decisions: [...summary.decisions],
    changedFiles: [...summary.changedFiles],
    commandsRun: [...summary.commandsRun],
    testResults: [...summary.testResults],
    openIssues: [...summary.openIssues],
    userPreferencesInThisSession: [...summary.userPreferencesInThisSession],
    nextSteps: [...summary.nextSteps],
    notes: [...summary.notes],
  }
}

function renderSummarySection(title: string, values: string[]) {
  if (!values.length) {
    return ""
  }

  return [`${title}:`, ...values.map((value) => `- ${value}`)].join("\n")
}

function stripJsonCodeFence(text: string) {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return (fenced?.[1] ?? text).trim()
}

function parseJsonObject(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    const start = text.indexOf("{")
    const end = text.lastIndexOf("}")
    if (start === -1 || end <= start) {
      return null
    }

    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as unknown
      return parsed && typeof parsed === "object" ? parsed : null
    } catch {
      return null
    }
  }
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : ""
}

function finiteNumberOrNow(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Date.now()
}

function finiteNumberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0
}

function createMemoryRecordId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function clampText(value: string, maxChars: number) {
  const text = value.trim()

  if (text.length <= maxChars) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxChars - 38)).trimEnd()}\n[truncated during compaction]`
}

function clampTextMiddle(value: string, maxChars: number) {
  const text = value.trim()

  if (text.length <= maxChars) {
    return text
  }

  const marker = "\n[... middle omitted during compaction ...]\n"
  const remaining = Math.max(0, maxChars - marker.length)
  const head = Math.ceil(remaining / 2)
  const tail = Math.floor(remaining / 2)

  return `${text.slice(0, head).trimEnd()}${marker}${text.slice(text.length - tail).trimStart()}`
}
