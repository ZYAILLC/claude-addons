English | [简体中文](README-zh.md)

# claude-addons

ZYAI's extensions for [Claude Code](https://claude.com/claude-code), published as one plugin marketplace.

## Available

| Name | Kind | What it does |
| --- | --- | --- |
| [zy-quota](zy-quota/) | Mod | A ring gauge above the prompt: what is left of your 5-hour and 7-day limits, the time until the 5-hour reset, and the next renewal date. |
| [zy-themes](zy-themes/) | Mod | Themes behind the chat in the desktop app: six painted backdrops (three animated) or your own picture, picked from a 🎨 button or `/zy-theme`. |

## Install

Add the marketplace once, then install anything from it:

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install <name>@claude-addons
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `ZYAILLC/claude-addons`, then **Add plugin**.

## Plugins and mods

Each sub-project is a Claude Code plugin with its own `.claude-plugin/plugin.json`, so all of them install the same way. They come in two kinds:

| Kind | What it does |
| --- | --- |
| **Plugin** | Adds capabilities through the regular plugin parts: skills, slash commands, subagents, MCP servers and command hooks. |
| **Mod** | Changes Claude's own interface and behaviour through a hooks module (`hooks/register.tsx`): themes, panels, status lines, banners, tool-call interception and so on. |

## Repository layout

```
claude-addons/
├── .claude-plugin/
│   └── marketplace.json      # Marketplace manifest, lists every sub-project
├── zy-quota/                 # One folder per sub-project, plugin or mod
├── zy-themes/
├── README.md                 # English
├── README-zh.md              # Simplified Chinese
└── LICENSE
```

## Adding a sub-project

1. Create `<name>/` at the top level.
   - **Plugin:** `<name>/.claude-plugin/plugin.json`, plus whatever it needs: `skills/`, `commands/`, `agents/`, `.mcp.json`, `hooks/hooks.json`.
   - **Mod:** `<name>/.claude-plugin/plugin.json`, `<name>/hooks/hooks.json` containing `{ "modules": ["./register.tsx"] }`, and `<name>/hooks/register.tsx`. If the mod uses `$.state`, add `types/index.d.ts` and point to it with `"types"` in `plugin.json`. Tests go in `tests/*.test.tsx`.
2. Give it a `README.md` and a `README-zh.md`.
3. Register it in the `plugins` array of [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), with `source` set to `./<name>`.
4. Add a row for it under [Available](#available) in both `README.md` and `README-zh.md`.
5. Write user-facing text (command descriptions, mod UI) in English by default. A pane or panel may offer a switch to Simplified Chinese; the READMEs always come in both languages.

To develop and check it locally:

```bash
claude --plugin-dir <name>      # load it for one session (or set CLAUDE_CODE_PLUGIN_DIRS)
claude plugin validate <name>   # check the manifest and hooks module
claude plugin test <name>       # run a mod's tests
claude plugin validate .        # check the marketplace manifest
```

## License

[Apache-2.0](LICENSE)
