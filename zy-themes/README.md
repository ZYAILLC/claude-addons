English | [简体中文](README-zh.md)

# zy-themes

A Claude Code mod that puts a theme behind the chat in the Claude desktop app: six built-in paintings, three of them animated, or a picture of your own. The painting sits behind the chat; the desktop app frosts its panels over the animated ones so text stays readable. Each built-in theme also recolors the window (sidebar, chat, cards, code) in its painting's colors.

| Theme | Window | Backdrop |
| --- | --- | --- |
| `sakura` | Light | Sakura Dawn: cherry blossoms over a misty lake at a pastel dawn |
| `inkwash` | Light | Ink Mountains: misty ink-wash mountains on rice paper at sunset |
| `petals` | Light | Petal Breeze: a cherry tree on a spring hill, petals drifting down (animated) |
| `moonlit` | Dark | Moonlit Lake: a full moon over a still mountain lake |
| `fireflies` | Dark | Firefly Forest: fireflies drifting through a moonlit clearing (animated) |
| `starlit` | Dark | Starlit Sea: the Milky Way over a calm sea, twinkling stars and shooting stars (animated) |

The paintings were made for this mod with an image model. In the animated themes the painting drifts slowly and a light layer moves on top.

## Install

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install zy-themes@claude-addons
```

In the Claude desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `ZYAILLC/claude-addons`, then **Add plugin** and pick `zy-themes`.

## Use

| Command | What it does |
| --- | --- |
| `/zy-theme` | Opens the **Themes** pane beside the chat (see below). |
| `/zy-theme list` | Names every theme and your pictures. |
| `/zy-theme <name>` | Applies a theme to this project. Other open sessions of the project take it at their next turn. |
| `/zy-theme <name> session` | Applies it to this session only. |
| `/zy-theme <name> all` | Applies it to every project that has no theme of its own. |
| `/zy-theme image <path>` | Uses a picture of your own (JPEG or PNG; on macOS also HEIC and others) as the backdrop. Add `session` or `all` as above. |
| `/zy-theme remove <name>` | Forgets one of your pictures. |
| `/zy-theme off` | Clears the theme for this project. `off session` and `off all` work as above. |

A session shows its own choice first, then its project's, then the one for every project.

## The Themes pane

In the desktop app a **🎨** button above the prompt opens the pane; with [zy-quota](../zy-quota/) installed it sits at the end of the quota row. Turn it off with the plugin's **Theme button** setting.

- **📂 Open image…** opens the system's Open window (macOS). The picture you choose becomes the backdrop at once.
- **↺ Reset** brings back the original look.
- Below, a preview of every built-in painting and every picture you added. Press a name to use it; ▶ marks an animated one.

A choice made in the pane applies to every project. For one project or one session alone, use the commands above.

The pane is in English; its **中文** button switches it, and the theme button, to Simplified Chinese and is remembered. Command replies stay in English.

## Your own pictures

A backdrop picture has to sit inside the mod's folder, at most 1 MiB and 4096 px a side. `/zy-theme image` copies your picture there:

- On macOS it is scaled to 2560 px and saved as a JPEG, so any size works.
- Elsewhere a JPEG or PNG under 1 MiB is copied as it is.

The original path is remembered: when an update of the mod replaces its folder, the picture is copied again from where it came. Keep what matters in the middle of the picture, since the window crops its edges. A picture of your own keeps the app's own colors.

## What it needs

- The Claude desktop app, up to date. Themes are drawn in the desktop and mobile apps only; in a terminal or an editor the commands still work and your choice is kept.
- An older Claude Code refuses these themes; the command then asks you to update.
- Some versions of the desktop app paint a theme's colors but not yet its backdrop, so the window takes the painting's colors with no picture behind the chat. The picture appears once the app draws backdrops, with no change to the mod.
- If the reply says the window does not draw themes, or nothing changes at all: update the desktop app (**Claude > Check for Updates…**), quit and reopen it, then start a new local session in the Code tab. A session that was open before the update keeps drawing the app's own look.
- With reduced motion turned on in your system, the animated scenes stand still.

## What it keeps

Your choice per session, per project (by its folder) and for every project, and the list of your pictures, in Claude Code's store for this mod on your machine. It sends nothing anywhere.

## License

[Apache-2.0](../LICENSE)
