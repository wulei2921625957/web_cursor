import { codexAppBody } from "./body.js"
import { codexAppClientScript } from "./client-script.js"
import { codexAppStyles } from "./styles.js"

export function renderCodexAppHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Coding Agent UI</title>
  <style>
${codexAppStyles}
  </style>
</head>
<body>
${codexAppBody}
  <script>
${codexAppClientScript}
  </script>
</body>
</html>`
}
