import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"

type SessionChangeSnapshot = {
  changeBaselineTree?: string
  changeResultTree?: string
}

export type ChangedFile = {
  additions?: number
  deletions?: number
  diffLines?: DiffLine[]
  diffTruncated?: boolean
  label: string
  path: string
  staged?: boolean
  status: string
  untracked?: boolean
  unstaged?: boolean
}

export type DiffLine = {
  hunkIndex?: number
  kind: "add" | "context" | "del" | "hunk" | "meta"
  newLine?: number
  oldLine?: number
  text: string
}

export type WorkspaceChanges = {
  available: boolean
  files: ChangedFile[]
  git?: GitReviewState
  message: string
}

export type GitReviewState = {
  ahead: number
  available: boolean
  branch?: string
  canCreatePullRequest: boolean
  canPush: boolean
  detached: boolean
  hasRemote: boolean
  hasStagedChanges: boolean
  message: string
  remote?: string
  upstream?: string
}

function getWorkspaceChanges(cwd: string): WorkspaceChanges {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    const statsByPath = parseGitNumstat(
      readGit(cwd, ["diff", "--numstat", "HEAD", "--"])
    )
    const diffByPath = parseGitDiff(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--no-ext-diff",
        "--no-color",
        "--unified=4",
        "HEAD",
        "--",
      ])
    )
    const files = parseGitStatus(
      readGit(cwd, ["status", "--short"]),
      statsByPath
    )
    attachDiffLines(cwd, files, diffByPath)

    return {
      available: true,
      files,
      git: getGitReviewState(cwd),
      message:
        files.length === 0
          ? "当前没有代码变更。"
          : `当前有 ${files.length} 个文件变更。`,
    }
  } catch {
    return {
      available: false,
      files: [],
      message: "当前目录不是 Git 仓库，无法显示代码变更。",
    }
  }
}

export function getSessionChanges(
  cwd: string,
  session: SessionChangeSnapshot
): WorkspaceChanges {
  if (!session.changeBaselineTree) {
    if (!isGitWorkspace(cwd)) {
      return {
        available: false,
        files: [],
        message: "当前目录不是 Git 仓库，或 Git 不可用，无法显示本次聊天变更。",
      }
    }

    return {
      available: true,
      files: [],
      git: getGitReviewState(cwd),
      message: "当前会话还没有本次聊天变更。",
    }
  }

  return getWorkspaceChangesSinceTree(
    cwd,
    session.changeBaselineTree,
    session.changeResultTree
  )
}

function isGitWorkspace(cwd: string) {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    return true
  } catch {
    return false
  }
}

export function recordSessionChangeResult(
  cwd: string,
  session: SessionChangeSnapshot
) {
  if (!session.changeBaselineTree) {
    return
  }

  try {
    session.changeResultTree = createWorkspaceTree(cwd)
  } catch {
    session.changeResultTree = undefined
  }
}

function getWorkspaceChangesSinceTree(
  cwd: string,
  baselineTree: string,
  resultTree?: string
): WorkspaceChanges {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    const currentTree = resultTree || createWorkspaceTree(cwd)

    if (currentTree === baselineTree) {
      return {
        available: true,
        files: [],
        git: getGitReviewState(cwd),
        message: "本次聊天没有代码变更。",
      }
    }

    const statsByPath = parseGitNumstat(
      readGit(cwd, ["diff", "--numstat", baselineTree, currentTree, "--"])
    )
    const diffByPath = parseGitDiff(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--no-ext-diff",
        "--no-color",
        "--unified=4",
        baselineTree,
        currentTree,
        "--",
      ])
    )
    const files = parseGitNameStatus(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--name-status",
        baselineTree,
        currentTree,
        "--",
      ]),
      statsByPath
    )
    attachWorkingTreeStatus(cwd, files)
    attachDiffLines(cwd, files, diffByPath)

    return {
      available: true,
      files,
      git: getGitReviewState(cwd),
      message:
        files.length === 0
          ? "本次聊天没有代码变更。"
          : `本次聊天有 ${files.length} 个文件变更。`,
    }
  } catch {
    return {
      available: false,
      files: [],
      message: "无法计算本次聊天变更，可能当前目录不是 Git 仓库或基线已失效。",
    }
  }
}

