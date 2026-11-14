[English](README.md) | 简体中文

# quota-gauge

一个 Claude Code mod，在输入框上方的提示栏里显示订阅额度：

- **内圈：** 5 小时额度还剩多少，中间是距离重置的时间（`4:21` 表示还有 4 小时 21 分钟）。
- **外圈：** 7 天额度还剩多少。
- **5H / 7D：** 这两项额度的剩余百分比，按剩余量显示绿色（75% 以上）、黄色（50% 以上）、橙色（25% 以上）或红色。
- **EXP：** 订阅下次续费的日期。

桌面应用里显示圆环；终端、VS Code 和手机上用一行文字显示同样的数字：`5H 98% · 7D 100% · EXP NOV 17`。

界面文字固定为英文，不随语言设置变化。

## 安装

```
/plugin marketplace add ZYAILLC/claude-addons
/plugin install quota-gauge@claude-addons
```

在 Claude 桌面应用里：点输入框旁的 **+**，选 **Plugins**，用 **Add marketplace** 添加 `ZYAILLC/claude-addons`，再点 **Add plugin**，选 `quota-gauge`。

## 数据来源

- Claude 每次回复都会带上 5 小时和 7 天两个额度窗口的用量，用量变化满 1 个百分点时额度表随之更新。
- 另外每 5 分钟读取一次账户整体用量（和 `/usage` 显示的一样），其他会话用掉的额度也会算进来。
- 续费日期按订阅开始的日子推算，假定按月续费。

只有用 Claude 订阅登录时才有数据。用 API key 时没有额度窗口，额度表显示 `--`。

## 许可证

[Apache-2.0](../LICENSE)
