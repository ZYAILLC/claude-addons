English | [简体中文](README-zh.md)

# claude-addons

ZYAI's extensions for [Claude Code](https://claude.com/claude-code), published as one plugin marketplace.

## Plugins and mods

This marketplace holds two kinds of extensions. Both are Claude Code plugins with a `.claude-plugin/plugin.json`, so you install them the same way.

| Kind | Lives in | What it does |
| --- | --- | --- |
| **Plugin** | `plugins/` | Adds capabilities through the regular plugin parts: skills, slash commands, subagents, MCP servers and command hooks. |
| **Mod** | `mods/` | Changes Claude's own interface and behaviour through a hooks module (`hooks/register.tsx`): themes, panels, status lines, banners, tool-call interception and so on. |

## Install

Add the marketplace once, then install any plugin or mod from it:

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install <name>@claude-addons
```

## Available

### Plugins

None yet.

### Mods

None yet.

## Repository layout

```
claude-addons/
├── .claude-plugin/
│   └── marketplace.json      # Marketplace manifest, lists every plugin and mod
├── plugins/                  # Regular plugins, one folder each
├── mods/                     # Mods, one folder each
├── README.md                 # English
├── README-zh.md              # Simplified Chinese
└── LICENSE
```

## Adding a plugin or mod

1. Create the folder.
   - **Plugin:** `plugins/<name>/.claude-plugin/plugin.json`, plus whatever it needs: `skills/`, `commands/`, `agents/`, `.mcp.json`, `hooks/hooks.json`.
   - **Mod:** `mods/<name>/.claude-plugin/plugin.json`, `mods/<name>/hooks/hooks.json` containing `{ "modules": ["./register.tsx"] }`, and `mods/<name>/hooks/register.tsx`. If the mod uses `$.state`, add `types/index.d.ts` and point to it with `"types"` in `plugin.json`.
2. Register it in the `plugins` array of [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), with `source` set to `./plugins/<name>` or `./mods/<name>`.
3. Add a line for it under [Available](#available) in both `README.md` and `README-zh.md`.
4. Write user-facing text (command descriptions, mod UI) in English by default, with a Simplified Chinese option.

To develop and check it locally:

```bash
claude --plugin-dir plugins/<name>     # load it for one session (or set CLAUDE_CODE_PLUGIN_DIRS)
claude plugin validate plugins/<name>  # check the manifest
claude plugin test mods/<name>         # run a mod's tests
claude plugin validate .               # check the marketplace manifest
```

## License

[Apache-2.0](LICENSE)