function createWorkspaceTree(cwd: string) {
  readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
  const indexDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-index-"))
  const indexFile = path.join(indexDir, "index")
  const env = { ...process.env, GIT_INDEX_FILE: indexFile }

  try {
    try {
      readGitWithEnv(cwd, ["read-tree", "HEAD"], env)
    } catch {
      readGitWithEnv(cwd, ["read-tree", "--empty"], env)
    }

    readGitWithEnv(cwd, ["add", "-A", "--", "."], env)
    return readGitWithEnv(cwd, ["write-tree"], env).trim()
  } finally {
    rmSync(indexDir, { force: true, recursive: true })
  }
}

export function tryCreateWorkspaceTree(cwd: string) {
  try {
    return createWorkspaceTree(cwd)
  } catch {
    return undefined
  }
}

function createWorkspacePatch(cwd: string, fromTreeish = "HEAD") {
  const currentTree = createWorkspaceTree(cwd)
  return readGit(cwd, ["diff", "--binary", fromTreeish, currentTree, "--"])
}

export function restoreWorkspaceTree(cwd: string, targetTree: string) {
  const currentTree = createWorkspaceTree(cwd)
  if (currentTree === targetTree) {
    return false
  }

  const patch = readGit(cwd, ["diff", "--binary", currentTree, targetTree, "--"])
  applyGitPatch(cwd, patch)
  return true
}

export function stageWorkspaceFile(cwd: string, filePath: string) {
  const gitPath = validateGitRelativePath(filePath)
  readGit(cwd, ["add", "--", gitPath])
}

export function unstageWorkspaceFile(cwd: string, filePath: string) {
  const gitPath = validateGitRelativePath(filePath)
  try {
    readGit(cwd, ["restore", "--staged", "--", gitPath])
  } catch {
    readGit(cwd, ["reset", "--", gitPath])
  }
}

export function revertSessionFile(
  cwd: string,
  session: SessionChangeSnapshot,
  filePath: string
) {
  const gitPath = validateGitRelativePath(filePath)
  if (!session.changeBaselineTree) {
    throw new Error("当前会话还没有可用于撤销的 Git 基线。")
  }

  const currentTree = createWorkspaceTree(cwd)
  const baselineEntry = gitTreePathEntry(cwd, session.changeBaselineTree, gitPath)
  const currentEntry = gitTreePathEntry(cwd, currentTree, gitPath)
  if (currentEntry === baselineEntry) {
    return false
  }

  if (
    session.changeResultTree &&
    currentEntry !==
      gitTreePathEntry(cwd, session.changeResultTree, gitPath)
  ) {
    throw new Error("该文件在本轮任务后又发生了变化，请先刷新并手动确认后再撤销。")
  }

  if (baselineEntry) {
    try {
      readGit(cwd, [
        "restore",
        "--source",
        session.changeBaselineTree,
        "--staged",
        "--worktree",
        "--",
        gitPath,
      ])
    } catch {
      readGit(cwd, ["checkout", session.changeBaselineTree, "--", gitPath])
    }
  } else {
    readGit(cwd, ["rm", "-f", "--cached", "--ignore-unmatch", "--", gitPath])
    rmSync(path.resolve(cwd, gitPath), { force: true, recursive: true })
  }

  return true
}

export function stageWorkspaceHunk(
  cwd: string,
  filePath: string,
  hunkIndex: number
) {
  const patch = createWorkspaceHunkPatch(cwd, filePath, hunkIndex)
  applyGitPatchToIndex(cwd, patch)
}

export function revertWorkspaceHunk(
  cwd: string,
  filePath: string,
  hunkIndex: number
) {
  const patch = createWorkspaceHunkPatch(cwd, filePath, hunkIndex)
  applyGitPatchReverse(cwd, patch)
  return true
}

export function commitStagedChanges(cwd: string, message: string) {
  const trimmed = message.trim()
  if (!trimmed) {
    throw new Error("提交信息不能为空。")
  }

  if (!hasStagedChanges(cwd)) {
    throw new Error("没有已暂存的变更可提交。")
  }

  readGit(cwd, ["commit", "-m", trimmed])
  return readGit(cwd, ["rev-parse", "--short", "HEAD"]).trim()
}

