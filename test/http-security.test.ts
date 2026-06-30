import assert from "node:assert/strict"
import test from "node:test"
import {
  accessCookieHeader,
  constantTimeEqual,
  isAllowedRequestOrigin,
  isLoopbackBindHost,
  requiresHttpAccessToken,
} from "../src/http-security.ts"

test("requires access tokens for non-loopback bind hosts", () => {
  assert.equal(requiresHttpAccessToken("127.0.0.1"), false)
  assert.equal(requiresHttpAccessToken("localhost"), false)
  assert.equal(requiresHttpAccessToken("::1"), false)
  assert.equal(requiresHttpAccessToken("0.0.0.0"), true)
  assert.equal(requiresHttpAccessToken("192.168.1.10"), true)
})

test("detects loopback bind hosts", () => {
  assert.equal(isLoopbackBindHost("127.0.0.1"), true)
  assert.equal(isLoopbackBindHost("[::1]"), true)
  assert.equal(isLoopbackBindHost("0.0.0.0"), false)
})

test("compares tokens without accepting different lengths", () => {
  assert.equal(constantTimeEqual("abc", "abc"), true)
  assert.equal(constantTimeEqual("abc", "abd"), false)
  assert.equal(constantTimeEqual("abc", "abcd"), false)
})

test("validates same-origin browser requests", () => {
  const url = new URL("http://127.0.0.1:3030/api/run")
  const same = {
    headers: { host: "127.0.0.1:3030", origin: "http://127.0.0.1:3030" },
  }
  const cross = {
    headers: { host: "127.0.0.1:3030", origin: "https://example.test" },
  }

  assert.equal(isAllowedRequestOrigin(same as never, url), true)
  assert.equal(isAllowedRequestOrigin(cross as never, url), false)
})

test("creates strict http-only access cookie header", () => {
  const header = accessCookieHeader("token value")
  assert.match(header, /coding_agent_ui_token=token%20value/)
  assert.match(header, /HttpOnly/)
  assert.match(header, /SameSite=Strict/)
})
