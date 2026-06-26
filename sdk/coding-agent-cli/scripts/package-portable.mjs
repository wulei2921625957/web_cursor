import { spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const target = parseTarget(process.argv.slice(2))
const targetPlatform = `${target.os}-${target.arch}`
const releaseRoot = join(root, "release")
const packageDirName = `${packageJson.name}-${packageJson.version}-${targetPlatform}`
const packageDir = join(releaseRoot, packageDirName)
const appDir = join(packageDir, "app")
const runtimeDir = join(packageDir, "runtime")
const binDir = join(packageDir, "bin")

if (!existsSync(join(root, "dist", "index.js"))) {
  throw new Error("dist/index.js is missing. Run npm run build first.")
}

rmSync(packageDir, { force: true, recursive: true })
mkdirSync(appDir, { recursive: true })
mkdirSync(runtimeDir, { recursive: true })
mkdirSync(binDir, { recursive: true })

copyDistFiles(join(root, "dist"), join(appDir, "dist"))
copyIfExists(join(root, "README.md"), join(appDir, "README.md"))
writeFileSync(
  join(appDir, "package.json"),
  JSON.stringify(createRuntimePackageJson(target), null, 2)
)

if (isHostTarget(target)) {
  if (!existsSync(join(root, "node_modules"))) {
    throw new Error("node_modules is missing. Install dependencies before packaging.")
  }

  cpSync(join(root, "node_modules"), join(appDir, "node_modules"), {
    dereference: true,
    recursive: true,
  })
  copyHostBun(target)
} else {
  installTargetDependencies(target)
  installTargetBun(target)
}

writeLaunchers(target)
writeInstallers(target)
writeQuickStart(target)
const archivePath = createArchive(target)

console.log(`Created ${archivePath}`)
console.log(`Run with: ${packageDirName}/bin/${target.os === "win32" ? "code-agent.cmd" : "code-agent"}`)
console.log(`Web UI: ${packageDirName}/bin/${target.os === "win32" ? "code-agent-ui.cmd" : "code-agent-ui"}`)

function parseTarget(argv) {
  const explicitTarget = readFlag(argv, "--target") ?? process.env.PORTABLE_TARGET
  const raw = explicitTarget ?? `${process.platform}-${process.arch}`
  const [os, arch] = raw.split("-")

  if (!os || !arch) {
    throw new Error(`Invalid target "${raw}". Expected format like win32-x64.`)
  }

  const normalized = normalizeTarget(os, arch)

  if (!isSupportedTarget(normalized)) {
    throw new Error(
      `Unsupported target "${raw}". Supported targets: darwin-arm64, darwin-x64, linux-arm64, linux-x64, win32-x64.`
    )
  }

  return normalized
}

function readFlag(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === name) {
      return argv[index + 1]
    }

    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1)
    }
  }

  return undefined
}

function normalizeTarget(os, arch) {
  return {
    os: os === "windows" ? "win32" : os,
    arch: arch === "amd64" ? "x64" : arch,
  }
}

function isSupportedTarget(target) {
  return [
    "darwin-arm64",
    "darwin-x64",
    "linux-arm64",
    "linux-x64",
    "win32-x64",
  ].includes(`${target.os}-${target.arch}`)
}

function isHostTarget(target) {
  return target.os === process.platform && target.arch === process.arch
}

function createRuntimePackageJson(target) {
  return {
    name: packageJson.name,
    version: packageJson.version,
    private: true,
    type: packageJson.type,
    dependencies: packageJson.dependencies,
    optionalDependencies: targetOptionalDependencies(target),
  }
}

function targetOptionalDependencies(target) {
  const cursorPlatform = cursorSdkPlatformPackage(target)
  const opentuiPlatform = opentuiPlatformPackage(target)

  return {
    [cursorPlatform]: readDependencyVersion("@cursor/sdk", cursorPlatform),
    [opentuiPlatform]: readDependencyVersion("@opentui/core", opentuiPlatform),
  }
}

function cursorSdkPlatformPackage(target) {
  return `@cursor/sdk-${target.os === "win32" ? "win32" : target.os}-${target.arch}`
}

function opentuiPlatformPackage(target) {
  return `@opentui/core-${target.os === "win32" ? "win32" : target.os}-${target.arch}`
}

