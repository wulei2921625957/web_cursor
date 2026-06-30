import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  deleteProjectMemory,
  deleteUserMemory,
  memoryPromptContext,
  projectMemoryFile,
  projectMemoryPromptContext,
  readMemoryRecords,
  readMemorySettings,
  readProjectMemory,
  readUserMemory,
  searchMemoryRecords,
  userMemoryFile,
  writeMemorySettings,
  writeProjectMemory,
  writeUserMemory,
} from "../src/project-memory.ts"

test("project memory persists under workspace storage", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "project-memory-"))

  try {
    assert.equal(readProjectMemory(cwd), "")

    await writeProjectMemory(cwd, "Remember local setup.")

    assert.equal(readProjectMemory(cwd), "Remember local setup.")
    assert.equal(
      path.relative(cwd, projectMemoryFile(cwd)).split(path.sep).join("/"),
      ".coding-agent/project-memory.md"
    )
    assert.match(projectMemoryPromptContext(cwd), /Project memory/)

    await deleteProjectMemory(cwd)
    assert.equal(readProjectMemory(cwd), "")
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
})

test("user memory persists under user storage and joins prompt context", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "project-memory-"))
  const home = mkdtempSync(path.join(os.tmpdir(), "user-memory-"))

  try {
    await writeProjectMemory(cwd, "Project uses pnpm.")
    await writeUserMemory("Prefer concise summaries.", home)

    assert.equal(readUserMemory(home), "Prefer concise summaries.")
    assert.equal(
      path.relative(home, userMemoryFile(home)).split(path.sep).join("/"),
      ".coding-agent/user-memory.md"
    )
    assert.match(memoryPromptContext(cwd, home), /User memory/)
    assert.match(memoryPromptContext(cwd, home), /Project memory/)

    const results = searchMemoryRecords(cwd, "pnpm", home)
    assert.equal(results.length, 1)
    assert.equal(results[0].scope, "project")

    await deleteUserMemory(home)
    assert.equal(readUserMemory(home), "")
  } finally {
    rmSync(cwd, { force: true, recursive: true })
    rmSync(home, { force: true, recursive: true })
  }
})

test("memory settings disable prompt injection without deleting records", async () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "project-memory-"))
  const home = mkdtempSync(path.join(os.tmpdir(), "user-memory-"))

  try {
    await writeProjectMemory(cwd, "Project memory stays editable.")
    await writeUserMemory("User memory stays editable.", home)

    assert.deepEqual(readMemorySettings(cwd), {
      projectEnabled: true,
      userEnabled: true,
    })

    await writeMemorySettings(cwd, { projectEnabled: false })

    const projectRecord = readMemoryRecords(cwd, home).find(
      (record) => record.scope === "project"
    )
    assert.equal(projectRecord?.enabled, false)
    assert.equal(projectRecord?.memory, "Project memory stays editable.")
    assert.equal(projectMemoryPromptContext(cwd), "")
    assert.doesNotMatch(memoryPromptContext(cwd, home), /Project memory/)
    assert.match(memoryPromptContext(cwd, home), /User memory/)

    await writeMemorySettings(cwd, { userEnabled: false })

    assert.equal(memoryPromptContext(cwd, home), "")
  } finally {
    rmSync(cwd, { force: true, recursive: true })
    rmSync(home, { force: true, recursive: true })
  }
})
