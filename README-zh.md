[English](README.md) | 简体中文

# claude-addons

ZYAI 的 [Claude Code](https://claude.com/claude-code) 扩展，统一发布为一个插件市场。

## 插件和 mod

这个市场里有两类扩展。两类都是带 `.claude-plugin/plugin.json` 的 Claude Code 插件，安装方式相同。

| 类型 | 目录 | 作用 |
| --- | --- | --- |
| **插件（plugin）** | `plugins/` | 通过常规插件组件增加能力：skills、斜杠命令、子代理（subagents）、MCP 服务器和命令型 hooks。 |
| **mod** | `mods/` | 通过 hooks 模块（`hooks/register.tsx`）改变 Claude 自身的界面和行为：主题、面板、状态栏、提示栏、工具调用拦截等。 |

## 安装

先添加一次市场，然后就可以从中安装任意插件或 mod：

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install <name>@claude-addons
```

## 已收录

### 插件

暂无。

### mod

暂无。

## 目录结构

```
claude-addons/
├── .claude-plugin/
│   └── marketplace.json      # 市场清单，登记所有插件和 mod
├── plugins/                  # 常规插件，每个一个子目录
├── mods/                     # mod，每个一个子目录
├── README.md                 # 英文
├── README-zh.md              # 简体中文
└── LICENSE
```

## 新增插件或 mod

1. 建目录。
   - **插件：** `plugins/<name>/.claude-plugin/plugin.json`，再按需放 `skills/`、`commands/`、`agents/`、`.mcp.json`、`hooks/hooks.json`。
   - **mod：** `mods/<name>/.claude-plugin/plugin.json`、内容为 `{ "modules": ["./register.tsx"] }` 的 `mods/<name>/hooks/hooks.json`，以及 `mods/<name>/hooks/register.tsx`。用到 `$.state` 的，再加 `types/index.d.ts`，并在 `plugin.json` 里用 `"types"` 指向它。
2. 在 [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) 的 `plugins` 数组里登记，`source` 写 `./plugins/<name>` 或 `./mods/<name>`。
3. 在 `README.md` 和 `README-zh.md` 的[已收录](#已收录)里各加一行。
4. 面向用户的文案（命令描述、mod 界面文字）默认用英文，并提供简体中文切换。

本地开发和检查：

```bash
claude --plugin-dir plugins/<name>     # 在一个会话里加载它（或设置 CLAUDE_CODE_PLUGIN_DIRS）
claude plugin validate plugins/<name>  # 检查插件清单
claude plugin test mods/<name>         # 运行 mod 的测试
claude plugin validate .               # 检查市场清单
```

## 许可证

[Apache-2.0](LICENSE)
