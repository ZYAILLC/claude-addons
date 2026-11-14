import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

import { THUMBS } from './art/thumbs'
import { addImage, chooseFile, ensureCopy, keyOf, readImages, removeImage, thumbOf } from './images'
import type { UserImage } from './images'
import { fireflyScene, petalScene, starScene } from './scenes'
import { THEMES } from './themes'
import { THEMES_ZH, WORDS } from './words'
import type { Lang } from './words'
import type { Theme } from './themes'
import type { Choice, Scope } from '../types'

const PLUGIN = 'zy-themes'
// Not `theme`: that is Claude Code's own command (the terminal's color theme).
const COMMAND = 'zy-theme'
const PANE = 'zy-themes'
// The sister mod whose row above the prompt the theme button joins.
const QUOTA = 'zy-quota'
const PREVIEW_MS = 20_000
const OFF = 'off'
const ALL_KEY = 'choice:all'
const PROJECT_PREFIX = 'choice:project:'
const SESSION_PREFIX = 'choice:session:'
// How many sessions' own choices the store keeps: past it, the oldest go.
const SESSIONS_KEPT = 200
const SCENES: Record<string, () => string> = { fireflies: fireflyScene, petals: petalScene, starlit: starScene }
const WINDOWS = ['light', 'dark'] as const

const choice = atom({ plugin: 'zy-themes', key: 'choice' } as const, {} as Choice)
// The pane's language: English unless the person switched it, kept across sessions under LANG_KEY.
const lang = atom({ plugin: 'zy-themes', key: 'lang' } as const, 'en' as Lang)
const LANG_KEY = 'lang'

// The module's own variables start over on a reload.
let previewEnding: Timer | undefined
// True once this mod has put a theme up: a clear then takes down its own theme, never another mod's.
let isOurs = false

type Item = { id: string; title: string; blurb: string; window?: Theme['window']; from?: string }

const itemOfImage = (img: UserImage): Item => ({ id: img.id, title: img.title, blurb: `Your picture: ${img.from}`, from: img.from })

const allItems = async ($: EngineInterface): Promise<Item[]> => [...THEMES, ...(await readImages($)).map(itemOfImage)]

/** The theme or picture a person named: by its id or its title, in any case. */
const findItem = async ($: EngineInterface, text: string): Promise<Item | undefined> => {
  const key = keyOf(text)
  if (key === '') return undefined
  return (await allItems($)).find(item => item.id === key || keyOf(item.title) === key || item.id === `my-${key}`)
}

const titleOf = async ($: EngineInterface, id: string | undefined) =>
  id === undefined ? undefined : (await allItems($)).find(item => item.id === id)?.title

const keyFor = async ($: EngineInterface, scope: Scope) =>
  scope === 'all'
    ? ALL_KEY
    : scope === 'project'
      ? `${PROJECT_PREFIX}${await $.session.root()}`
      : `${SESSION_PREFIX}${await $.session.id()}`

type Resolved = { id?: string; scope?: Scope }

/** What this session should show: its own choice, else its project's, else the one for every project. */
const resolve = async ($: EngineInterface): Promise<Resolved> => {
  for (const scope of ['session', 'project', 'all'] as const) {
    const stored = await $.store.get(await keyFor($, scope))
    if (typeof stored === 'string') return stored === OFF ? { scope } : { id: stored, scope }
  }
  return {}
}

const lookOf = async ($: EngineInterface, id: string): Promise<ThemeSetArgs | undefined> => {
  const theme = THEMES.find(t => t.id === id)
  if (theme !== undefined) return theme.look
  const image = (await readImages($)).find(img => img.id === id)
  if (image === undefined) return undefined
  const ready = await ensureCopy($, image)
  return { backdrop: { image: { source: ready.file } } }
}

type Shown = { isDrawn: true } | { isDrawn: false; reason: string }