export function suggestStagedCommitMessage(cwd: string) {
  if (!hasStagedChanges(cwd)) {
    throw new Error("没有已暂存的变更可生成提交信息。")
  }

  const files = parseGitNameStatus(
    readGit(cwd, [
      "-c",
      "core.quotePath=false",
      "diff",
      "--cached",
      "--name-status",
      "--",
    ]),
    parseGitNumstat(
      readGit(cwd, [
        "-c",
        "core.quotePath=false",
        "diff",
        "--cached",
        "--numstat",
        "--",
      ])
    )
  )

  return buildCommitMessageSuggestion(files)
}

export function getGitReviewState(cwd: string): GitReviewState {
  try {
    readGit(cwd, ["rev-parse", "--is-inside-work-tree"])
    const branch = readOptionalGit(cwd, [
      "symbolic-ref",
      "--quiet",
      "--short",
      "HEAD",
    ])
    const upstream = readOptionalGit(cwd, [
      "rev-parse",
      "--abbrev-ref",
      "--symbolic-full-name",
      "@{u}",
    ])
    const remotes = readGit(cwd, ["remote"])
      .split(/\r?\n/)
      .map((remote) => remote.trim())
      .filter(Boolean)
    const remote = remotes.includes("origin") ? "origin" : remotes[0]
    const hasHeadCommit = Boolean(readOptionalGit(cwd, ["rev-parse", "--verify", "HEAD"]))
    const ahead = upstream
      ? parseAheadCount(readOptionalGit(cwd, ["rev-list", "--left-right", "--count", `${upstream}...HEAD`]))
      : hasHeadCommit
        ? parseCommitCount(readOptionalGit(cwd, ["rev-list", "--count", "HEAD", "--not", "--remotes"]))
        : 0
    const detached = !branch
    const hasRemote = remotes.length > 0
    const canPush = Boolean(branch && hasRemote && hasHeadCommit && (ahead > 0 || !upstream))
    const canCreatePullRequest = Boolean(branch && hasRemote && upstream && ahead === 0)

    return {
      ahead,
      available: true,
      branch: branch || undefined,
      canCreatePullRequest,
      canPush,
      detached,
      hasRemote,
      hasStagedChanges: hasStagedChanges(cwd),
      message: gitReviewStateMessage({ ahead, branch, detached, hasRemote, upstream }),
      remote,
      upstream: upstream || undefined,
    }
  } catch {
    return {
      ahead: 0,
      available: false,
      canCreatePullRequest: false,
      canPush: false,
      detached: false,
      hasRemote: false,
      hasStagedChanges: false,
      message: "当前目录不是 Git 仓库，无法读取发布状态。",
    }
  }
}

export function pushCurrentBranch(cwd: string) {
  const state = getGitReviewState(cwd)
  if (!state.available) {
    throw new Error(state.message)
  }

  if (state.detached || !state.branch) {
    throw new Error("当前工作区处于 detached HEAD，无法直接推送。")
  }

  if (!state.hasRemote || !state.remote) {
    throw new Error("当前仓库没有 Git remote，无法推送。")
  }

  if (state.upstream && state.ahead <= 0) {
    throw new Error("当前分支没有待推送提交。")
  }

  const args = state.upstream
    ? ["push"]
    : ["push", "-u", state.remote, state.branch]
  const output = runCommandForUser(cwd, "git", args).trim()

  return {
    branch: state.branch,
    output,
    remote: state.remote,
    upstream: state.upstream || `${state.remote}/${state.branch}`,
  }
}

export function createDraftPullRequest(cwd: string) {
  const state = getGitReviewState(cwd)
  if (!state.available) {
    throw new Error(state.message)
  }

  if (state.detached || !state.branch) {
    throw new Error("当前工作区处于 detached HEAD，无法创建 PR。")
  }

  if (!state.hasRemote) {
    throw new Error("当前仓库没有 Git remote，无法创建 PR。")
  }

  if (!state.upstream) {
    throw new Error("当前分支尚未设置上游，请先推送分支。")
  }

  if (state.ahead > 0) {
    throw new Error("当前分支还有未推送提交，请先推送后再创建 PR。")
  }

  const output = runCommandForUser(cwd, "gh", ["pr", "create", "--fill", "--draft"]).trim()
  const url = extractFirstUrl(output)

  return {
    branch: state.branch,
    output,
    url,
  }
}