function readDependencyVersion(parentPackageName, dependencyName) {
  const packagePath = join(root, "node_modules", parentPackageName, "package.json")

  if (existsSync(packagePath)) {
    const parent = JSON.parse(readFileSync(packagePath, "utf8"))
    const version = parent.optionalDependencies?.[dependencyName]

    if (version) {
      return version
    }
  }

  const installedPath = join(root, "node_modules", ...dependencyName.split("/"), "package.json")

  if (existsSync(installedPath)) {
    return JSON.parse(readFileSync(installedPath, "utf8")).version
  }

  throw new Error(`Cannot determine version for ${dependencyName}.`)
}

function installTargetDependencies(target) {
  run(
    "npm",
    [
      "install",
      "--omit=dev",
      "--include=optional",
      "--ignore-scripts",
      "--package-lock=false",
      "--no-audit",
      "--no-fund",
      `--os=${target.os}`,
      `--cpu=${target.arch}`,
    ],
    { cwd: appDir }
  )
}

function copyHostBun(target) {
  const bunPath = findExecutable("bun")
  const bundledBun = join(runtimeDir, target.os === "win32" ? "bun.exe" : "bun")
  cpSync(realpathSync(bunPath), bundledBun)
}

function installTargetBun(target) {
  if (target.os !== "win32" || target.arch !== "x64") {
    throw new Error(
      `Cross-target Bun runtime download is only implemented for win32-x64. Run this script on ${targetPlatform} for this target.`
    )
  }

  const version = getHostBunVersion()
  const cacheDir = join(root, ".cache", "portable")
  const zipPath = join(cacheDir, `bun-v${version}-windows-x64.zip`)
  const unpackDir = join(cacheDir, `bun-v${version}-windows-x64`)

  mkdirSync(cacheDir, { recursive: true })

  if (!existsSync(zipPath)) {
    const url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-windows-x64.zip`
    run("curl", ["-L", "--fail", "-o", zipPath, url])
  }

  rmSync(unpackDir, { force: true, recursive: true })
  mkdirSync(unpackDir, { recursive: true })
  run("unzip", ["-q", zipPath, "-d", unpackDir])

  const bunExe = join(unpackDir, "bun-windows-x64", "bun.exe")

  if (!existsSync(bunExe)) {
    throw new Error(`Downloaded Bun archive did not contain ${bunExe}.`)
  }

  cpSync(bunExe, join(runtimeDir, "bun.exe"))
}

function getHostBunVersion() {
  const result = run("bun", ["--version"], { capture: true })
  return result.stdout.trim()
}

function writeLaunchers(target) {
  if (target.os === "win32") {
    writeFileSync(
      join(packageDir, "code-agent.cmd"),
      [
        "@echo off",
        '"%~dp0bin\\code-agent.cmd" %*',
        "",
      ].join("\r\n")
    )

    writeFileSync(
      join(packageDir, "code-agent-ui.cmd"),
      [
        "@echo off",
        '"%~dp0bin\\code-agent-ui.cmd" %*',
        "",
      ].join("\r\n")
    )

    writeFileSync(
      join(binDir, "code-agent.cmd"),
      [
        "@echo off",
        "set SCRIPT_DIR=%~dp0",
        'set APP_DIR=%SCRIPT_DIR%..\\app',
        'set BUN_BIN=%SCRIPT_DIR%..\\runtime\\bun.exe',
        '"%BUN_BIN%" "%APP_DIR%\\dist\\index.js" %*',
        "",
      ].join("\r\n")
    )

    writeFileSync(
      join(binDir, "code-agent-ui.cmd"),
      [
        "@echo off",
        "set SCRIPT_DIR=%~dp0",
        'set APP_DIR=%SCRIPT_DIR%..\\app',
        'set BUN_BIN=%SCRIPT_DIR%..\\runtime\\bun.exe',
        '"%BUN_BIN%" "%APP_DIR%\\dist\\ui.js" %*',
        "",
      ].join("\r\n")
    )

    writeFileSync(
      join(binDir, "code-agent.ps1"),
      [
        "$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path",
        "$AppDir = Join-Path $ScriptDir '..\\app'",
        "$BunBin = Join-Path $ScriptDir '..\\runtime\\bun.exe'",
        "& $BunBin (Join-Path $AppDir 'dist\\index.js') @args",
        "",
      ].join("\r\n")
    )

    writeFileSync(
      join(binDir, "code-agent-ui.ps1"),
      [
        "$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path",
        "$AppDir = Join-Path $ScriptDir '..\\app'",
        "$BunBin = Join-Path $ScriptDir '..\\runtime\\bun.exe'",
        "& $BunBin (Join-Path $AppDir 'dist\\ui.js') @args",
        "",
      ].join("\r\n")
    )
    return
  }

  writeFileSync(
    join(binDir, "code-agent"),
    [
      "#!/usr/bin/env sh",
      "set -eu",
      'SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)',
      'APP_DIR="$SCRIPT_DIR/../app"',
      'BUN_BIN="$SCRIPT_DIR/../runtime/bun"',
      'exec "$BUN_BIN" "$APP_DIR/dist/index.js" "$@"',
      "",
    ].join("\n"),
    { mode: 0o755 }
  )

  writeFileSync(
    join(binDir, "code-agent-ui"),
    [
      "#!/usr/bin/env sh",
      "set -eu",
      'SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)',
      'APP_DIR="$SCRIPT_DIR/../app"',
      'BUN_BIN="$SCRIPT_DIR/../runtime/bun"',
      'exec "$BUN_BIN" "$APP_DIR/dist/ui.js" "$@"',
      "",
    ].join("\n"),
    { mode: 0o755 }
  )
}

function writeInstallers(target) {
  if (target.os !== "win32") {
    return
  }

  writeFileSync(
    join(packageDir, "install.cmd"),
    [
      "@echo off",
      "setlocal",
      'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"',
      "if errorlevel 1 (",
      "  echo.",
      "  echo Install failed.",
      "  pause",
      "  exit /b 1",
      ")",
      "echo.",
      "echo Install complete. Open a new PowerShell window and run code-agent.",
      "pause",
      "",
    ].join("\r\n")
  )

  writeFileSync(
    join(packageDir, "install.ps1"),
    [
      '$ErrorActionPreference = "Stop"',
      '$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path',
      '$InstallDir = Join-Path $env:LOCALAPPDATA "coding-agent-cli"',
      '$ShimDir = Join-Path $env:LOCALAPPDATA "Microsoft\\WindowsApps"',
      "",
      'Write-Host "Installing Coding Agent CLI..."',
      'Write-Host "Source: $SourceRoot"',
      'Write-Host "Target: $InstallDir"',
      "",
      '$sourcePath = (Resolve-Path $SourceRoot).Path',
      '$existingInstall = if (Test-Path $InstallDir) { (Resolve-Path $InstallDir).Path } else { $null }',
      'if ($existingInstall -ne $sourcePath) {',
      "  if (Test-Path $InstallDir) {",
      "    Remove-Item -Recurse -Force $InstallDir",
      "  }",
      "  New-Item -ItemType Directory -Force $InstallDir | Out-Null",
      '  Copy-Item -Path (Join-Path $SourceRoot "*") -Destination $InstallDir -Recurse -Force',
      "}",
      "",
      "New-Item -ItemType Directory -Force $ShimDir | Out-Null",
      '$ShimPath = Join-Path $ShimDir "code-agent.cmd"',
      '$ShimContent = "@echo off`r`n""%LOCALAPPDATA%\\coding-agent-cli\\bin\\code-agent.cmd"" %*`r`n"',
      'Set-Content -Path $ShimPath -Value $ShimContent -Encoding ASCII',
      '$UiShimPath = Join-Path $ShimDir "code-agent-ui.cmd"',
      '$UiShimContent = "@echo off`r`n""%LOCALAPPDATA%\\coding-agent-cli\\bin\\code-agent-ui.cmd"" %*`r`n"',
      'Set-Content -Path $UiShimPath -Value $UiShimContent -Encoding ASCII',
      "",
      '$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")',
      'if ($null -eq $UserPath) { $UserPath = "" }',
      '$PathItems = $UserPath -split ";" | Where-Object { $_ }',
      'if ($PathItems -notcontains $ShimDir) {',
      '  $NextPath = (($PathItems + $ShimDir) -join ";")',
      '  [Environment]::SetEnvironmentVariable("Path", $NextPath, "User")',
      '  Write-Host "Added to user PATH: $ShimDir"',
      "}",
      "",
      '$ExistingKey = [Environment]::GetEnvironmentVariable("CURSOR_API_KEY", "User")',
      'if (-not $ExistingKey -and -not $env:CURSOR_API_KEY) {',
      '  $SetKey = Read-Host "Save CURSOR_API_KEY for future PowerShell windows? (y/N)"',
      '  if ($SetKey -match "^[Yy]") {',
      '    $SecureKey = Read-Host "Paste CURSOR_API_KEY" -AsSecureString',
      '    $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureKey)',
      "    try {",
      '      $PlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)',
      "    } finally {",
      '      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)',
      "    }",
      '    if ($PlainKey) {',
      '      [Environment]::SetEnvironmentVariable("CURSOR_API_KEY", $PlainKey, "User")',
      '      Write-Host "Saved CURSOR_API_KEY to user environment."',
      "    }",
      "  }",
      "}",
      "",
      'Write-Host ""',
      'Write-Host "Done."',
      'Write-Host "Open a new PowerShell window, then run:"',
      'Write-Host "  cd C:\\path\\to\\project"',
      'Write-Host "  code-agent ""Explain this project"""',
      'Write-Host "  code-agent-ui"',
      "",
    ].join("\r\n")
  )

  writeFileSync(
    join(packageDir, "uninstall.cmd"),
    [
      "@echo off",
      "setlocal",
      'powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"',
      "pause",
      "",
    ].join("\r\n")
  )

  writeFileSync(
    join(packageDir, "uninstall.ps1"),
    [
      '$ErrorActionPreference = "Stop"',
      '$InstallDir = Join-Path $env:LOCALAPPDATA "coding-agent-cli"',
      '$ShimPath = Join-Path $env:LOCALAPPDATA "Microsoft\\WindowsApps\\code-agent.cmd"',
      '$UiShimPath = Join-Path $env:LOCALAPPDATA "Microsoft\\WindowsApps\\code-agent-ui.cmd"',
      "if (Test-Path $ShimPath) { Remove-Item -Force $ShimPath }",
      "if (Test-Path $UiShimPath) { Remove-Item -Force $UiShimPath }",
      "if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }",
      'Write-Host "Coding Agent CLI removed. CURSOR_API_KEY was not deleted."',
      "",
    ].join("\r\n")
  )
}

function writeQuickStart(target) {
  if (target.os !== "win32") {
    return
  }

  writeFileSync(
    join(packageDir, "WINDOWS-QUICK-START.txt"),
    [
      "Coding Agent CLI for Windows",
      "",
      "Recommended install:",
      "1. Extract this zip.",
      "2. Double-click install.cmd.",
      "3. If prompted, paste your CURSOR_API_KEY.",
      "4. Open a new PowerShell window.",
      "5. Run: cd C:\\path\\to\\project",
      '6. Run: code-agent "Explain this project"',
      "7. Or run: code-agent-ui",
      "",
      "No-install usage:",
      '1. Set API key: $env:CURSOR_API_KEY = "crsr_..."',
      "2. Run: cd C:\\path\\to\\project",
      '3. Run: C:\\path\\to\\coding-agent-cli-0.1.0-win32-x64\\code-agent.cmd "Explain this project"',
      '4. Or run: C:\\path\\to\\coding-agent-cli-0.1.0-win32-x64\\code-agent-ui.cmd',
      "",
      "Uninstall:",
      "Double-click uninstall.cmd.",
      "",
      "Reset API key inside the TUI:",
      "Run: code-agent",
      "Then type: /set_apiKey --save",
      "Paste the key on the next input line and press Enter.",
      "",
    ].join("\r\n")
  )
}

function createArchive(target) {
  if (target.os === "win32") {
    const archiveName = `${packageDirName}.zip`
    const archivePath = join(releaseRoot, archiveName)
    rmSync(archivePath, { force: true })
    run("zip", ["-qry", archiveName, packageDirName], { cwd: releaseRoot })
    return archivePath
  }

  const archiveName = `${packageDirName}.tar.gz`
  const archivePath = join(releaseRoot, archiveName)
  rmSync(archivePath, { force: true })
  run("tar", ["-czf", archiveName, packageDirName], { cwd: releaseRoot })
  return archivePath
}

function findExecutable(name) {
  const result = run(
    process.platform === "win32" ? "where" : "command",
    process.platform === "win32" ? [name] : ["-v", name],
    { capture: true, shell: process.platform !== "win32" }
  )

  return result.stdout.trim().split(/\r?\n/)[0]
}

function copyIfExists(from, to) {
  if (existsSync(from)) {
    cpSync(from, to)
  }
}

function copyDistFiles(from, to) {
  cpSync(from, to, {
    filter: (source) =>
      source === from || source.endsWith(".js") || !basename(source).includes("."),
    recursive: true,
  })
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: options.shell,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  })

  if (result.status !== 0) {
    const detail = options.capture ? result.stderr || result.stdout : ""
    throw new Error(`${command} ${args.join(" ")} failed.${detail ? `\n${detail}` : ""}`)
  }

  return result
}
