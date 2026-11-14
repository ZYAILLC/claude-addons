import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const NOW = Date.parse('2026-11-14T08:00:00Z')

const BAND = {
  plugin: 'quota-gauge',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 4 },
    view: {},
  },
} as const

// Stands in for the engine: 2% of the 5-hour window used, none of the 7-day one, signed out.
const engine = (on: On) => {
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: {
      rateLimits: [
        { kind: 'five_hour', percentUsed: 2, resetsAt: '2026-11-14T12:21:00Z' },
        { kind: 'seven_day', percentUsed: 0 },
      ],
    } as never,
  }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.authorize', () => ({ value: null }))
}

const start = { cwd: '/', surface: 'terminal', isInteractive: true } as const

test('the band reads what is left, the same on every surface', async ($, on) => {
  engine(on)
  await $.session.start(start)

  for (const surface of ['terminal', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const row = await ui.find({ type: 'Text' })
    expect(row?.text).toBe('5H 98% · 7D 100% · EXP --')
    await ui.unmount()
  }
})

test('desktop draws the ring with the countdown', async ($, on) => {
  engine(on)
  await $.session.start({ ...start, surface: 'desktop' })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const ring = await ui.find({ type: 'Svg' })
  expect(ring?.props.alt).toBe('5H 98% · 7D 100% · EXP --')
  // 08:00 to 12:21 UTC: 4 hours 21 minutes until the 5-hour window resets.
  expect(String(ring?.props.source)).toContain('>4:21</text>')
  await ui.unmount()
})

test('a survey keeps the band to the engine', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(start)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
