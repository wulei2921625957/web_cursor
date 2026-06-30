import { existsSync, statSync } from "node:fs"
import * as fs from "node:fs/promises"
import path from "node:path"

import { readGit } from "./git-workspace.js"

export type WorktreeCleanupResult = {
  failed: string[]
  removed: string[]
  skipped: string[]
}

export async function cleanupOrphanManagedWorktrees({
  activeWorktreePaths,
  managedRoot,
}: {
  activeWorktreePaths: Iterable<string>
  managedRoot: string
}): Promise<WorktreeCleanupResult> {
  const root = path.resolve(managedRoot)
  const active = new Set(
    Array.from(activeWorktreePaths, (worktreePath) =>
      comparableResolvedPath(worktreePath)
    )
  )
  const result: WorktreeCleanupResult = {
    failed: [],
    removed: [],
    skipped: [],
  }

  let entries: import("node:fs").Dirent[]
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return result
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const worktreePath = path.resolve(root, entry.name)
    if (
      !isInsidePath(root, worktreePath) ||
      comparableResolvedPath(worktreePath) === comparableResolvedPath(root)
    ) {
      result.skipped.push(worktreePath)
      continue
    }
    if (active.has(comparableResolvedPath(worktreePath))) {
      result.skipped.push(worktreePath)
      continue
    }

    try {
      await removeManagedWorktree(worktreePath)
      result.removed.push(worktreePath)
    } catch {
      try {
        await fs.rm(worktreePath, { force: true, recursive: true })
        result.removed.push(worktreePath)
      } catch {
        result.failed.push(worktreePath)
      }
    }
  }

  return result
}

async function removeManagedWorktree(worktreePath: string) {
  const sourceCwd = inferManagedWorktreeSource(worktreePath)
  if (sourceCwd) {
    readGit(sourceCwd, ["worktree", "remove", "--force", worktreePath])
    return
  }

  await fs.rm(worktreePath, { force: true, recursive: true })
}

export function inferManagedWorktreeSource(worktreePath: string) {
  try {
    const commonDir = readGit(worktreePath, ["rev-parse", "--git-common-dir"]).trim()
    const resolvedCommonDir = path.resolve(worktreePath, commonDir)
    const sourceCwd = path.dirname(resolvedCommonDir)
    return isUsableDirectory(sourceCwd) ? sourceCwd : ""
  } catch {
    return ""
  }
}

function isInsidePath(root: string, target: string) {
  const relative = path.relative(
    comparableResolvedPath(root),
    comparableResolvedPath(target)
  )
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function comparableResolvedPath(value: string) {
  const resolved = path.resolve(value)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

function isUsableDirectory(cwd: string) {
  try {
    return existsSync(cwd) && statSync(cwd).isDirectory()
  } catch {
    return false
  }
}
