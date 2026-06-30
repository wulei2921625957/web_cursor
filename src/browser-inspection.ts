import { existsSync, readFileSync, statSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { HttpError } from "./http-security.js"

const BROWSER_RESOURCE_CHECK_LIMIT = 25
const BROWSER_FETCH_TIMEOUT_MS = 10_000

export type BrowserViewport = {
  height: number
  width: number
}

export type BrowserPolicyDecision = {
  allowed: boolean
  kind: "file" | "local" | "public"
  reason: string
}

export type BrowserResourceSummary = {
  label: string
  url: string
}

export type BrowserResourceIssue = {
  message: string
  status?: number
  type: "blocked" | "error" | "file" | "http"
  url: string
}

export type BrowserResourceKind = "image" | "script" | "stylesheet"

export type BrowserResourceCheck = {
  contentLength?: number
  contentType?: string
  durationMs?: number
  error?: string
  kind: BrowserResourceKind
  status?: number
  type: "blocked" | "error" | "file" | "http" | "ok"
  url: string
}

export type BrowserDomSummary = {
  description: string
  forms: BrowserResourceSummary[]
  headings: string[]
  images: BrowserResourceSummary[]
  links: BrowserResourceSummary[]
  scripts: BrowserResourceSummary[]
  stylesheets: BrowserResourceSummary[]
  textSample: string
  title: string
}

export type BrowserInspectionScreenshot = {
  name: string
  path: string
  previewUrl: string
  relativePath: string
}

export type BrowserInspection = {
  contentType: string
  dom: BrowserDomSummary
  htmlBytes: number
  id: string
  inspectedAt: number
  policy: BrowserPolicyDecision
  resourceChecks: BrowserResourceCheck[]
  resourceIssues: BrowserResourceIssue[]
  screenshot?: BrowserInspectionScreenshot
  status?: number
  url: string
  viewport: BrowserViewport
  warnings: string[]
}

export async function collectBrowserResourceChecks(
  dom: BrowserDomSummary,
  baseUrl: URL,
  workspaceCwd: string
) {
  const resources: Array<BrowserResourceSummary & { kind: BrowserResourceKind }> = [
    ...dom.scripts.map((item) => ({ ...item, kind: "script" as const })),
    ...dom.stylesheets.map((item) => ({ ...item, kind: "stylesheet" as const })),
    ...dom.images.map((item) => ({ ...item, kind: "image" as const })),
  ].slice(0, BROWSER_RESOURCE_CHECK_LIMIT)
  const checks: BrowserResourceCheck[] = []

  for (const resource of resources) {
    const resourceUrl = safeResolveBrowserUrl(resource.url, baseUrl)
    if (!resourceUrl || resourceUrl.protocol === "data:") {
      continue
    }

    if (resourceUrl.protocol === "file:") {
      const filePath = fileURLToPath(resourceUrl)
      if (!isInsidePath(workspaceCwd, filePath)) {
        checks.push({
          error: "指向 workspace 外的 file URL，已跳过。",
          kind: resource.kind,
          type: "blocked",
          url: resourceUrl.href,
        })
        continue
      }
      if (!existsSync(filePath)) {
        checks.push({
          error: "文件不存在。",
          kind: resource.kind,
          type: "file",
          url: resourceUrl.href,
        })
        continue
      }
      checks.push({
        contentLength: statSync(filePath).size,
        kind: resource.kind,
        status: 200,
        type: "ok",
        url: resourceUrl.href,
      })
      continue
    }

    if (!["http:", "https:"].includes(resourceUrl.protocol)) {
      continue
    }

    if (!isLoopbackHost(resourceUrl.hostname) && resourceUrl.origin !== baseUrl.origin) {
      checks.push({
        error: "外部资源，内置检查未请求。",
        kind: resource.kind,
        type: "blocked",
        url: resourceUrl.href,
      })
      continue
    }

    try {
      const startedAt = Date.now()
      const response = await fetch(resourceUrl, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(BROWSER_FETCH_TIMEOUT_MS),
      })
      const durationMs = Date.now() - startedAt
      if (response.status >= 400) {
        checks.push({
          contentLength: contentLengthHeader(response.headers.get("content-length")),
          contentType: response.headers.get("content-type") ?? undefined,
          durationMs,
          error: `返回 HTTP ${response.status}。`,
          kind: resource.kind,
          status: response.status,
          type: "http",
          url: resourceUrl.href,
        })
        continue
      }
      checks.push({
        contentLength: contentLengthHeader(response.headers.get("content-length")),
        contentType: response.headers.get("content-type") ?? undefined,
        durationMs,
        kind: resource.kind,
        status: response.status,
        type: "ok",
        url: resourceUrl.href,
      })
    } catch (error) {
      checks.push({
        error: getErrorMessage(error),
        kind: resource.kind,
        type: "error",
        url: resourceUrl.href,
      })
    }
  }

  return checks
}