// An older Claude Code refuses parts of a look it does not know (colors, grounds, `scene`) in its host check.
const TOO_OLD = 'This version of Claude Code cannot draw these themes. Update the Claude desktop app and try again.'

async function setLook($: EngineInterface, look: ThemeSetArgs) {
  try {
    return await $.theme.set(look)
  } catch (error) {
    if (error instanceof Error && error.message.includes('(host check)')) throw new Error(TOO_OLD)
    throw error
  }
}

/** Puts a theme up; with none, or one that no longer exists, takes this mod's theme down. */
const show = async ($: EngineInterface, id: string | undefined): Promise<Shown> => {
  const look = id === undefined ? undefined : await lookOf($, id)
  if (look === undefined) {
    if (isOurs) {
      await $.theme.clear()
      isOurs = false
    }
    return { isDrawn: true }
  }
  const set = await setLook($, look)
  isOurs = true
  return set.isDrawn ? { isDrawn: true } : { isDrawn: false, reason: set.reason }
}

/** Shows what this session should show, when that changed (or always, with `force`). */
const follow = async ($: EngineInterface, force = false): Promise<Shown> => {
  const now = await read($, choice)
  if (now.preview !== undefined && !force) return { isDrawn: true }
  const want = await resolve($)
  if (!force && want.id === now.applied) {
    if (want.scope !== now.scope) await update($, choice, was => ({ ...was, scope: want.scope }))
    return { isDrawn: true }
  }
  const shown = await show($, want.id)
  await update($, choice, was => ({ ...was, applied: want.id, scope: want.scope, preview: undefined }))
  return shown
}

const trimSessions = async ($: EngineInterface) => {
  const keys = (await $.store.keys()).filter(key => key.startsWith(SESSION_PREFIX))
  for (const oldest of keys.slice(0, Math.max(0, keys.length - SESSIONS_KEPT))) await $.store.delete(oldest)
}

/**
 * Keeps a choice and shows it. A theme for the project lets this session follow it; one for every project lets this
 * project follow it too. `off` for every project clears that choice and this project's own.
 */
const apply = async ($: EngineInterface, id: string | undefined, scope: Scope): Promise<Shown> => {
  const key = await keyFor($, scope)
  if (id === undefined && scope === 'all') await $.store.delete(key)
  else await $.store.set(key, id ?? OFF)

  if (scope !== 'session') await $.store.delete(await keyFor($, 'session'))
  if (scope === 'all') await $.store.delete(await keyFor($, 'project'))
  if (scope === 'session') await trimSessions($)

  previewEnding?.cancel()
  previewEnding = undefined
  return follow($, true)
}


const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const unshown = (shown: Shown) =>
  shown.isDrawn
    ? ''
    : ` This window does not draw themes (${shown.reason}); the Claude desktop and mobile apps do. Your choice is saved.`

const WHERE: Record<Scope, string> = {
  session: 'this session only',
  project: 'this project',
  all: 'every project without a theme of its own',
}

const listText = async ($: EngineInterface) => {
  const now = await read($, choice)
  const row = (item: Item) => `  ${item.id === now.applied ? '✓' : ' '} ${item.id}: ${item.blurb}`
  const images = await readImages($)
  return [
    ...WINDOWS.flatMap(window => [`For ${window} windows:`, ...THEMES.filter(t => t.window === window).map(row)]),
    ...(images.length === 0 ? [] : ['Your pictures:', ...images.map(img => row(itemOfImage(img)))]),
    `/${COMMAND} <name> applies one to this project; add "session" for this session only or "all" for every project.`,
    `/${COMMAND} image <path> uses a picture of your own. /${COMMAND} off clears.`,
  ].join('\n')
}

const HELP = `Try /${COMMAND}, /${COMMAND} list, /${COMMAND} <name> [session|all], /${COMMAND} image <path>, /${COMMAND} remove <name> or /${COMMAND} off [session|all].`

