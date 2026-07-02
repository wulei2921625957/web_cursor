export function errorTextWithCauses(error: unknown): string {
  const parts = collectErrorTextParts(error, new Set<object>())
  return Array.from(new Set(parts.filter(Boolean))).join(" ")
}

export function isRecoverableSdkStreamCloseError(error: unknown) {
  const text = normalizedErrorText(error)

  return (
    text.includes("nghttp2_frame_size_error") ||
    (text.includes("stream closed") && text.includes("frame_size")) ||
    isSdkTransportError(error)
  )
}

export function isSdkHttp2FrameError(error: unknown) {
  const text = normalizedErrorText(error)

  return (
    text.includes("nghttp2_frame_size_error") ||
    text.includes("err_http2_stream_error")
  )
}

export function isSdkCancellationError(error: unknown) {
  return isSdkCancellationErrorText(normalizedErrorText(error))
}

export function isSdkCancellationErrorText(text: string) {
  return (
    text.includes("connecterror") &&
    text.includes("canceled") &&
    text.includes("operation was aborted")
  ) || (
    text.includes("aborterror") &&
    text.includes("operation was aborted")
  )
}

export function isSdkTransportError(error: unknown) {
  const text = normalizedErrorText(error)

  return (
    text.includes("nghttp2_frame_size_error") ||
    text.includes("err_http2_stream_error") ||
    text.includes("stream closed with error code") ||
    text.includes("econnreset") ||
    text.includes("econnaborted") ||
    text.includes("etimedout") ||
    text.includes("socket hang up") ||
    text.includes("client network socket disconnected") ||
    (text.includes("connecterror") && text.includes("network error")) ||
    isSdkCancellationErrorText(text)
  )
}

function normalizedErrorText(error: unknown) {
  return errorTextWithCauses(error).toLowerCase()
}

function collectErrorTextParts(error: unknown, seen: Set<object>): string[] {
  if (error === null || error === undefined) {
    return []
  }

  if (
    typeof error === "string" ||
    typeof error === "number" ||
    typeof error === "boolean" ||
    typeof error === "bigint" ||
    typeof error === "symbol"
  ) {
    return [String(error)]
  }

  if (typeof error !== "object") {
    return [String(error)]
  }

  if (seen.has(error)) {
    return []
  }

  seen.add(error)
  const record = error as Record<string, unknown>
  const parts: string[] = []

  for (const key of ["name", "message", "rawMessage", "code", "errno", "syscall"]) {
    const value = record[key]
    if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value))
    }
  }

  parts.push(...collectErrorTextParts(record.cause, seen))

  if (Array.isArray(record.errors)) {
    for (const item of record.errors) {
      parts.push(...collectErrorTextParts(item, seen))
    }
  }

  return parts
}
