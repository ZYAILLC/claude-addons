import { expect, mock, test } from 'claude-code/testing'
import type { On, ThemeSetArgs } from 'claude-code'
import type { TestBody } from 'claude-code/testing'

type World = { sets: ThemeSetArgs[]; clears: () => number; store: Map<string, unknown>; opened: string[] }

// Stands in for the engine: one session in /work/app, a store in memory, and a window that draws themes (or not).
const engine = (on: On, entries: Record<string, unknown> = {}, isDrawn = true, sessionId = 's1'): World => {
  const sets: ThemeSetArgs[] = []
  const opened: string[] = []
  let clears = 0
  // The store in memory, so the test can look at what the mod kept.
  const store = new Map<string, unknown>(Object.entries(entries))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => (store.set(e.key, e.value), { value: undefined }))
  on('store.delete', (_, e) => (store.delete(e.key), { value: undefined }))
  on('store.keys', () => ({ value: [...store.keys()] }))
  mock.clock(on, { now: 1_000 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('session.id', () => ({ value: sessionId }))
  on('session.root', () => ({ value: '/work/app' }))
  on('session.cwd', () => ({ value: '/work/app' }))
  on('command.register', () => ({ value: { command: 'zy-theme' } }))
  on('ui.open', (_, e) => (opened.push(e.id), { value: { isPlaced: true, requestId: e.id } }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: isDrawn ? { isDrawn: true, requestId: 't' } : { isDrawn: false, reason: 'no surface draws themes' } }
  })
  on('theme.clear', () => {
    clears += 1
    return { value: { isDrawn: true, requestId: 't' } }
  })
  return {
    sets,
    clears: () => clears,
    store,
    opened,
  }
}

const start = { cwd: '/work/app', surface: 'desktop', isInteractive: true } as const

const run = async ($: Parameters<TestBody>[0], args: string) =>
  (await $.command.run({ command: 'zy-theme', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })).text

test('a named theme is applied to the project and kept', async ($, on) => {
  const world = engine(on)
  await $.session.start(start)

  expect(await run($, 'starlit')).toBe('Starlit Sea applied to this project. Made for dark windows.')
  expect(world.sets.at(-1)?.backdrop).toEqual({ scene: 'starlit', glass: { blur: 18, tint: '#120f22', opacity: 0.5 } })
  expect(world.sets.at(-1)?.overrideColorScheme).toBe('dark')
  expect(world.store.get('choice:project:/work/app')).toBe('starlit')
})

test('names match by title in any case', async ($, on) => {
  const world = engine(on)
  await $.session.start(start)

  expect(await run($, 'moonlit LAKE')).toBe('Moonlit Lake applied to this project. Made for dark windows.')
  expect(world.sets.at(-1)?.backdrop).toEqual({ image: { source: 'backdrops/moonlit-lake.jpg' } })
})

test('a new session shows the project theme, then the one for all projects', async ($, on) => {
  const world = engine(on, { 'choice:all': 'moonlit', 'choice:project:/work/app': 'sakura' })
  await $.session.start(start)
  expect(world.sets.at(-1)?.backdrop).toEqual({ image: { source: 'backdrops/sakura-dawn.jpg' } })

  world.store.delete('choice:project:/work/app')
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } } as never)
  expect(world.sets.at(-1)?.backdrop).toEqual({ image: { source: 'backdrops/moonlit-lake.jpg' } })
})

test('a session choice wins over the project, and off clears it', async ($, on) => {
  const world = engine(on, { 'choice:project:/work/app': 'sakura' })
  await $.session.start(start)

  expect(await run($, 'inkwash session')).toBe('Ink Mountains applied to this session only. Made for light windows.')
  expect(world.store.get('choice:session:s1')).toBe('inkwash')
  expect(world.store.get('choice:project:/work/app')).toBe('sakura')

  expect(await run($, 'off session')).toBe('Theme cleared for this session only.')
  expect(world.clears()).toBe(1)
})

