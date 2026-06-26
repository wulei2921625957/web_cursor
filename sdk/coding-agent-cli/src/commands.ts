export type SlashCommandName =
  | "/compact"
  | "/exit"
  | "/help"
  | "/local"
  | "/model"
  | "/quit"
  | "/reset"
  | "/set_apiKey"

export type SlashCommand = {
  name: SlashCommandName
  summary: string
}

export const slashCommands: SlashCommand[] = [
  { name: "/help", summary: "查看可用命令" },
  { name: "/local", summary: "使用本地项目" },
  { name: "/model", summary: "切换模型" },
  { name: "/compact", summary: "压缩上下文" },
  { name: "/reset", summary: "重置会话" },
  { name: "/set_apiKey", summary: "设置密钥，--save 保存" },
  { name: "/exit", summary: "退出程序" },
  { name: "/quit", summary: "退出程序" },
]

const commandNames = new Map<string, SlashCommandName>(
  slashCommands.map((command) => [command.name.toLowerCase(), command.name])
)

export function getSlashCommand(input: string): SlashCommandName | undefined {
  const [command] = input.trim().split(/\s+/, 1)
  return commandNames.get(command.toLowerCase())
}

export function formatSlashCommandHelp() {
  return slashCommands
    .map((command) => `${command.name} - ${command.summary}`)
    .join(" ")
}

export function getSlashCommandItems(query: string) {
  const [normalizedQuery = ""] = query.trim().toLowerCase().split(/\s+/, 1)

  return slashCommands
    .filter((command) =>
      command.name.toLowerCase().startsWith(normalizedQuery || "/")
    )
    .map((command) => ({
      key: command.name,
      label: `${command.name}  ${command.summary}`,
      value: command.name,
    }))
}
