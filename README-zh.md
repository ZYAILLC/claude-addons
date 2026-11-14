[English](README.md) | 简体中文

# claude-addons

ZYAI 的 [Claude Code](https://claude.com/claude-code) 扩展，统一发布为一个插件市场。

## 已收录

| 名称 | 类型 | 作用 |
| --- | --- | --- |
| [quota-gauge](quota-gauge/README-zh.md) | mod | 输入框上方的环形额度表：5 小时和 7 天额度还剩多少、5 小时额度的重置倒计时，以及下次续费日期。 |

## 安装

先添加一次市场，然后就可以从中安装任意子项目：

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install <name>@claude-addons
```

在 Claude 桌面应用里 `/plugin` 不能用：点输入框旁的 **+**，选 **Plugins**，用 **Add marketplace** 添加 `ZYAILLC/claude-addons`，再点 **Add plugin**。

## 插件和 mod

每个子项目都是带 `.claude-plugin/plugin.json` 的 Claude Code 插件，安装方式相同。按作用分两类：

| 类型 | 作用 |
| --- | --- |
| **插件（plugin）** | 通过常规插件组件增加能力：skills、斜杠命令、子代理（subagents）、MCP 服务器和命令型 hooks。 |
| **mod** | 通过 hooks 模块（`hooks/register.tsx`）改变 Claude 自身的界面和行为：主题、面板、状态栏、提示栏、工具调用拦截等。 |

## 目录结构

```
claude-addons/
├── .claude-plugin/
│   └── marketplace.json      # 市场清单，登记所有子项目
├── quota-gauge/              # 每个子项目一个目录，插件和 mod 都放在这一层
├── README.md                 # 英文
├── README-zh.md              # 简体中文
└── LICENSE
```

## 新增子项目

1. 在顶层建 `<name>/` 目录。
   - **插件：** `<name>/.claude-plugin/plugin.json`，再按需放 `skills/`、`commands/`、`agents/`、`.mcp.json`、`hooks/hooks.json`。
   - **mod：** `<name>/.claude-plugin/plugin.json`、内容为 `{ "modules": ["./register.tsx"] }` 的 `<name>/hooks/hooks.json`，以及 `<name>/hooks/register.tsx`。用到 `$.state` 的，再加 `types/index.d.ts`，并在 `plugin.json` 里用 `"types"` 指向它。测试放在 `tests/*.test.tsx`。
2. 写好它自己的 `README.md` 和 `README-zh.md`。
3. 在 [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) 的 `plugins` 数组里登记，`source` 写 `./<name>`。
4. 在 `README.md` 和 `README-zh.md` 的[已收录](#已收录)里各加一行。
5. 面向用户的文案（命令描述、mod 界面文字）一律用英文，只有 README 提供中英两版。

本地开发和检查：

```bash
claude --plugin-dir <name>      # 在一个会话里加载它（或设置 CLAUDE_CODE_PLUGIN_DIRS）
claude plugin validate <name>   # 检查插件清单和 hooks 模块
claude plugin test <name>       # 运行 mod 的测试
claude plugin validate .        # 检查市场清单
```

## 许可证

[Apache-2.0](LICENSE)
