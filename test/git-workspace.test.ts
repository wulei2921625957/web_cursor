import { execFileSync } from "node:child_process"
import assert from "node:assert/strict"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  commitStagedChanges,
  createDraftPullRequest,
  getGitReviewState,
  pushCurrentBranch,
  recordSessionChangeResult,
  revertSessionFile,
  revertWorkspaceHunk,
  stageWorkspaceFile,
  stageWorkspaceHunk,
  suggestStagedCommitMessage,
  tryCreateWorkspaceTree,
  unstageWorkspaceFile,
} from "../src/git-workspace.ts"

type TestSession = {
  changeBaselineTree?: string
  changeResultTree?: string
}

test("stages and unstages a workspace file", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "a.txt"), "base\n", "utf8")
    git(cwd, ["add", "a.txt"])
    git(cwd, ["commit", "-m", "base"])

    writeFileSync(path.join(cwd, "a.txt"), "changed\n", "utf8")
    stageWorkspaceFile(cwd, "a.txt")
    assert.equal(git(cwd, ["diff", "--cached", "--name-only"]).trim(), "a.txt")

    unstageWorkspaceFile(cwd, "a.txt")
    assert.equal(git(cwd, ["diff", "--cached", "--name-only"]).trim(), "")
    assert.equal(git(cwd, ["diff", "--name-only"]).trim(), "a.txt")
  })
})

test("reverts a changed session file back to the baseline tree", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "a.txt"), "base\n", "utf8")
    git(cwd, ["add", "a.txt"])
    git(cwd, ["commit", "-m", "base"])

    const session: TestSession = { changeBaselineTree: tryCreateWorkspaceTree(cwd) }
    assert.ok(session.changeBaselineTree)

    writeFileSync(path.join(cwd, "a.txt"), "changed\n", "utf8")
    stageWorkspaceFile(cwd, "a.txt")
    recordSessionChangeResult(cwd, session)

    assert.equal(revertSessionFile(cwd, session, "a.txt"), true)
    assert.equal(readFileSync(path.join(cwd, "a.txt"), "utf8"), "base\n")
    assert.equal(git(cwd, ["diff", "--cached", "--name-only", "--", "a.txt"]).trim(), "")
    assert.equal(git(cwd, ["diff", "--name-only", "--", "a.txt"]).trim(), "")
  })
})

test("reverts a new session file by removing it from the worktree and index", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "a.txt"), "base\n", "utf8")
    git(cwd, ["add", "a.txt"])
    git(cwd, ["commit", "-m", "base"])

    const session: TestSession = { changeBaselineTree: tryCreateWorkspaceTree(cwd) }
    assert.ok(session.changeBaselineTree)

    writeFileSync(path.join(cwd, "new.txt"), "new\n", "utf8")
    stageWorkspaceFile(cwd, "new.txt")
    recordSessionChangeResult(cwd, session)

    assert.equal(revertSessionFile(cwd, session, "new.txt"), true)
    assert.equal(existsSync(path.join(cwd, "new.txt")), false)
    assert.equal(git(cwd, ["status", "--short"]).trim(), "")
  })
})

test("commits staged changes and returns the short commit hash", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "a.txt"), "base\n", "utf8")
    git(cwd, ["add", "a.txt"])
    git(cwd, ["commit", "-m", "base"])

    writeFileSync(path.join(cwd, "a.txt"), "changed\n", "utf8")
    stageWorkspaceFile(cwd, "a.txt")

    const hash = commitStagedChanges(cwd, "update a")
    assert.match(hash, /^[0-9a-f]{7,}$/)
    assert.equal(git(cwd, ["log", "-1", "--format=%s"]).trim(), "update a")
    assert.equal(git(cwd, ["status", "--short"]).trim(), "")
  })
})