export function applyWorkspacePatch(fromCwd: string, toCwd: string) {
  const patch = createWorkspacePatch(fromCwd)
  applyGitPatch(toCwd, patch)
}

function applyGitPatch(cwd: string, patch: string) {
  if (!patch.trim()) {
    return
  }

  const patchDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-patch-"))
  const patchFile = path.join(patchDir, "workspace.patch")

  try {
    writeFileSync(patchFile, patch, "utf8")
    readGit(cwd, ["apply", "--check", patchFile])
    readGit(cwd, ["apply", patchFile])
  } finally {
    rmSync(patchDir, { force: true, recursive: true })
  }
}

function applyGitPatchToIndex(cwd: string, patch: string) {
  applyGitPatchWithArgs(cwd, patch, ["--cached"])
}

function applyGitPatchReverse(cwd: string, patch: string) {
  applyGitPatchWithArgs(cwd, patch, ["--reverse"])
}

function applyGitPatchWithArgs(cwd: string, patch: string, args: string[]) {
  if (!patch.trim()) {
    return
  }

  const patchDir = mkdtempSync(path.join(os.tmpdir(), "coding-agent-patch-"))
  const patchFile = path.join(patchDir, "workspace.patch")

  try {
    writeFileSync(patchFile, patch, "utf8")
    readGit(cwd, ["apply", ...args, "--check", patchFile])
    readGit(cwd, ["apply", ...args, patchFile])
  } finally {
    rmSync(patchDir, { force: true, recursive: true })
  }
}

export function readGit(cwd: string, args: string[]) {
  return readGitWithEnv(cwd, args, process.env)
}

function readGitWithEnv(cwd: string, args: string[], env: NodeJS.ProcessEnv) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "ignore"],
  })
}

