import { randomBytes, timingSafeEqual } from "node:crypto"
import type { IncomingMessage } from "node:http"

export const MAX_JSON_BODY_BYTES = 36 * 1024 * 1024
export const ACCESS_COOKIE_NAME = "coding_agent_ui_token"

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
  }
}

export function createHttpAccessToken() {
  return randomBytes(32).toString("base64url")
}

export function requiresHttpAccessToken(host: string) {
  return !isLoopbackBindHost(host)
}

export function isLoopbackBindHost(host: string) {
  const normalized = normalizeHost(host)
  return (
    normalized === "" ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1"
  )
}

export function isAllowedRequestOrigin(
  request: IncomingMessage,
  requestUrl: URL
) {
  const origin = request.headers.origin
  if (!origin) {
    return true
  }

  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }

  const requestHost = normalizeHeaderHost(request.headers.host ?? requestUrl.host)
  return (
    parsed.protocol === requestUrl.protocol &&
    normalizeHeaderHost(parsed.host) === requestHost
  )
}

export function assertHttpRequestAllowed(
  request: IncomingMessage,
  requestUrl: URL,
  accessToken: string
) {
  if (isStateChangingMethod(request.method) && !isAllowedRequestOrigin(request, requestUrl)) {
    throw new HttpError(403, "请求来源不被允许。")
  }

  if (!accessToken) {
    return
  }

  if (!isAuthorizedRequest(request, requestUrl, accessToken)) {
    throw new HttpError(401, "缺少或无效的访问令牌。")
  }
}

export function requestTokenFromUrl(requestUrl: URL) {
  return requestUrl.searchParams.get("token")?.trim() ?? ""
}

export function isAuthorizedRequest(
  request: IncomingMessage,
  requestUrl: URL,
  accessToken: string
) {
  const candidates = [
    bearerToken(request.headers.authorization),
    cookieToken(request.headers.cookie),
    requestTokenFromUrl(requestUrl),
  ].filter(Boolean)

  return candidates.some((candidate) => constantTimeEqual(candidate, accessToken))
}

export function accessCookieHeader(accessToken: string) {
  return [
    `${ACCESS_COOKIE_NAME}=${encodeURIComponent(accessToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ].join("; ")
}

export function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function bearerToken(value: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(value ?? "")
  return match?.[1]?.trim() ?? ""
}

function cookieToken(value: string | undefined) {
  const cookie = value ?? ""
  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=")
    if (rawName === ACCESS_COOKIE_NAME) {
      return decodeURIComponent(rawValue.join("=") || "")
    }
  }
  return ""
}

function isStateChangingMethod(method: string | undefined) {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase())
}

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/^\[(.*)]$/, "$1")
}

function normalizeHeaderHost(host: string) {
  const normalized = host.trim().toLowerCase()
  if (normalized.startsWith("[") && normalized.includes("]")) {
    const end = normalized.indexOf("]")
    return normalized.slice(1, end) + normalized.slice(end + 1)
  }
  return normalized
}