const runCommand = async ($: EngineInterface, args: string): Promise<string> => {
  const words = args.trim().split(/\s+/).filter(word => word !== '')
  const head = words[0]?.toLowerCase()

  if (head === undefined) return openPicker($)

  if (head === 'list' && words.length === 1) return listText($)

  const last = words.at(-1)?.toLowerCase()
  const scoped = words.length > 1 && (last === 'session' || last === 'project' || last === 'all')
  const scope: Scope = scoped ? (last as Scope) : 'project'
  const rest = scoped ? words.slice(0, -1) : words

  if (head === 'image') {
    const path = args.trim().slice('image'.length).trim().replace(/\s+(session|project|all)$/i, '')
    if (path === '') return `Name a picture: /${COMMAND} image <path to a JPEG or PNG>.`
    const image = await addImage($, path)
    const shown = await apply($, image.id, scope)
    return `${image.title} is now the backdrop for ${WHERE[scope]}.${unshown(shown)}`
  }

  if (head === 'remove') {
    const target = await findItem($, rest.slice(1).join(' '))
    const image = target === undefined ? undefined : (await readImages($)).find(img => img.id === target.id)
    if (image === undefined) return `No picture of yours by that name. /${COMMAND} list names them.`
    await removeImage($, image)
    await follow($, true)
    return `${image.title} removed.`
  }

  if (head === OFF && rest.length === 1) {
    const shown = await apply($, undefined, scope)
    return `Theme cleared for ${WHERE[scope]}.${unshown(shown)}`
  }

  const item = await findItem($, rest.join(' '))
  if (item === undefined) return `No theme named "${rest.join(' ')}". ${HELP}`
  const shown = await apply($, item.id, scope)
  const made = item.window === undefined ? '' : ` Made for ${item.window} windows.`
  return `${item.title} applied to ${WHERE[scope]}.${made}${unshown(shown)}`
}

/** Opens the picker pane beside the chat; where no surface can show it, lists the themes instead. */
const openPicker = async ($: EngineInterface): Promise<string> => {
  const zh = (await read($, lang)) === 'zh'
  const opened = await $.ui.open({ id: PANE, title: zh ? '主题' : 'Themes', focus: true })
  return opened.isPlaced ? 'Pick a backdrop in the Themes pane.' : `${await listText($)}\n(The Themes pane could not be shown: ${opened.reason}.)`
}

const switchLang = async ($: EngineInterface) => {
  const next: Lang = (await read($, lang)) === 'zh' ? 'en' : 'zh'
  await update($, lang, () => next)
  await $.store.set(LANG_KEY, next)
  // The pane's tab follows: an open id is retitled.
  await $.ui.open({ id: PANE, title: next === 'zh' ? '主题' : 'Themes' })
}

/** An item's name in the pane's language. */
const nameOf = (item: Item, l: Lang) => (l === 'zh' ? (THEMES_ZH[item.id]?.title ?? item.title) : item.title)

type Elements = ReturnType<EngineInterface['ui']['resolve']>

/** Runs a press and says how it went: what is now the backdrop, or why nothing changed. */
const press = async ($: EngineInterface, act: () => Promise<{ shown: Shown; said: string } | undefined>) => {
  const w = WORDS[await read($, lang)]
  try {
    const done = await act()
    if (done === undefined) return
    void $.ui.toast(done.shown.isDrawn ? done.said : w.unshown(done.shown.reason))
  } catch (error) {
    void $.ui.toast(reasonOf(error) === 'NO_DIALOG' ? w.noDialog(COMMAND) : `zy-themes: ${reasonOf(error)}`)
  }
}

// Every choice made in the pane is the look everywhere: one backdrop, simply.
const useItem = async ($: EngineInterface, item: Item) => {
  const shown = await apply($, item.id, 'all')
  return { shown, said: WORDS[await read($, lang)].applied(nameOf(item, await read($, lang))) }
}

const reset = async ($: EngineInterface) => ({ shown: await apply($, undefined, 'all'), said: WORDS[await read($, lang)].cleared })

