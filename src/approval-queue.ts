import path from "node:path"

import type {
  ShellApprovalHandler,
  ShellApprovalRequest,
  ShellApprovalResult,
} from "./permissions.js"

export type ApprovalAction = "approve_once" | "approve_session" | "deny"

export type PendingApproval = {
  command: string
  createdAt: number
  cwd: string
  id: string
  projectId: string
  reason: string
  resolve: (result: ShellApprovalResult) => void
  risk: string
  sessionId: string
  source: string
  status: "pending"
}

export type PublicPendingApproval = Omit<PendingApproval, "resolve" | "status">

export class ShellApprovalQueue {
  private readonly pending = new Map<string, PendingApproval>()
  private readonly sessionGrants = new Map<string, Set<string>>()

  constructor(private readonly createId: () => string) {}

  createHandler(projectId: string, sessionId: string): ShellApprovalHandler {
    return async (request) => {
      const grantKey = approvalKey(request)
      if (this.sessionGrants.get(sessionId)?.has(grantKey)) {
        return {
          approved: true,
          message: "Approved earlier for this session.",
          scope: "session",
        }
      }

      const id = this.createId()
      return await new Promise<ShellApprovalResult>((resolve) => {
        this.pending.set(id, {
          command: request.command,
          createdAt: Date.now(),
          cwd: request.cwd,
          id,
          projectId,
          reason: request.permission.reason,
          resolve,
          risk: request.permission.risk,
          sessionId,
          source: request.source,
          status: "pending",
        })
      })
    }
  }

  publicPendingApprovals(): PublicPendingApproval[] {
    return Array.from(this.pending.values()).map((approval) => ({
      command: approval.command,
      createdAt: approval.createdAt,
      cwd: approval.cwd,
      id: approval.id,
      projectId: approval.projectId,
      reason: approval.reason,
      risk: approval.risk,
      sessionId: approval.sessionId,
      source: approval.source,
    }))
  }

  resolve(approvalId: string, action: ApprovalAction) {
    const approval = this.pending.get(approvalId)
    if (!approval) {
      throw new Error("审批请求不存在或已经处理。")
    }

    this.pending.delete(approvalId)
    if (action === "approve_session") {
      const grants = this.sessionGrants.get(approval.sessionId) ?? new Set<string>()
      grants.add(
        approvalKey({
          command: approval.command,
          cwd: approval.cwd,
          source: approval.source,
        })
      )
      this.sessionGrants.set(approval.sessionId, grants)
    }

    const approved = action !== "deny"
    approval.resolve({
      approved,
      message: approved ? "用户批准执行命令。" : "用户拒绝执行命令。",
      scope: action === "approve_session" ? "session" : "once",
    })
    return approval
  }

  denySession(sessionId: string, message: string) {
    this.sessionGrants.delete(sessionId)
    for (const approval of Array.from(this.pending.values())) {
      if (approval.sessionId !== sessionId) {
        continue
      }
      this.pending.delete(approval.id)
      approval.resolve({
        approved: false,
        message,
        scope: "once",
      })
    }
  }
}

function approvalKey(
  request: Pick<ShellApprovalRequest, "command" | "cwd" | "source">
) {
  return [request.source, path.resolve(request.cwd), request.command.trim()].join("\0")
}
