import assert from "node:assert/strict"
import test from "node:test"

import {
  errorTextWithCauses,
  isSdkAuthenticationError,
  isRecoverableSdkStreamCloseError,
  isSdkCancellationError,
  isSdkTransportError,
} from "../src/sdk-errors.ts"

test("SDK transport errors include ECONNRESET from ConnectRPC causes", () => {
  const cause = Object.assign(new Error("read ECONNRESET"), {
    code: "ECONNRESET",
    errno: -4077,
    syscall: "read",
  })
  const error = Object.assign(new Error("HTTP/2 session closed"), {
    name: "ConnectError",
    rawMessage: "read ECONNRESET",
    code: 10,
    cause,
  })

  assert.match(errorTextWithCauses(error), /ECONNRESET/)
  assert.equal(isSdkTransportError(error), true)
  assert.equal(isRecoverableSdkStreamCloseError(error), true)
})

test("SDK cancellation remains distinguishable from network resets", () => {
  const error = new Error("ConnectError: Canceled: operation was aborted")

  assert.equal(isSdkCancellationError(error), true)
  assert.equal(isSdkTransportError(error), true)
})

test("SDK authentication details are extracted from ConnectRPC metadata", () => {
  const error = Object.assign(new Error("[unauthenticated] Error"), {
    name: "ConnectError",
    code: 16,
    details: [
      {
        debug: {
          error: "ERROR_NOT_LOGGED_IN",
          details: {
            title: "Authentication error",
            detail: "If you are logged in, try logging out and back in.",
          },
        },
      },
    ],
  })

  assert.match(errorTextWithCauses(error), /ERROR_NOT_LOGGED_IN/)
  assert.match(errorTextWithCauses(error), /Authentication error/)
  assert.equal(isSdkAuthenticationError(error), true)
})
