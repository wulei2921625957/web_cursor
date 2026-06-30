import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  publicPromptDraftPath,
  readPromptDraft,
  writePromptDraft,
} from "../src/prompt-draft.ts"

test("prompt drafts are stored under workspace coding-agent storage", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "prompt-draft-"))

  try {
    const draft = await writePromptDraft(cwd, "session/with spaces", "long prompt\nbody")

    assert.equal(draft.exists, true)
    assert.equal(draft.content, "long prompt\nbody")
    assert.match(draft.path, /^\.coding-agent\/prompt-drafts\//)
    assert.equal(draft.path.includes("/../"), false)
    assert.equal(await readPromptDraft(cwd, "session/with spaces").then((item) => item.content), "long prompt\nbody")
    assert.equal(publicPromptDraftPath(cwd, "session/with spaces"), draft.path)
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
})

test("missing prompt draft returns an empty snapshot", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "prompt-draft-"))

  try {
    const draft = await readPromptDraft(cwd, "session-1")

    assert.equal(draft.exists, false)
    assert.equal(draft.content, "")
    assert.equal(draft.updatedAt, null)
    assert.match(draft.path, /^\.coding-agent\/prompt-drafts\//)
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
})
