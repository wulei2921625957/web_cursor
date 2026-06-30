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
  status: string
}

export type DiffLine = {
  kind: "add" | "context" | "del" | "hunk" | "meta"
  newLine?: number
  oldLine?: number
  text: string
}

export type WorkspaceChanges = {
  available: boolean
  files: ChangedFile[]
  message: string
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
    attachDiffLines(cwd, files, diffByPath)

    return {
      available: true,
      files,
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
  let oldLine = 0
  let newLine = 0

  const flush = () => {
    if (currentPath) {
      diffByPath.set(currentPath, lines)
    }
    currentPath = ""
    oldPath = ""
    lines = []
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
        kind: "hunk",
        text: rawLine,
      })
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