export function browserResourceIssueFromCheck(
  check: BrowserResourceCheck
): BrowserResourceIssue {
  const prefix = check.kind
  if (check.type === "http") {
    return {
      message: `${prefix} ${check.error ?? `返回 HTTP ${check.status ?? ""}。`}`,
      status: check.status,
      type: "http",
      url: check.url,
    }
  }
  if (check.type === "blocked") {
    return {
      message: `${prefix} ${check.error ?? "已阻止。"}`,
      type: "blocked",
      url: check.url,
    }
  }
  if (check.type === "file") {
    return {
      message: `${prefix} ${check.error ?? "文件问题。"}`,
      type: "file",
      url: check.url,
    }
  }
  return {
    message: `${prefix} 请求失败：${check.error ?? "unknown"}`,
    type: "error",
    url: check.url,
  }
}

export function normalizeBrowserInspectionUrl(rawUrl: string, workspaceCwd: string) {
  const raw = rawUrl.trim()
  if (!raw) {
    throw new HttpError(400, "URL 不能为空。")
  }

  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/.test(raw)) {
    return new URL(`http://${raw}`)
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
    const url = new URL(raw)
    if (!["file:", "http:", "https:"].includes(url.protocol)) {
      throw new HttpError(400, "Browser 检查只支持 http、https 或 file URL。")
    }
    return url
  }

  if (path.isAbsolute(raw) || raw.startsWith(".") || raw.startsWith("~")) {
    const filePath = raw.startsWith("~")
      ? path.join(os.homedir(), raw.slice(1))
      : path.resolve(workspaceCwd, raw)
    return pathToFileURL(filePath)
  }

  return new URL(`https://${raw}`)
}

export function resolveBrowserInspectionPolicy(
  url: URL,
  workspaceCwd: string
): BrowserPolicyDecision {
  const policy = readBrowserPolicyConfig(workspaceCwd)
  if (policy.deny.some((pattern) => browserPatternMatches(url, pattern))) {
    return {
      allowed: false,
      kind: browserUrlKind(url),
      reason: "当前 URL 被 browser.deny 策略阻止。",
    }
  }

  if (url.protocol === "file:") {
    const filePath = fileURLToPath(url)
    const allowed =
      isInsidePath(workspaceCwd, filePath) ||
      policy.allow.some((pattern) => browserPatternMatches(url, pattern))
    return {
      allowed,
      kind: "file",
      reason: allowed
        ? "允许检查 workspace 内 file URL。"
        : "默认只能检查当前 session workspace 内的 file URL；如需放开，请在 extensions browser.allow 中配置。",
    }
  }

  const kind = browserUrlKind(url)
  const allowed =
    kind === "local" ||
    policy.allow.some((pattern) => browserPatternMatches(url, pattern))
  return {
    allowed,
    kind,
    reason: allowed
      ? "允许检查本地或显式允许的 URL。"
      : "默认只允许检查 localhost/file 页面；公网或内网页面请先加入 extensions browser.allow，或使用外部 Playwright/Chrome MCP。",
  }
}

export function summarizeBrowserHtml(html: string, baseUrl: URL): BrowserDomSummary {
  return {
    description: extractMetaDescription(html),
    forms: extractFormSummaries(html, baseUrl),
    headings: extractHeadingTexts(html),
    images: extractTagResources(html, "img", "src", baseUrl, "alt"),
    links: extractTagResources(html, "a", "href", baseUrl),
    scripts: extractTagResources(html, "script", "src", baseUrl),
    stylesheets: extractStylesheetResources(html, baseUrl),
    textSample: stripHtmlToText(html).slice(0, 1000),
    title: extractFirstTagText(html, "title"),
  }
}

export function browserContentTypeForFile(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
    case ".htm":
      return "text/html"
    case ".svg":
      return "image/svg+xml"
    case ".txt":
      return "text/plain"
    default:
      return "application/octet-stream"
  }
}

function readBrowserPolicyConfig(workspaceCwd: string) {
  const candidates = [
    path.join(workspaceCwd, "coding-agent.extensions.json"),
    path.join(workspaceCwd, ".coding-agent", "extensions.json"),
  ]
  for (const file of candidates) {
    if (!isReadableFile(file)) {
      continue
    }

    try {
      const config = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>
      const browser =
        config.browser && typeof config.browser === "object" && !Array.isArray(config.browser)
          ? (config.browser as Record<string, unknown>)
          : {}
      return {
        allow: stringArrayField(browser.allow),
        deny: stringArrayField(browser.deny),
      }
    } catch {
      continue
    }
  }

  return { allow: [] as string[], deny: [] as string[] }
}