test("stages a single workspace hunk", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "a.txt"), numberedLines(), "utf8")
    git(cwd, ["add", "a.txt"])
    git(cwd, ["commit", "-m", "base"])

    writeFileSync(path.join(cwd, "a.txt"), numberedLines({ 1: "one", 20: "twenty" }), "utf8")

    stageWorkspaceHunk(cwd, "a.txt", 0)
    const staged = git(cwd, ["diff", "--cached", "--", "a.txt"])
    const unstaged = git(cwd, ["diff", "--", "a.txt"])
    assert.match(staged, /one/)
    assert.doesNotMatch(staged, /twenty/)
    assert.match(unstaged, /twenty/)
    assert.doesNotMatch(unstaged, /one/)
  })
})

test("reverts a single workspace hunk", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "a.txt"), numberedLines(), "utf8")
    git(cwd, ["add", "a.txt"])
    git(cwd, ["commit", "-m", "base"])

    writeFileSync(path.join(cwd, "a.txt"), numberedLines({ 1: "one", 20: "twenty" }), "utf8")

    revertWorkspaceHunk(cwd, "a.txt", 0)
    const content = readFileSync(path.join(cwd, "a.txt"), "utf8")
    const diff = git(cwd, ["diff", "--", "a.txt"])
    assert.match(content, /^line 1$/m)
    assert.match(content, /^twenty$/m)
    assert.match(diff, /twenty/)
    assert.doesNotMatch(diff, /one/)
  })
})

test("suggests a commit message from staged files", () => {
  withGitRepo((cwd) => {
    writeFileSync(path.join(cwd, "README.md"), "# Base\n", "utf8")
    git(cwd, ["add", "README.md"])
    git(cwd, ["commit", "-m", "base"])

    writeFileSync(path.join(cwd, "README.md"), "# Changed\n", "utf8")
    stageWorkspaceFile(cwd, "README.md")

    assert.equal(suggestStagedCommitMessage(cwd), "docs: update documentation")
  })
})

test("pushes the current branch and records upstream", () => {
  const remote = mkdtempSync(path.join(os.tmpdir(), "coding-agent-remote-test-"))
  try {
    git(remote, ["init", "--bare"])

    withGitRepo((cwd) => {
      writeFileSync(path.join(cwd, "a.txt"), "base\n", "utf8")
      git(cwd, ["add", "a.txt"])
      git(cwd, ["commit", "-m", "base"])
      git(cwd, ["remote", "add", "origin", remote])

      const branch = git(cwd, ["branch", "--show-current"]).trim()
      const before = getGitReviewState(cwd)
      assert.equal(before.canPush, true)
      assert.equal(before.canCreatePullRequest, false)
      assert.equal(before.remote, "origin")
      assert.equal(before.upstream, undefined)
      assert.throws(
        () => createDraftPullRequest(cwd),
        /尚未设置上游|请先推送/
      )

      const pushed = pushCurrentBranch(cwd)
      assert.equal(pushed.branch, branch)
      assert.equal(pushed.upstream, `origin/${branch}`)
      assert.equal(
        git(cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).trim(),
        `origin/${branch}`
      )

      const after = getGitReviewState(cwd)
      assert.equal(after.ahead, 0)
      assert.equal(after.canPush, false)
      assert.equal(after.canCreatePullRequest, true)
    })
  } finally {
    rmSync(remote, { force: true, recursive: true })
  }
})

function withGitRepo(run: (cwd: string) => void) {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "coding-agent-git-test-"))
  try {
    git(cwd, ["init"])
    git(cwd, ["config", "user.email", "test@example.com"])
    git(cwd, ["config", "user.name", "Coding Agent Test"])
    run(cwd)
  } finally {
    rmSync(cwd, { force: true, recursive: true })
  }
}

function numberedLines(overrides: Record<number, string> = {}) {
  return Array.from({ length: 20 }, (_, index) => {
    const lineNumber = index + 1
    return overrides[lineNumber] ?? `line ${lineNumber}`
  }).join("\n") + "\n"
}

function git(cwd: string, args: string[]) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
}
