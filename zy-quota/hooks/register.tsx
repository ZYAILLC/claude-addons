import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Account, Quota } from '../types'

const limits = atom({ plugin: 'zy-quota', key: 'limits' } as const, [] as Quota[])
// Ticks every 30s so the countdown in the middle moves without a new reply.
const now = atom({ plugin: 'zy-quota', key: 'now' } as const, 0)
// When the account-wide figures were last read; 0 before the first read.
const pulledAt = atom({ plugin: 'zy-quota', key: 'pulledAt' } as const, 0)
const account = atom({ plugin: 'zy-quota', key: 'account' } as const, {
  checked: false,
  renewsAt: null,
} as Account)

const API = 'https://api.anthropic.com/api/oauth'
// The account-wide figures, the same ones /usage reads; each reply's own reading lands in between.
const PULL_EVERY = 5 * 60_000
const COMMAND = 'zy-quota'
const PANE = 'zy-quota'
const TICK_EVERY = 30_000

const RING = 26
const OUTER_R = 11.5
const INNER_R = 8
const STROKE = 2.2
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const WIDTH = 248

const pick = (list: Quota[], kind: string) => list.find(q => q.kind === kind)

const left = (q: Quota | undefined) => (q === undefined ? undefined : Math.min(100, Math.max(0, 100 - q.percentUsed)))

// Colored by what is left: 75%+ green, 50%+ yellow, 25%+ orange, below that red.
const tone = (rest: number | undefined) =>
  rest === undefined ? 'mute' : rest >= 75 ? 'ok' : rest >= 50 ? 'mid' : rest >= 25 ? 'low' : 'bad'

type Left = { h: number; m: number }

const remaining = (iso: string | undefined, t: number): Left | undefined => {
  if (iso === undefined || t === 0) return undefined
  const minutes = Math.ceil(Math.max(0, Date.parse(iso) - t) / 60000)
  return { h: Math.floor(minutes / 60), m: minutes % 60 }
}

const clockText = (r: Left | undefined) => (r === undefined ? '--' : `${r.h}:${String(r.m).padStart(2, '0')}`)

const pct = (rest: number | undefined) => (rest === undefined ? '--' : `${Math.round(rest)}%`)

// The profile has no end date: a monthly subscription renews on the day of the month it began.
const nextRenewal = (createdIso: string, t: number): string | null => {
  const created = new Date(createdIso)
  if (Number.isNaN(created.getTime())) return null
  const day = created.getDate()
  for (let k = 1; k < 1200; k++) {
    const y = created.getFullYear() + Math.floor((created.getMonth() + k) / 12)
    const m = (created.getMonth() + k) % 12
    const last = new Date(y, m + 1, 0).getDate()
    const at = new Date(y, m, Math.min(day, last), created.getHours(), created.getMinutes())
    if (at.getTime() > t) return at.toISOString()
  }
  return null
}