function browserPatternMatches(url: URL, rawPattern: string) {
  const pattern = rawPattern.trim()
  if (!pattern) return false
  const normalizedHost = normalizeBrowserHost(url.hostname)
  if (!pattern.includes("/") && !pattern.includes("*")) {
    return normalizedHost === normalizeBrowserHost(pattern)
  }

  const regex = new RegExp(
    `^${pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replace(/\*/g, ".*")}$`,
    "i"
  )
  return [url.href, url.origin, normalizedHost].some((target) => regex.test(target))
}

function browserUrlKind(url: URL): BrowserPolicyDecision["kind"] {
  if (url.protocol === "file:") return "file"
  return isLoopbackHost(url.hostname) ? "local" : "public"
}

function isLoopbackHost(hostname: string) {
  const host = normalizeBrowserHost(hostname)
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){0,3}$/.test(host)
  )
}

function normalizeBrowserHost(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "")
}

function extractHeadingTexts(html: string) {
  const headings: string[] = []
  const regex = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  for (const match of html.matchAll(regex)) {
    const text = stripHtmlToText(match[2]).slice(0, 160)
    if (text) headings.push(text)
    if (headings.length >= 20) break
  }
  return headings
}

function extractTagResources(
  html: string,
  tag: string,
  attribute: string,
  baseUrl: URL,
  labelAttribute?: string
) {
  const items: BrowserResourceSummary[] = []
  const regex = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?<\\/${tag}>)?`, "gi")
  for (const match of html.matchAll(regex)) {
    const attrs = parseHtmlAttributes(match[1])
    const rawUrl = attrs[attribute.toLowerCase()]
    if (!rawUrl) continue
    const resolved = safeResolveBrowserUrl(rawUrl, baseUrl)
    const label =
      (labelAttribute ? attrs[labelAttribute.toLowerCase()] : "") ||
      stripHtmlToText(match[2] ?? "") ||
      (resolved ? path.basename(resolved.pathname) : "") ||
      rawUrl
    items.push({
      label: label.slice(0, 160),
      url: resolved?.href ?? rawUrl,
    })
    if (items.length >= 40) break
  }
  return items
}

function extractStylesheetResources(html: string, baseUrl: URL) {
  const items: BrowserResourceSummary[] = []
  const regex = /<link\b([^>]*)>/gi
  for (const match of html.matchAll(regex)) {
    const attrs = parseHtmlAttributes(match[1])
    if (!/\bstylesheet\b/i.test(attrs.rel ?? "")) {
      continue
    }
    const rawUrl = attrs.href
    if (!rawUrl) continue
    const resolved = safeResolveBrowserUrl(rawUrl, baseUrl)
    items.push({
      label: (resolved ? path.basename(resolved.pathname) : "") || rawUrl,
      url: resolved?.href ?? rawUrl,
    })
    if (items.length >= 40) break
  }
  return items
}

function extractFormSummaries(html: string, baseUrl: URL) {
  const items: BrowserResourceSummary[] = []
  const regex = /<form\b([^>]*)>/gi
  for (const match of html.matchAll(regex)) {
    const attrs = parseHtmlAttributes(match[1])
    const rawAction = attrs.action || baseUrl.href
    const resolved = safeResolveBrowserUrl(rawAction, baseUrl)
    items.push({
      label: `${(attrs.method || "get").toUpperCase()} ${attrs.name || attrs.id || ""}`.trim(),
      url: resolved?.href ?? rawAction,
    })
    if (items.length >= 20) break
  }
  return items
}

function extractMetaDescription(html: string) {
  const regex = /<meta\b([^>]*)>/gi
  for (const match of html.matchAll(regex)) {
    const attrs = parseHtmlAttributes(match[1])
    const name = (attrs.name || attrs.property || "").toLowerCase()
    if (name === "description" || name === "og:description") {
      return decodeHtmlEntities(attrs.content || "").slice(0, 300)
    }
  }
  return ""
}

function extractFirstTagText(html: string, tag: string) {
  const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  const match = regex.exec(html)
  return match ? stripHtmlToText(match[1]).slice(0, 200) : ""
}

function parseHtmlAttributes(raw: string) {
  const attrs: Record<string, string> = {}
  const regex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of raw.matchAll(regex)) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(
      match[2] ?? match[3] ?? match[4] ?? ""
    )
  }
  return attrs
}

function stripHtmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
}

function safeResolveBrowserUrl(rawUrl: string, baseUrl: URL) {
  try {
    return new URL(rawUrl, baseUrl)
  } catch {
    return null
  }
}

function contentLengthHeader(value: string | null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function stringArrayField(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : []
}

function isReadableFile(file: string) {
  try {
    return statSync(file).isFile()
  } catch {
    return false
  }
}

function isInsidePath(root: string, target: string) {
  const relative = path.relative(comparableResolvedPath(root), comparableResolvedPath(target))
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function comparableResolvedPath(value: string) {
  const resolved = path.resolve(value)
  return process.platform === "win32" ? resolved.toLowerCase() : resolved
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