/** The system's Open window: the picture chosen is copied in and applied at once. */
const openImage = async ($: EngineInterface) => {
  const path = await chooseFile($, WORDS[await read($, lang)].dialogPrompt)
  if (path === undefined) return undefined
  const image = await addImage($, path)
  return useItem($, itemOfImage(image))
}

const TW = 144
const TH = 96

/** A rounded preview, ringed when it is the backdrop now, with a play mark on an animated one. */
const thumbSvg = (base64: string, isCurrent: boolean, isAnimated: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">` +
  `<defs><clipPath id="r"><rect width="${TW}" height="${TH}" rx="10"/></clipPath></defs>` +
  `<image href="data:image/jpeg;base64,${base64}" width="${TW}" height="${TH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#r)"/>` +
  (isAnimated
    ? `<circle cx="${TW - 16}" cy="${TH - 16}" r="10" fill="rgba(0,0,0,.45)"/><path d="M${TW - 19} ${TH - 21} L${TW - 11} ${TH - 16} L${TW - 19} ${TH - 11} Z" fill="#fff"/>`
    : '') +
  (isCurrent ? `<rect x="1.5" y="1.5" width="${TW - 3}" height="${TH - 3}" rx="9" fill="none" stroke="#4c9aff" stroke-width="3"/>` : '') +
  '</svg>'

const picker = (
  $: EngineInterface,
  ui: Elements,
  surface: string,
  now: Choice,
  images: UserImage[],
  previews: Map<string, string>,
  l: Lang,
) => {
  const { Box, Text, Button } = ui
  const w = WORDS[l]
  const hasSvg = (surface === 'desktop' || surface === 'mobile') && 'Svg' in ui

  const card = (item: Item) => {
    const isCurrent = now.applied === item.id
    const name = nameOf(item, l)
    const preview = previews.get(item.id)
    const isAnimated = SCENES[item.id] !== undefined
    const alt = isAnimated ? `${name} (${w.animated})` : name
    return (
      <Box key={`card-${item.id}`} flexDirection="column" gap="xs" alignItems="center">
        {hasSvg && preview !== undefined ? <ui.Svg source={thumbSvg(preview, isCurrent, isAnimated)} alt={alt} width={TW} height={TH} /> : null}
        <Button key={`use-${item.id}`} label={name} variant={isCurrent ? 'primary' : undefined} onPress={() => press($, () => useItem($, item))}>
          {`${isCurrent ? '✓ ' : ''}${name}`}
        </Button>
      </Box>
    )
  }

  const current = [...THEMES, ...images.map(itemOfImage)].find(item => item.id === now.applied)

  return (
    <Box flexDirection="column" gap="md">
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap="md">
        <Box flexDirection="row" gap={1} alignItems="center">
          <Button key="open" label={w.open} variant="primary" onPress={() => press($, () => openImage($))}>
            {w.open}
          </Button>
          <Button key="reset" label={w.reset} onPress={() => press($, () => reset($))}>
            {w.reset}
          </Button>
        </Box>
        <Button key="lang" label={w.toggle} dimColor onPress={() => switchLang($)}>
          {w.toggle}
        </Button>
      </Box>
      <Text dimColor>{`${w.now} ${current === undefined ? w.noTheme : nameOf(current, l)}`}</Text>
      {images.length === 0 ? null : (
        <Box key="group-images" flexDirection="column" gap="sm">
          <Text key="head-images" size="heading" bold>{w.yourPictures}</Text>
          <Box flexDirection="row" flexWrap="wrap" gap="md">{[...images].reverse().map(img => card(itemOfImage(img)))}</Box>
        </Box>
      )}
      <Box key="group-built-in" flexDirection="column" gap="sm">
        <Text key="head-built-in" size="heading" bold>{w.builtIn}</Text>
        <Box flexDirection="row" flexWrap="wrap" gap="md">{THEMES.map(card)}</Box>
      </Box>
    </Box>
  )
}

const themeButton = async ($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0]) => {
  const now = await read($, choice)
  const l = await read($, lang)
  const id = now.preview ?? now.applied
  const item = id === undefined ? undefined : (await allItems($)).find(one => one.id === id)
  const title = item === undefined ? (l === 'zh' ? '无' : 'None') : nameOf(item, l)
  const { Button } = $.ui.resolve(e)
  return (
    <Button key="themes" label={l === 'zh' ? `主题：${title}` : `Theme: ${title}`} onPress={() => void openPicker($)}>
      {`🎨 ${title}`}
    </Button>
  )
}