test('"all" sets every project and lets this one follow it', async ($, on) => {
  const world = engine(on, { 'choice:project:/work/app': 'sakura' })
  await $.session.start(start)

  expect(await run($, 'petals all')).toBe(
    'Petal Breeze applied to every project without a theme of its own. Made for light windows.',
  )
  expect(world.store.get('choice:all')).toBe('petals')
  expect(world.store.get('choice:project:/work/app')).toBeUndefined()
})

test('a window that draws no themes still keeps the choice', async ($, on) => {
  const world = engine(on, {}, false)
  await $.session.start(start)

  expect(await run($, 'fireflies')).toBe(
    'Firefly Forest applied to this project. Made for dark windows. This window does not draw themes (no surface draws themes); the Claude desktop and mobile apps do. Your choice is saved.',
  )
  expect(world.store.get('choice:project:/work/app')).toBe('fireflies')
})

test('an unknown name says how to use the command', async ($, on) => {
  engine(on)
  await $.session.start(start)

  expect(await run($, 'sunset')).toContain('No theme named "sunset".')
  expect(await run($, 'list')).toContain('starlit: The Milky Way over a calm sea')
})

const PANE = {
  plugin: 'zy-themes',
  component: 'Pane',
  requestId: 'zy-themes',
  props: { title: 'Themes', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

const BAND = {
  plugin: 'zy-themes',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const

test('the theme button opens the Themes pane; a picture applies on one press', async ($, on) => {
  const world = engine(on)
  await $.session.start(start)

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await band.find({ type: 'Button' }))?.props.label).toBe('Theme: None')
  await band.press({ key: 'themes' })
  expect(world.opened).toEqual(['zy-themes'])

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await pane.findAll({ type: 'Svg' })).length).toBe(6)
  await pane.press({ key: 'use-moonlit' })
  expect(world.sets.at(-1)?.backdrop).toEqual({ image: { source: 'backdrops/moonlit-lake.jpg' } })
  expect(world.store.get('choice:all')).toBe('moonlit')
  expect((await pane.find({ type: 'Button', key: 'use-moonlit' }))?.props.variant).toBe('primary')
  await pane.unmount()

  expect((await band.find({ type: 'Button' }))?.props.label).toBe('Theme: Moonlit Lake')
  await band.unmount()
})

test('reset brings back the original look', async ($, on) => {
  const world = engine(on, { 'choice:all': 'starlit', 'choice:project:/work/app': 'sakura' })
  await $.session.start(start)

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'reset' })
  expect(world.store.has('choice:all')).toBe(false)
  expect(world.store.has('choice:project:/work/app')).toBe(false)
  expect(world.clears()).toBe(1)
  expect((await pane.find({ type: 'Text', text: /^Now:/ }))?.text).toBe('Now: no theme')
  await pane.unmount()
})

test('Open image asks the system Open window and applies the picture chosen', async ($, on) => {
  const world = engine(on)
  const runs: string[][] = []
  on('fs.stat', () => ({ value: { kind: 'file', size: 400_000, mtimeMs: 0, isLink: false } }))
  on('fs.read', () => ({ value: { base64: 'AAAA' } }))
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    const stdout = e.argv[0] === 'osascript' ? '/Users/me/Pictures/Beach.png\n' : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  await $.session.start(start)

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'open' })
  expect(runs[0]?.[0]).toBe('osascript')
  expect(world.sets.at(-1)?.backdrop).toEqual({ image: { source: 'user-images/my-beach.jpg' } })
  expect(world.store.get('choice:all')).toBe('my-beach')
  expect((await pane.find({ type: 'Button', key: 'use-my-beach' }))?.props.label).toBe('Beach')
  await pane.unmount()
})