function runCommandForUser(cwd: string, command: string, args: string[]) {
  try {
    const commandArgs = command === "git" ? ["-C", cwd, ...args] : args
    return execFileSync(command, commandArgs, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  } catch (error) {
    const stderr = typeof (error as { stderr?: unknown }).stderr === "string"
      ? ((error as { stderr?: string }).stderr ?? "").trim()
      : ""
    const stdout = typeof (error as { stdout?: unknown }).stdout === "string"
      ? ((error as { stdout?: string }).stdout ?? "").trim()
      : ""
    const detail = [stderr, stdout].filter(Boolean).join("\n")
    throw new Error(detail || (error instanceof Error ? error.message : String(error)))
  }
}

function extractFirstUrl(output: string) {
  return output.match(/https?:\/\/\S+/)?.[0] ?? ""
}

function readOptionalGit(cwd: string, args: string[]) {
  try {
    return readGit(cwd, args).trim()
  } catch {
    return ""
  }
}

function hasStagedChanges(cwd: string) {
  try {
    execFileSync("git", ["-C", cwd, "diff", "--cached", "--quiet", "--"], {
      stdio: ["ignore", "ignore", "ignore"],
    })
    return false
  } catch (error) {
    const status = (error as { status?: unknown }).status
    if (status === 1) {
      return true
    }
    throw error
  }
}

function parseAheadCount(value: string) {
  const [, aheadRaw] = value.trim().split(/\s+/)
  return parseCommitCount(aheadRaw)
}

function parseCommitCount(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function gitReviewStateMessage(state: {
  ahead: number
  branch: string
  detached: boolean
  hasRemote: boolean
  upstream: string
}) {
  if (state.detached) {
    return "当前工作区处于 detached HEAD，无法直接推送。"
  }

  if (!state.branch) {
    return "当前仓库还没有可推送的分支。"
  }

  if (!state.hasRemote) {
    return "当前仓库没有 Git remote。"
  }

  if (!state.upstream) {
    return `当前分支 ${state.branch} 尚未设置上游，可推送到 remote。`
  }

  if (state.ahead > 0) {
    return `当前分支领先上游 ${state.ahead} 个提交。`
  }

  return "当前分支没有待推送提交。"
}

function buildCommitMessageSuggestion(files: ChangedFile[]) {
  if (files.length === 0) {
    return "chore: update project files"
  }

  const areas = files.map((file) => commitAreaForPath(file.path))
  const uniqueAreas = Array.from(new Set(areas))
  const onlyArea = uniqueAreas.length === 1 ? uniqueAreas[0] : ""
  const type = commitTypeForAreas(uniqueAreas)

  if (onlyArea === "docs") {
    return "docs: update documentation"
  }

  if (onlyArea === "tests") {
    return "test: update coverage"
  }

  if (onlyArea === "config") {
    return "chore: update project configuration"
  }

  if (uniqueAreas.includes("git")) {
    return `${type}: update git workflow`
  }

  if (uniqueAreas.includes("permissions")) {
    return `${type}: update permission controls`
  }

  if (uniqueAreas.includes("ui")) {
    return `${type}: update review panel`
  }

  if (uniqueAreas.includes("server")) {
    return `${type}: update server workflow`
  }

  if (files.length === 1) {
    return `${type}: update ${path.basename(files[0].path)}`
  }

  return `${type}: update project files`
}

function commitTypeForAreas(areas: string[]) {
  if (areas.length === 1 && areas[0] === "docs") {
    return "docs"
  }

  if (areas.length === 1 && areas[0] === "tests") {
    return "test"
  }

  if (areas.every((area) => area === "config" || area === "docs" || area === "tests")) {
    return "chore"
  }

  return "feat"
}

function commitAreaForPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/")
  const name = path.basename(normalized)

  if (normalized.startsWith("docs/") || name.toLowerCase().endsWith(".md")) {
    return "docs"
  }

  if (normalized.startsWith("test/") || normalized.startsWith("tests/")) {
    return "tests"
  }

  if (
    name === "package.json" ||
    name === "package-lock.json" ||
    name === "tsconfig.json" ||
    normalized.includes(".config.")
  ) {
    return "config"
  }

  if (normalized.includes("git-workspace")) {
    return "git"
  }

  if (
    normalized.includes("permissions") ||
    normalized.includes("http-security")
  ) {
    return "permissions"
  }

  if (normalized.startsWith("src/web/")) {
    return "ui"
  }

  if (normalized.startsWith("src/")) {
    return "server"
  }

  return "project"
}

function gitTreePathEntry(cwd: string, treeish: string, filePath: string) {
  try {
    return readGit(cwd, ["ls-tree", treeish, "--", filePath]).trim()
  } catch {
    return ""
  }
}

function validateGitRelativePath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/").trim()
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").some((part) => part === ".." || part === "")
  ) {
    throw new Error("文件路径无效。")
  }
  return normalized
}

function createWorkspaceHunkPatch(
  cwd: string,
  filePath: string,
  hunkIndex: number
) {
  const gitPath = validateGitRelativePath(filePath)
  const normalizedIndex = Number(hunkIndex)
  if (
    !Number.isInteger(normalizedIndex) ||
    normalizedIndex < 0 ||
    normalizedIndex > 10000
  ) {
    throw new Error("hunkIndex 无效。")
  }

  const diff = readGit(cwd, [
    "-c",
    "core.quotePath=false",
    "diff",
    "--no-ext-diff",
    "--no-color",
    "--unified=4",
    "--",
    gitPath,
  ])
  if (!diff.trim()) {
    throw new Error("该文件当前没有可操作的未暂存 hunk。")
  }

  return extractSingleHunkPatch(diff, normalizedIndex)
}