const dayText = (iso: string) => {
  const d = new Date(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// The ring holds what is left, like a fuel gauge: full and green when fresh.
const arc = (c: number, r: number, rest: number | undefined, stroke: number) => {
  if (rest === undefined || rest <= 0) return ''
  const len = 2 * Math.PI * r
  return `<circle class="s-${tone(rest)}" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${((len * rest) / 100).toFixed(2)} ${len.toFixed(2)}" transform="rotate(-90 ${c} ${c})"/>`
}

const rings = (c: number, outer: number, inner: number, stroke: number, d: Drawing) =>
  `<circle class="track" cx="${c}" cy="${c}" r="${outer}" fill="none" stroke-width="${stroke}"/>
<circle class="track" cx="${c}" cy="${c}" r="${inner}" fill="none" stroke-width="${stroke}"/>
${arc(c, outer, d.week, stroke)}
${arc(c, inner, d.five, stroke)}`

const STYLE = `<style>
text{font-family:ui-rounded,"SF Pro Rounded",-apple-system,BlinkMacSystemFont,sans-serif}
.track{stroke:rgba(0,0,0,.08)}
.center{fill:#57606a;font-weight:700;font-variant-numeric:tabular-nums}
.label{fill:#8c959f;font-weight:600;letter-spacing:1.1px}
.value{font-weight:700;font-variant-numeric:tabular-nums}
.date{fill:#57606a;font-weight:600;letter-spacing:.3px}
.note{fill:#8c959f;font-weight:500}
.dot{fill:#d0d7de}
.s-ok{stroke:#1a7f37}.s-mid{stroke:#bf8700}.s-low{stroke:#d1580a}.s-bad{stroke:#cf222e}
.f-ok{fill:#1a7f37}.f-mid{fill:#bf8700}.f-low{fill:#d1580a}.f-bad{fill:#cf222e}.f-mute{fill:#8c959f}
@media (prefers-color-scheme: dark){
.track{stroke:rgba(255,255,255,.12)}
.center{fill:#c9d1d9}.label{fill:#6e7681}.date{fill:#adbac7}.note{fill:#6e7681}.dot{fill:#3d444d}
.s-ok{stroke:#3fb950}.s-mid{stroke:#e3b341}.s-low{stroke:#f0883e}.s-bad{stroke:#f85149}
.f-ok{fill:#3fb950}.f-mid{fill:#e3b341}.f-low{fill:#f0883e}.f-bad{fill:#f85149}.f-mute{fill:#6e7681}
}
</style>`

const metric = (label: string, rest: number | undefined, gap: number) =>
  `<tspan dx="${gap}" class="label" font-size="7.5">${label}</tspan><tspan dx="4" class="value f-${tone(rest)}" font-size="12">${pct(rest)}</tspan>`

type Drawing = {
  five: number | undefined
  week: number | undefined
  center: string
  renew: string
  fiveNote: string
  weekNote: string
}

// The one-line gauge: above the prompt, and in the corner widget.
const svg = (d: Drawing) => {
  const c = RING / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${RING}" viewBox="0 0 ${WIDTH} ${RING}">
${STYLE}
${rings(c, OUTER_R, INNER_R, STROKE, d)}
<text class="center" font-size="5.2" x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central">${d.center}</text>
<text x="${RING + 8}" y="${c}" dominant-baseline="central">${metric('5H', d.five, 0)}<tspan dx="7" class="dot">•</tspan>${metric('7D', d.week, 7)}<tspan dx="7" class="dot">•</tspan><tspan dx="7" class="label" font-size="7.5">EXP</tspan><tspan dx="4" class="date" font-size="11">${d.renew}</tspan></text>
</svg>`
}

const PANEL_W = 300
const PANEL_H = 136

const panelRow = (y: number, label: string, rest: number | undefined, note: string) =>
  `<text x="150" y="${y}" dominant-baseline="central"><tspan class="label" font-size="9">${label}</tspan><tspan x="182" class="value f-${tone(rest)}" font-size="20">${pct(rest)}</tspan></text>
<text class="note" font-size="9" x="182" y="${y + 17}" dominant-baseline="central">${note}</text>`

// The pane's large gauge: the rings on the left, each figure with its reset on the right.
const panelSvg = (d: Drawing) => {
  const c = 66
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_W}" height="${PANEL_H}" viewBox="0 0 ${PANEL_W} ${PANEL_H}">
${STYLE}
<g transform="translate(2 2)">${rings(c, 58, 43, 10, d)}</g>
<text class="center" font-size="20" x="${c + 2}" y="${c - 2}" text-anchor="middle" dominant-baseline="central">${d.center}</text>
<text class="label" font-size="7.5" x="${c + 2}" y="${c + 16}" text-anchor="middle" dominant-baseline="central">5H RESET</text>
${panelRow(20, '5H', d.five, d.fiveNote)}
${panelRow(66, '7D', d.week, d.weekNote)}
<text x="150" y="114" dominant-baseline="central"><tspan class="label" font-size="9">EXP</tspan><tspan x="182" class="date" font-size="15">${d.renew}</tspan></text>
</svg>`
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const resetNote = (q: Quota | undefined, t: number) => {
  if (q?.resetsAt === undefined) return 'no reset time yet'
  const r = remaining(q.resetsAt, t)
  const at = new Date(q.resetsAt)
  if (r !== undefined && r.h < 24) return `resets in ${r.h}h ${r.m}m · ${hhmm(at)}`
  return `resets ${dayText(q.resetsAt)} · ${hhmm(at)}`
}

const agoText = (at: number, t: number) => {
  if (at === 0) return 'Not refreshed from the account yet'
  const minutes = Math.max(0, Math.round((t - at) / 60000))
  return minutes === 0 ? 'Updated just now' : `Updated ${minutes} min ago`
}

type View = { drawing: Drawing; line: string; ago: string; five?: Quota; week?: Quota }

const viewOf = async ($: EngineInterface): Promise<View> => {
  const list = await read($, limits)
  const t = await read($, now)
  const acct = await read($, account)
  const five = pick(list, 'five_hour')
  const week = pick(list, 'seven_day')
  const fiveLeft = left(five)
  const weekLeft = left(week)
  const renewsAt = acct.renewsAt
  const renew = !acct.checked ? '…' : renewsAt ? dayText(renewsAt) : '--'
  return {
    drawing: {
      five: fiveLeft,
      week: weekLeft,
      center: five ? clockText(remaining(five.resetsAt, t)) : '--',
      renew,
      fiveNote: resetNote(five, t),
      weekNote: resetNote(week, t),
    },
    // The same words everywhere: the ring's alt on desktop, the one line on other surfaces.
    line: `5H ${pct(fiveLeft)} · 7D ${pct(weekLeft)} · EXP ${renew}`,
    ago: agoText(await read($, pulledAt), t),
    five,
    week,
  }
}

const authed = async ($: EngineInterface, path: string) => {
  const auth = await $.session.authorize()
  if (auth?.kind !== 'bearer') return undefined
  return $.http.fetch(`${API}/${path}`, { auth: auth.handle, headers: { 'anthropic-beta': 'oauth-2025-04-20' } })
}

type Window = { utilization?: number | null; resets_at?: string | null } | null | undefined

const pullUsage = async ($: EngineInterface): Promise<boolean> => {
  try {
    const res = await authed($, 'usage')
    if (!res?.ok) return false
    const body = JSON.parse(res.text) as Record<string, Window>
    const fresh: Quota[] = []
    for (const kind of ['five_hour', 'seven_day']) {
      const w = body[kind]
      if (typeof w?.utilization !== 'number') continue
      fresh.push({ kind, percentUsed: w.utilization, ...(w.resets_at ? { resetsAt: w.resets_at } : {}) })
    }
    if (fresh.length === 0) return false
    await update($, limits, () => fresh)
    const t = await $.clock.now()
    await update($, now, () => t)
    await update($, pulledAt, () => t)
    return true
  } catch {
    // Keep the last reading.
    return false
  }
}

const pullRenewal = async ($: EngineInterface) => {
  let renewsAt: string | null = null
  try {
    const res = await authed($, 'profile')
    if (res?.ok) {
      const created = (JSON.parse(res.text) as { organization?: { subscription_created_at?: string } })
        .organization?.subscription_created_at
      if (created) renewsAt = nextRenewal(created, await $.clock.now())
    }
  } catch {
    // No profile: the date shows --.
  }
  await update($, account, () => ({ checked: true, renewsAt }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: COMMAND, description: 'Open the quota pane: what is left of the 5-hour and 7-day limits, when each resets, and a refresh button.' })
    const usage = await $.session.usage()
    if (usage.rateLimits.length > 0) await update($, limits, () => usage.rateLimits)
    const t = await $.clock.now()
    await update($, now, () => t)
    $.clock.every(TICK_EVERY, () => {
      void $.clock.now().then(t => update($, now, () => t))
    })

    void pullUsage($)
    $.clock.every(PULL_EVERY, () => void pullUsage($))
    void pullRenewal($)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits') && e.rateLimits.length > 0) {
      await update($, limits, () => e.rateLimits)
    }

    return next(e)
  })

  on('command.run', { command: COMMAND }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Quota' })
    return { text: opened.isPlaced ? 'Quota pane opened.' : `The quota pane could not be shown: ${opened.reason}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const view = await viewOf($)
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const hasSvg = (e.surface === 'desktop' || e.surface === 'mobile') && 'Svg' in ui

    // Minimized to the corner: the small gauge alone, as clicks may not reach it there.
    if (e.props.placement === 'widget') {
      if (hasSvg) {
        const { Svg } = ui
        return <Svg source={svg(view.drawing)} alt={view.line} width={WIDTH} height={RING} />
      }
      return <Text>{view.line}</Text>
    }

    const refresh = async () => {
      const ok = await pullUsage($)
      void $.ui.toast(ok ? 'Quota refreshed.' : 'Could not refresh: sign in with a Claude subscription.')
    }

    return (
      <Box flexDirection="column" gap="md">
        {hasSvg && 'Svg' in ui ? (
          <ui.Svg source={panelSvg(view.drawing)} alt={view.line} width={PANEL_W} height={PANEL_H} />
        ) : (
          <Box flexDirection="column">
            <Text>{`5H  ${pct(view.drawing.five)} left · ${view.drawing.fiveNote}`}</Text>
            <Text>{`7D  ${pct(view.drawing.week)} left · ${view.drawing.weekNote}`}</Text>
            <Text>{`EXP ${view.drawing.renew}`}</Text>
          </Box>
        )}
        <Box flexDirection="row" gap={1} alignItems="center">
          <Button key="refresh" label="Refresh" onPress={refresh}>
            Refresh
          </Button>
          <Text dimColor>{view.ago}</Text>
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const view = await viewOf($)
    const ui = $.ui.resolve(e)
    const { Box } = ui
    // The end of the row is left to the mods beneath, such as zy-themes' theme button; with none it stays empty.
    const rest = await next(e)

    const gauge =
      e.surface === 'desktop' && 'Svg' in ui ? (
        <ui.Svg source={svg(view.drawing)} alt={view.line} width={WIDTH} height={RING} />
      ) : (
        <ui.Text dimColor>{view.line}</ui.Text>
      )

    return (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap="md">
        {gauge}
        {rest}
      </Box>
    )
  })
}
