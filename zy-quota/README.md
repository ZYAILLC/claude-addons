English | [简体中文](README-zh.md)

# zy-quota

A Claude Code mod that keeps your subscription quota in view, in a band above the prompt:

- **Inner ring:** what is left of the 5-hour limit, with the time until it resets in the middle (`4:21` = 4 hours 21 minutes).
- **Outer ring:** what is left of the 7-day limit.
- **5H / 7D:** the same two figures as percentages left, colored green (75%+), yellow (50%+), orange (25%+) or red.
- **EXP:** the next renewal date of your subscription.

The desktop app draws the rings; the terminal, VS Code and mobile show the same figures as one line of text: `5H 98% · 7D 100% · EXP NOV 17`.

The gauge's text is always in English.

## Install

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install zy-quota@claude-addons
```

In the Claude desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `ZYAILLC/claude-addons`, then **Add plugin** and pick `zy-quota`.

## The quota pane

`/zy-quota` opens a **Quota** pane beside the chat: larger rings, when each limit resets, and a **Refresh** button that reads the account's figures at once. Minimized, the pane shrinks to the small gauge in a corner of the chat.

## Where the figures come from

- Each Claude reply reports the 5-hour and 7-day windows; the gauge updates when a window moves by a whole point.
- Every 5 minutes it also reads the account-wide figures that `/usage` shows, so usage from your other sessions is counted too.
- The renewal date is worked out from the day your subscription started, assuming it renews monthly.

It only works when you sign in with a Claude subscription. With an API key there are no rate-limit windows, and the gauge shows `--`.

## License

[Apache-2.0](../LICENSE)
