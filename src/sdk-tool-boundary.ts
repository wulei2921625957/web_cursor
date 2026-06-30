import {
  sdkAutoReviewEnabled,
  sdkCustomToolsEnabled,
  type LocalSandboxOptions,
  type PermissionMode,
} from "./permissions.js"

export type SdkToolBoundarySummary = {
  badge: string
  builtInToolBoundary: {
    controls: string[]
    interceptableByProject: boolean
  }
  enforcedByProject: string[]
  permissionMode: PermissionMode
  summary: string
  warnings: string[]
}

export function sdkToolBoundarySummary(
  sandboxOptions?: LocalSandboxOptions
): SdkToolBoundarySummary {
  const permissionMode = sandboxOptions?.permissionMode ?? "auto"
  const autoReview = sdkAutoReviewEnabled(sandboxOptions)
  const customTools = sdkCustomToolsEnabled(sandboxOptions)
  const controls = [
    "Cursor SDK sandbox options",
    autoReview ? "Cursor SDK autoReview" : "",
  ].filter(Boolean)
  const warnings = [
    "SDK built-in file/shell/tool calls do not expose a project-level per-tool interception callback.",
    "This app can fully approve, deny, and audit only its own custom tools, terminal runs, and hooks.",
  ]

  return {
    badge: autoReview ? "SDK Auto-review" : "SDK Sandbox",
    builtInToolBoundary: {
      controls,
      interceptableByProject: false,
    },
    enforcedByProject: [
      customTools
        ? "workspace_shell custom tool approvals"
        : "workspace_* custom tools withheld from SDK MCP approval mode",
      customTools
        ? "workspace_* custom tool workspace boundaries"
        : "workspace boundaries enforced before app-owned terminal, hook, and artifact access",
      "integrated terminal permissions",
      "lifecycle hook permissions",
      "audit log entries for app-owned execution paths",
    ],
    permissionMode,
    summary:
      "Project-level enforcement covers app-owned custom tools when exposed, terminal runs, and hooks. SDK built-in tools are constrained through SDK sandbox/autoReview because the SDK does not expose per-tool interception.",
    warnings,
  }
}

export function sdkToolBoundaryRuntimeInstruction(
  sandboxOptions?: LocalSandboxOptions
) {
  const boundary = sandboxOptions ? sdkToolBoundarySummary(sandboxOptions) : null
  const customTools = sdkCustomToolsEnabled(sandboxOptions)
  const lines = [
    "SDK tool boundary:",
    customTools
      ? "- Project-level approval, deny, and audit enforcement applies to workspace_* custom tools, integrated terminal runs, and lifecycle hooks."
      : "- workspace_* custom tools are not exposed in this permission mode because local SDK sandbox/Auto-review cannot grant interactive MCP approval.",
    "- SDK built-in tools are constrained through SDK sandbox options and SDK autoReview where enabled; this app cannot intercept every built-in tool call before execution.",
    customTools
      ? "- Prefer workspace_* custom tools for local workspace reads, searches, and shell commands so project-level policy and audit remain enforceable."
      : "- Use SDK built-in local tools for workspace reads, searches, and validation in this permission mode.",
  ]
  if (boundary) {
    lines.splice(
      3,
      0,
      `- Current permission mode: ${boundary.permissionMode}.`,
      boundary.builtInToolBoundary.controls.length
        ? `- Active SDK controls: ${boundary.builtInToolBoundary.controls.join(", ")}.`
        : "- Active SDK controls: none reported."
    )
  }
  return lines.join("\n")
}