function extractSingleHunkPatch(diff: string, hunkIndex: number) {
  const lines = diff.replace(/\r\n?/g, "\n").split("\n")
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop()
  }

  const header: string[] = []
  const hunks: string[][] = []
  let currentHunk: string[] | null = null

  for (const line of lines) {
    if (line.startsWith("@@ ")) {
      currentHunk = [line]
      hunks.push(currentHunk)
      continue
    }

    if (currentHunk) {
      currentHunk.push(line)
    } else {
      header.push(line)
    }
  }

  const hunk = hunks[hunkIndex]
  if (!hunk) {
    throw new Error("该 hunk 当前不可用，请刷新 diff 后重试。")
  }

  if (
    !header.some((line) => line.startsWith("--- ")) ||
    !header.some((line) => line.startsWith("+++ "))
  ) {
    throw new Error("该 hunk 不是普通文本 diff，无法按 hunk 操作。")
  }

  return `${header.concat(hunk).join("\n")}\n`
}

const MAX_DIFF_LINES_PER_FILE = 520
const MAX_UNTRACKED_PREVIEW_BYTES = 180_000

function attachDiffLines(
  cwd: string,
  files: ChangedFile[],
  diffByPath: Map<string, DiffLine[]>
) {
  for (const file of files) {
    let diffLines = diffByPath.get(file.path) ?? []

    if (file.status === "??") {
      const preview = createUntrackedDiffPreview(cwd, file.path)
      if (preview) {
        diffLines = preview.lines
        file.additions = file.additions ?? preview.additions
        file.deletions = file.deletions ?? 0
      }
    }

    file.diffTruncated = diffLines.length > MAX_DIFF_LINES_PER_FILE
    file.diffLines = file.diffTruncated
      ? diffLines.slice(0, MAX_DIFF_LINES_PER_FILE)
      : diffLines
  }
}

function parseGitDiff(output: string) {
  const diffByPath = new Map<string, DiffLine[]>()
  let currentPath = ""
  let oldPath = ""
  let lines: DiffLine[] = []
  let hunkIndex = 0
  let oldLine = 0
  let newLine = 0

  const flush = () => {
    if (currentPath) {
      diffByPath.set(currentPath, lines)
    }
    currentPath = ""
    oldPath = ""
    lines = []
    hunkIndex = 0
    oldLine = 0
    newLine = 0
  }

  for (const rawLine of output.split(/\r?\n/)) {
    if (rawLine.startsWith("diff --git ")) {
      flush()
      continue
    }

    if (rawLine.startsWith("--- ")) {
      oldPath = parseDiffPath(rawLine.slice(4))
      continue
    }

    if (rawLine.startsWith("+++ ")) {
      const newPath = parseDiffPath(rawLine.slice(4))
      currentPath = newPath === "/dev/null" ? oldPath : newPath
      continue
    }

    const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(rawLine)
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1])
      newLine = Number(hunkMatch[2])
      lines.push({
        hunkIndex,
        kind: "hunk",
        text: rawLine,
      })
      hunkIndex += 1
      continue
    }

    if (!currentPath || rawLine.length === 0) {
      continue
    }

    if (rawLine.startsWith("+")) {
      lines.push({
        kind: "add",
        newLine,
        text: rawLine.slice(1),
      })
      newLine += 1
      continue
    }

    if (rawLine.startsWith("-")) {
      lines.push({
        kind: "del",
        oldLine,
        text: rawLine.slice(1),
      })
      oldLine += 1
      continue
    }

    if (rawLine.startsWith(" ")) {
      lines.push({
        kind: "context",
        newLine,
        oldLine,
        text: rawLine.slice(1),
      })
      oldLine += 1
      newLine += 1
      continue
    }

    if (rawLine.startsWith("\\")) {
      lines.push({
        kind: "meta",
        text: rawLine,
      })
    }
  }

  flush()
  return diffByPath
}

