import { execFileSync } from "node:child_process"
import assert from "node:assert/strict"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  cleanupOrphanManagedWorktrees,
  inferManagedWorktreeSource,
} from "../src/worktree-cleanup.ts"

test("cleans orphan managed worktree directories and keeps active ones", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-worktree-cleanup-"))
  try {
    const managedRoot = path.join(tempDir, "worktrees")
    const activeWorktree = path.join(managedRoot, "active")
    const orphanWorktree = path.join(managedRoot, "orphan")
    const ignoredFile = path.join(managedRoot, "README.txt")

    mkdirSync(activeWorktree, { recursive: true })
    mkdirSync(orphanWorktree, { recursive: true })
    writeFileSync(ignoredFile, "not a worktree\n", "utf8")

    const result = await cleanupOrphanManagedWorktrees({
      activeWorktreePaths: [activeWorktree],
      managedRoot,
    })

    assert.equal(existsSync(activeWorktree), true)
    assert.equal(existsSync(orphanWorktree), false)
    assert.equal(existsSync(ignoredFile), true)
    assert.deepEqual(result.failed, [])
    assert.deepEqual(result.removed, [orphanWorktree])
    assert.deepEqual(result.skipped, [activeWorktree])
  } finally {
    rmSync(tempDir, { force: true, recursive: true })
  }
})

test("removes linked git worktrees through the source repository", async () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-worktree-git-"))
  try {
    const repo = path.join(tempDir, "repo")
    const managedRoot = path.join(tempDir, "worktrees")
    const worktreePath = path.join(managedRoot, "repo-session")

    mkdirSync(repo, { recursive: true })
    mkdirSync(managedRoot, { recursive: true })
    git(repo, ["init"])
    git(repo, ["config", "user.email", "test@example.com"])
    git(repo, ["config", "user.name", "Coding Agent Test"])
    writeFileSync(path.join(repo, "README.md"), "# Test\n", "utf8")
    git(repo, ["add", "README.md"])
    git(repo, ["commit", "-m", "base"])
    git(repo, ["worktree", "add", "--detach", worktreePath, "HEAD"])

    assert.equal(
      realpathSync.native(inferManagedWorktreeSource(worktreePath)),
      realpathSync.native(repo)
    )

    const result = await cleanupOrphanManagedWorktrees({
      activeWorktreePaths: [],
      managedRoot,
    })

    assert.equal(existsSync(worktreePath), false)
    assert.deepEqual(result.failed, [])
    assert.deepEqual(result.removed, [worktreePath])
    assert.doesNotMatch(git(repo, ["worktree", "list", "--porcelain"]), /repo-session/)
  } finally {
    rmSync(tempDir, { force: true, recursive: true })
  }
})

function git(cwd: string, args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
}
