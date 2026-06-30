import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import test from "node:test"
import assert from "node:assert/strict"

import {
  collectBrowserResourceChecks,
  normalizeBrowserInspectionUrl,
  resolveBrowserInspectionPolicy,
  summarizeBrowserHtml,
} from "../src/browser-inspection.js"

test("browser inspection policy allows localhost by default", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "browser-policy-"))
  const url = normalizeBrowserInspectionUrl("localhost:3000/app", workspace)
  const policy = resolveBrowserInspectionPolicy(url, workspace)

  assert.equal(url.href, "http://localhost:3000/app")
  assert.equal(policy.allowed, true)
  assert.equal(policy.kind, "local")
})

test("browser inspection policy blocks public URLs unless allowed", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "browser-policy-"))
  const publicUrl = normalizeBrowserInspectionUrl("example.com", workspace)

  assert.equal(resolveBrowserInspectionPolicy(publicUrl, workspace).allowed, false)

  mkdirSync(path.join(workspace, ".coding-agent"), { recursive: true })
  writeFileSync(
    path.join(workspace, ".coding-agent", "extensions.json"),
    JSON.stringify({ browser: { allow: ["https://example.com/*"] } })
  )

  assert.equal(resolveBrowserInspectionPolicy(publicUrl, workspace).allowed, true)
})

test("browser inspection policy only allows workspace file URLs", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "browser-policy-"))
  const inside = path.join(workspace, "index.html")
  const outside = path.join(os.tmpdir(), `outside-${Date.now()}.html`)

  assert.equal(
    resolveBrowserInspectionPolicy(pathToFileURL(inside), workspace).allowed,
    true
  )
  assert.equal(
    resolveBrowserInspectionPolicy(pathToFileURL(outside), workspace).allowed,
    false
  )
})

test("browser inspection DOM summary extracts page facts", () => {
  const summary = summarizeBrowserHtml(
    `
      <html>
        <head>
          <title>Local App</title>
          <meta name="description" content="A local app page">
          <link rel="stylesheet" href="/app.css">
        </head>
        <body>
          <h1>Dashboard</h1>
          <h2>Recent Runs</h2>
          <a href="/runs">Runs</a>
          <img src="/shot.png" alt="Screenshot">
          <script src="/app.js"></script>
        </body>
      </html>
    `,
    new URL("http://localhost:3000/")
  )

  assert.equal(summary.title, "Local App")
  assert.equal(summary.description, "A local app page")
  assert.deepEqual(summary.headings, ["Dashboard", "Recent Runs"])
  assert.equal(summary.links[0]?.url, "http://localhost:3000/runs")
  assert.equal(summary.images[0]?.label, "Screenshot")
  assert.equal(summary.scripts[0]?.url, "http://localhost:3000/app.js")
  assert.equal(summary.stylesheets[0]?.url, "http://localhost:3000/app.css")
})

test("browser inspection resource checks summarize workspace file resources", async () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "browser-policy-"))
  writeFileSync(path.join(workspace, "app.js"), "console.log('ok')\n")

  const summary = summarizeBrowserHtml(
    `<html><head><script src="./app.js"></script><link rel="stylesheet" href="./missing.css"></head></html>`,
    pathToFileURL(path.join(workspace, "index.html"))
  )
  const checks = await collectBrowserResourceChecks(
    summary,
    pathToFileURL(path.join(workspace, "index.html")),
    workspace
  )

  assert.equal(checks.find((check) => check.kind === "script")?.type, "ok")
  assert.equal(checks.find((check) => check.kind === "script")?.status, 200)
  assert.equal(checks.find((check) => check.kind === "stylesheet")?.type, "file")
})