const quietly = async ($: EngineInterface, step: () => Promise<unknown>) => {
  try {
    await step()
  } catch (error) {
    await $.ui.log(`zy-themes: ${reasonOf(error)}`, { to: 'debug' })
  }
}

export const register: Register = (on, options) => {
  // The settings row: the theme button above the prompt can be turned off.
  const hasButton = options.button !== false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description:
        'A theme behind the chat. Alone it opens the Themes pane; "list" names the themes; a name applies one to this project (add "session" or "all"); "image <path>" uses your own picture; "off" clears.',
    })
    const kept = await $.store.get(LANG_KEY)
    if (kept === 'zh' || kept === 'en') await update($, lang, () => kept)
    if ((await read($, choice)).preview !== undefined) await update($, choice, was => ({ ...was, preview: undefined }))
    await quietly($, () => follow($, true))
    return next(e)
  })

  // Another session may have changed the project's choice: pick it up at each turn.
  on('prompt.submit', async ($, e, next) => {
    await quietly($, () => follow($))
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    try {
      return { text: await runCommand($, e.args) }
    } catch (error) {
      return { text: reasonOf(error) }
    }
  })

  // This hook runs for every mod's backdrop, and another mod can use the same scene name, so check both.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const scene = SCENES[e.props.scene]
    if (e.props.plugin !== PLUGIN || scene === undefined || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const theme = THEMES.find(t => t.id === e.props.scene)
    return <Svg isInteractive source={scene()} alt={theme ? `${theme.title}: ${theme.blurb}` : e.props.scene} />
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const images = await readImages($)
    const previews = new Map<string, string>(Object.entries(THUMBS))
    for (const img of images) {
      const base64 = await thumbOf($, img)
      if (base64 !== undefined) previews.set(img.id, base64)
    }
    return picker($, $.ui.resolve(e), e.surface, await read($, choice), images, previews, await read($, lang))
  })

  // Set once the button has been drawn on zy-quota's row in this session.
  let joined = false

  const showsButton = (e: { surface: string; props: { hasSurvey: boolean } }) =>
    hasButton && !e.props.hasSurvey && (e.surface === 'desktop' || e.surface === 'mobile')

  // The button above the prompt, where themes are drawn: one press opens the picker.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!showsButton(e)) return next(e)
    const { Box } = $.ui.resolve(e)
    return <Box flexDirection="row">{await themeButton($, e)}</Box>
  })

  // With zy-quota installed, the button sits at the end of its row rather than on a row of its own. zy-quota hands
  // the end of its row on, so this works whichever of the two sits higher in the chain.
  on('ui.render', { component: 'AbovePrompt', plugin: QUOTA }, async ($, e, next) => {
    const row = await next(e)
    if (!showsButton(e)) return row
    joined = true
    const { Box } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap="md">
        {row}
        {await themeButton($, e)}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePromptList' }, ($, e, next) => {
    const { rows } = e.props
    // Only once the button is on zy-quota's row: hiding the own row otherwise would leave no button at all.
    const isJoined = joined && rows.some(row => row.plugin === QUOTA) && rows.some(row => row.plugin === PLUGIN)
    return next(isJoined ? { ...e, props: { ...e.props, rows: rows.filter(row => row.plugin !== PLUGIN) } } : e)
  })
}