test('cancelling the Open window changes nothing', async ($, on) => {
  const world = engine(on)
  on('process.run', () => ({
    value: { exitCode: 1, stdout: '', stderr: 'execution error: User canceled. (-128)', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  await $.session.start(start)

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'open' })
  expect(world.sets.length).toBe(0)
  expect(world.store.has('choice:all')).toBe(false)
  await pane.unmount()
})

test('the pane switches to Chinese and back, and remembers it', async ($, on) => {
  const world = engine(on)
  await $.session.start(start)

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await pane.find({ type: 'Button', key: 'lang' }))?.props.label).toBe('中文')
  await pane.press({ key: 'lang' })
  expect(world.store.get('lang')).toBe('zh')
  expect((await pane.find({ type: 'Button', key: 'open' }))?.props.label).toBe('📂 打开图片…')
  expect((await pane.find({ type: 'Button', key: 'reset' }))?.props.label).toBe('↺ 重置')
  expect((await pane.find({ type: 'Button', key: 'use-starlit' }))?.props.label).toBe('星海')

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await band.find({ type: 'Button' }))?.text).toBe('🎨 无')
  await band.unmount()

  await pane.press({ key: 'lang' })
  expect((await pane.find({ type: 'Button', key: 'use-starlit' }))?.props.label).toBe('Starlit Sea')
  await pane.unmount()
})

test('a language chosen in an earlier session is kept', async ($, on) => {
  engine(on, { lang: 'zh', 'choice:project:/work/app': 'fireflies' })
  await $.session.start(start)

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await band.find({ type: 'Button' }))?.text).toBe('🎨 萤火森林')
  await band.unmount()
})

test('/zy-theme alone opens the pane too', async ($, on) => {
  engine(on)
  await $.session.start(start)
  expect(await run($, '')).toBe('Pick a backdrop in the Themes pane.')
})

test('the button stays off the terminal', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(start)
  const terminal = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await terminal.find({ type: 'Text' }))?.text).toBe('engine')
  await terminal.unmount()
})

test('the setting hides the button', { options: { button: false } }, async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(start)
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ type: 'Button' })).toBeUndefined()
  await band.unmount()
})

test('the animated scenes are drawn on desktop and left alone elsewhere', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(start)

  for (const scene of ['fireflies', 'petals', 'starlit']) {
    const ui = await $.ui.mount({ plugin: 'zy-themes', surface: 'desktop', component: 'Backdrop', props: { scene, plugin: 'zy-themes', glass: { blur: 16, opacity: 0.5 } } })
    const svg = await ui.find({ type: 'Svg' })
    expect(String(svg?.props.source)).toContain('prefers-reduced-motion')
    await ui.unmount()
  }

  const other = await $.ui.mount({ plugin: 'zy-themes', surface: 'desktop', component: 'Backdrop', props: { scene: 'starlit', plugin: 'someone-else', glass: { blur: 16, opacity: 0.5 } } })
  expect((await other.find({ type: 'Text' }))?.text).toBe('engine')
  await other.unmount()
})

test('a picture of your own is copied in and shown', async ($, on) => {
  const world = engine(on)
  const runs: string[][] = []
  mock.env(on, { HOME: '/Users/me' })
  on('fs.stat', () => ({ value: { kind: 'file', size: 400_000, mtimeMs: 0, isLink: false } }))
  on('process.run', (_, e) => (runs.push([...e.argv]), { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  await $.session.start(start)

  expect(await run($, 'image ~/Pictures/Beach Day.png')).toBe('Beach Day is now the backdrop for this project.')
  const sips = runs.find(argv => argv[0] === 'sips')
  expect(sips?.at(-3)).toBe('/Users/me/Pictures/Beach Day.png')
  expect(sips?.at(-1)).toMatch(/\/user-images\/my-beach-day\.jpg$/)
  expect(world.sets.at(-1)?.backdrop).toEqual({ image: { source: 'user-images/my-beach-day.jpg' } })
  expect(world.store.get('choice:project:/work/app')).toBe('my-beach-day')
  expect(await run($, 'list')).toContain('my-beach-day: Your picture: /Users/me/Pictures/Beach Day.png')
})