function parseDiffPath(value: string) {
  const withoutMeta = value.split("\t")[0]?.trim() ?? ""
  if (withoutMeta === "/dev/null") {
    return withoutMeta
  }

  return withoutMeta.replace(/^[ab]\//, "")
}

function createUntrackedDiffPreview(cwd: string, filePath: string) {
  try {
    const absolutePath = path.resolve(cwd, filePath)
    const rootPath = path.resolve(cwd)
    if (absolutePath !== rootPath && !absolutePath.startsWith(rootPath + path.sep)) {
      return null
    }

    const stat = statSync(absolutePath)
    if (!stat.isFile() || stat.size > MAX_UNTRACKED_PREVIEW_BYTES) {
      return null
    }

    const buffer = readFileSync(absolutePath)
    if (buffer.includes(0)) {
      return null
    }

    const text = buffer.toString("utf8").replace(/\r\n?/g, "\n")
    const rawLines =
      text.length === 0
        ? []
        : text.endsWith("\n")
          ? text.slice(0, -1).split("\n")
          : text.split("\n")
    const lines = rawLines.map((line, index) => ({
      kind: "add" as const,
      newLine: index + 1,
      text: line,
    }))

    return {
      additions: rawLines.length,
      lines,
    }
  } catch {
    return null
  }
}

function parseGitNumstat(output: string) {
  const statsByPath = new Map<string, { additions?: number; deletions?: number }>()

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const [additionsRaw, deletionsRaw, ...pathParts] = line.split("\t")
    const filePath = normalizeGitRenamePath(pathParts.join("\t"))

    if (!filePath) {
      continue
    }

    statsByPath.set(filePath, {
      additions: parseGitStatNumber(additionsRaw),
      deletions: parseGitStatNumber(deletionsRaw),
    })
  }

  return statsByPath
}

function parseGitStatus(
  output: string,
  statsByPath: Map<string, { additions?: number; deletions?: number }>
) {
  const files: ChangedFile[] = []

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const status = line.slice(0, 2)
    const rawPath = line.slice(3).trim()
    const filePath = normalizeGitRenamePath(rawPath)
    const stats = statsByPath.get(filePath) ?? statsByPath.get(rawPath)

    files.push({
      path: filePath,
      status: status.trim() || status,
      label: gitStatusLabel(status),
      additions: stats?.additions,
      deletions: stats?.deletions,
      ...workingTreeStatusFlags(status),
    })
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function parseGitNameStatus(
  output: string,
  statsByPath: Map<string, { additions?: number; deletions?: number }>
) {
  const files: ChangedFile[] = []

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) {
      continue
    }

    const [statusRaw, ...pathParts] = line.split("\t")
    const rawPath = pathParts.length > 1 ? pathParts[pathParts.length - 1] : pathParts[0]
    const filePath = normalizeGitRenamePath(rawPath || "")
    const stats = statsByPath.get(filePath) ?? statsByPath.get(rawPath || "")

    if (!filePath) {
      continue
    }

    files.push({
      path: filePath,
      status: statusRaw.trim(),
      label: gitStatusLabel(statusRaw.trim()),
      additions: stats?.additions,
      deletions: stats?.deletions,
    })
  }

  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function attachWorkingTreeStatus(cwd: string, files: ChangedFile[]) {
  const statuses = parseGitStatus(readGit(cwd, ["status", "--short"]), new Map())
  const byPath = new Map(statuses.map((file) => [file.path, file]))
  for (const file of files) {
    const status = byPath.get(file.path)
    if (!status) {
      file.staged = false
      file.unstaged = false
      file.untracked = false
      continue
    }
    file.staged = status.staged
    file.unstaged = status.unstaged
    file.untracked = status.untracked
  }
}

function workingTreeStatusFlags(status: string) {
  if (status === "??") {
    return { staged: false, untracked: true, unstaged: true }
  }

  const index = status[0] ?? " "
  const worktree = status[1] ?? " "
  return {
    staged: index !== " " && index !== "?",
    untracked: false,
    unstaged: worktree !== " " && worktree !== "?",
  }
}

function normalizeGitRenamePath(filePath: string) {
  const match = /^(.*) -> (.*)$/.exec(filePath)
  return (match?.[2] ?? filePath).trim()
}

function parseGitStatNumber(value: string | undefined) {
  if (!value || value === "-") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function gitStatusLabel(status: string) {
  if (status === "??") {
    return "未跟踪"
  }

  if (status.includes("U") || status === "AA" || status === "DD") {
    return "冲突"
  }

  if (status.includes("R")) {
    return "重命名"
  }

  if (status.includes("C")) {
    return "复制"
  }

  if (status.includes("A")) {
    return "新增"
  }

  if (status.includes("D")) {
    return "删除"
  }

  if (status.includes("M")) {
    return "修改"
  }

  return "变更"
}
