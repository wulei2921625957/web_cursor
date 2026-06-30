import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import assert from "node:assert/strict"

import {
  getExtensionInventory,
  loadExtensionRuntime,
} from "../src/extensions.js"

test("extension runtime implicitly activates matching skills", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "extensions-"))
  const skillDir = path.join(workspace, ".agents", "skills", "ts-doc")
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      "name: ts-doc",
      "description: Write TypeScript documentation for public APIs",
      "---",
      "Always document exported TypeScript functions.",
    ].join("\n")
  )

  const runtime = loadExtensionRuntime(
    workspace,
    "Please write documentation for these TypeScript APIs."
  )

  assert.match(runtime.instructions, /Active skill \$ts-doc/)
  assert.match(runtime.instructions, /Always document exported TypeScript functions/)
})

test("disabled skills stay out of extension runtime instructions", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "extensions-"))
  const skillDir = path.join(workspace, ".agents", "skills", "ts-doc")
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      "name: ts-doc",
      "description: Write TypeScript documentation",
      "---",
      "Skill body should be hidden.",
    ].join("\n")
  )
  mkdirSync(path.join(workspace, ".coding-agent"), { recursive: true })
  writeFileSync(
    path.join(workspace, ".coding-agent", "extensions.json"),
    JSON.stringify({ disabledSkills: ["ts-doc"] })
  )

  const runtime = loadExtensionRuntime(workspace, "$ts-doc please help")
  const inventory = getExtensionInventory(workspace)

  assert.doesNotMatch(runtime.instructions, /Skill body should be hidden/)
  assert.equal(inventory.skills.find((item) => item.label === "ts-doc")?.enabled, false)
})

test("extension runtime loads codex plugin manifests and honors disabled plugin/MCP", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "extensions-"))
  const pluginDir = path.join(workspace, ".coding-agent", "plugins", "browser")
  mkdirSync(path.join(pluginDir, ".codex-plugin"), { recursive: true })
  writeFileSync(
    path.join(pluginDir, ".codex-plugin", "plugin.json"),
    JSON.stringify({
      id: "browser-tools",
      description: "Browser MCP tools",
      dependencies: {
        "@playwright/mcp": "^1.0.0",
      },
      mcpServers: {
        browser: { command: "node", args: ["server.js"] },
      },
      version: "0.2.0",
    })
  )

  assert.ok(loadExtensionRuntime(workspace, "inspect the browser").mcpServers.browser)
  assert.match(
    getExtensionInventory(workspace).plugins.find((item) => item.label === "browser-tools")
      ?.source ?? "",
    /v0\.2\.0 · MCP 1 · deps @playwright\/mcp\@\^1\.0\.0/
  )

  writeFileSync(
    path.join(workspace, ".coding-agent", "extensions.json"),
    JSON.stringify({ disabledPlugins: ["browser-tools"] })
  )
  assert.equal(loadExtensionRuntime(workspace, "inspect").mcpServers.browser, undefined)
  assert.equal(
    getExtensionInventory(workspace).plugins.find((item) => item.label === "browser-tools")
      ?.enabled,
    false
  )

  writeFileSync(
    path.join(workspace, ".coding-agent", "extensions.json"),
    JSON.stringify({ disabledMcpServers: ["browser"] })
  )
  assert.equal(loadExtensionRuntime(workspace, "inspect").mcpServers.browser, undefined)
  assert.equal(
    getExtensionInventory(workspace).mcpServers.find((item) => item.label === "browser")
      ?.enabled,
    false
  )
})

test("extension runtime renders MCP tool policies and exposes inventory summaries", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "extensions-"))
  mkdirSync(path.join(workspace, ".coding-agent"), { recursive: true })
  writeFileSync(
    path.join(workspace, ".coding-agent", "extensions.json"),
    JSON.stringify({
      mcpServers: {
        playwright: { command: "node", args: ["server.js"] },
      },
      mcpPolicies: {
        playwright: {
          allow: ["browser_snapshot"],
          prompt: ["browser_click"],
          deny: ["browser_install"],
          tools: {
            browser_close: "deny",
          },
        },
      },
    })
  )

  const runtime = loadExtensionRuntime(workspace, "inspect the page")
  const inventory = getExtensionInventory(workspace)
  const playwright = inventory.mcpServers.find((item) => item.label === "playwright")

  assert.ok(runtime.mcpServers.playwright)
  assert.match(runtime.instructions, /MCP tool policies/)
  assert.match(runtime.instructions, /allow: browser_snapshot/)
  assert.match(runtime.instructions, /prompt: browser_click/)
  assert.match(runtime.instructions, /deny: browser_close, browser_install/)
  assert.equal(runtime.mcpPolicies[0]?.defaultMode, "deny")
  assert.match(playwright?.policySummary ?? "", /allow 1/)
  assert.match(playwright?.policySummary ?? "", /prompt 1/)
  assert.match(playwright?.policySummary ?? "", /deny 2/)
})

test("legacy MCP deny policy disables the server", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "extensions-"))
  mkdirSync(path.join(workspace, ".coding-agent"), { recursive: true })
  writeFileSync(
    path.join(workspace, ".coding-agent", "extensions.json"),
    JSON.stringify({
      mcpServers: {
        browser: { command: "node", args: ["server.js"] },
      },
      mcpPolicies: {
        browser: "deny",
      },
    })
  )

  const runtime = loadExtensionRuntime(workspace, "inspect the browser")
  const inventory = getExtensionInventory(workspace)

  assert.equal(runtime.mcpServers.browser, undefined)
  assert.equal(inventory.mcpServers.find((item) => item.label === "browser")?.enabled, false)
  assert.equal(
    inventory.mcpServers.find((item) => item.label === "browser")?.policySummary,
    "策略：server deny"
  )
})

test("disabled hooks stay visible in inventory but do not enter runtime", () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), "extensions-"))
  const configFile = path.join(workspace, ".coding-agent", "extensions.json")
  mkdirSync(path.dirname(configFile), { recursive: true })
  writeFileSync(
    configFile,
    JSON.stringify({
      hooks: {
        PreRun: {
          command: "echo pre",
          timeout: 5,
        },
      },
    })
  )

  const hookId = getExtensionInventory(workspace).hooks[0]?.label
  assert.ok(hookId)

  writeFileSync(
    configFile,
    JSON.stringify({
      disabledHooks: [hookId],
      hooks: {
        PreRun: {
          command: "echo pre",
          timeout: 5,
        },
      },
    })
  )

  const runtime = loadExtensionRuntime(workspace, "run")
  const inventory = getExtensionInventory(workspace)

  assert.equal(runtime.hooks.length, 0)
  assert.equal(inventory.hooks[0]?.enabled, false)
  assert.equal(inventory.hooks[0]?.displayName, "PreRun")
})
