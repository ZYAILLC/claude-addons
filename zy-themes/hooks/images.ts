import type { EngineInterface } from 'claude-code'

/**
 * A picture of the person's own, kept as a theme. A backdrop image has to sit inside the mod's folder, so the picture is
 * copied there (`file`, relative to the folder); `from` is where it came from, so the copy can be made again after an
 * update replaces the folder.
 */
export type UserImage = { id: string; title: string; from: string; file: string }

const KEY = 'images'
const FOLDER = 'user-images'
const MAX_BYTES = 1024 * 1024
const AS_IS = /\.(jpe?g|png)$/i

const isImage = (v: unknown): v is UserImage =>
  typeof v === 'object' &&
  v !== null &&
  ['id', 'title', 'from', 'file'].every(k => typeof (v as Record<string, unknown>)[k] === 'string')

export async function readImages($: EngineInterface): Promise<UserImage[]> {
  const stored = await $.store.get(KEY)
  return Array.isArray(stored) ? stored.filter(isImage) : []
}

function writeImages($: EngineInterface, list: UserImage[]) {
  return $.store.set(KEY, list)
}

/** A name as typed or shown comes to one key: lower case, each run of anything else a hyphen. */
export const keyOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const baseName = (path: string) => path.split(/[\\/]/).pop() ?? path

const stem = (path: string) => baseName(path).replace(/\.[^.]+$/, '')

/** `~/x`, a relative path or an absolute one, made absolute. */
async function absolute($: EngineInterface, path: string) {
  const p = path.trim().replace(/^["']|["']$/g, '')
  if (p === '~' || p.startsWith('~/')) return `${(await $.env.get('HOME')) ?? ''}${p.slice(1)}`
  if (p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)) return p
  return `${await $.session.cwd()}/${p}`
}

async function sizeOf($: EngineInterface, path: string) {
  try {
    return (await $.fs.stat(path)).size
  } catch {
    return undefined
  }
}

async function run($: EngineInterface, argv: string[]) {
  try {
    return (await $.process.run(argv, { timeoutMs: 60_000 })).exitCode === 0
  } catch {
    return false
  }
}

/**
 * Copies a picture into the mod's folder as a backdrop can take it: a JPEG or PNG of at most 1 MiB and 4096 px a side.
 * On macOS `sips` scales it to 2560 px and saves a JPEG; elsewhere a JPEG or PNG under 1 MiB is copied as it is.
 * Answers the file relative to the mod's folder, or throws with words for the person.
 */
async function copyIn($: EngineInterface, from: string, id: string): Promise<string> {
  if ((await sizeOf($, from)) === undefined) throw new Error(`No file at ${from}.`)

  const root = $.plugin.root
  await run($, ['mkdir', '-p', `${root}/${FOLDER}`])

  const jpeg = `${FOLDER}/${id}.jpg`
  for (const [side, quality] of [
    ['2560', '80'],
    ['1920', '65'],
  ] as const) {
    const made = await run($, ['sips', '-Z', side, '-s', 'format', 'jpeg', '-s', 'formatOptions', quality, from, '--out', `${root}/${jpeg}`])
    if (!made) break
    const size = await sizeOf($, `${root}/${jpeg}`)
    if (size !== undefined && size <= MAX_BYTES) return jpeg
  }

  const ext = AS_IS.exec(from)?.[1]?.toLowerCase()
  const size = await sizeOf($, from)
  if (ext === undefined) throw new Error('Only JPEG and PNG pictures can be used here.')
  if (size === undefined || size > MAX_BYTES) {
    throw new Error('The picture is over 1 MiB. Save a smaller copy (about 2560 px wide, as a JPEG) and try again.')
  }
  const file = `${FOLDER}/${id}.${ext === 'png' ? 'png' : 'jpg'}`
  if (!(await run($, ['cp', from, `${root}/${file}`]))) throw new Error('The picture could not be copied.')
  return file
}

const thumbFile = (id: string) => `${FOLDER}/${id}-thumb.jpg`

// Previews read once per picture and reload; a picture made again drops its own.
const thumbs = new Map<string, string | null>()

/** A small JPEG preview of the picture, as base64, made beside the copy (macOS); undefined where none can be made. */
export async function thumbOf($: EngineInterface, image: UserImage): Promise<string | undefined> {
  const kept = thumbs.get(image.id)
  if (kept !== undefined) return kept ?? undefined
  const path = `${$.plugin.root}/${thumbFile(image.id)}`
  if ((await sizeOf($, path)) === undefined) {
    await run($, ['sips', '-Z', '288', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70', `${$.plugin.root}/${image.file}`, '--out', path])
  }
  let base64: string | null = null
  try {
    base64 = (await $.fs.read(path, { as: 'bytes' })).base64
  } catch {
    // No preview: the pane shows the name alone.
  }
  thumbs.set(image.id, base64)
  return base64 ?? undefined
}

/**
 * Asks for a picture in the system's own Open window (macOS). Answers its path, undefined when the person cancels, and
 * throws where there is no such window.
 */
export async function chooseFile($: EngineInterface, prompt: string): Promise<string | undefined> {
  let ran
  try {
    ran = await $.process.run(
      ['osascript', '-e', 'activate', '-e', `POSIX path of (choose file with prompt ${JSON.stringify(prompt)} of type {"public.image"})`],
      { timeoutMs: 600_000 },
    )
  } catch {
    throw new Error('NO_DIALOG')
  }
  if (ran.exitCode === 0) return ran.stdout.trim() || undefined
  // -128 is the person's Cancel.
  if (ran.stderr.includes('-128')) return undefined
  throw new Error(ran.stderr.trim() || 'The Open window failed.')
}

/** Adds a picture as a theme, or refreshes the one already made from the same file. */
export async function addImage($: EngineInterface, path: string): Promise<UserImage> {
  const from = await absolute($, path)
  const list = await readImages($)
  const same = list.find(img => img.from === from)
  const id = same?.id ?? uniqueId(`my-${keyOf(stem(from)) || 'image'}`, list)
  const file = await copyIn($, from, id)
  thumbs.delete(id)
  await run($, ['rm', '-f', `${$.plugin.root}/${thumbFile(id)}`])
  const image: UserImage = { id, title: stem(from), from, file }
  await writeImages($, [...list.filter(img => img.id !== id), image])
  return image
}

const uniqueId = (wanted: string, list: UserImage[]) => {
  let id = wanted
  for (let n = 2; list.some(img => img.id === id); n++) id = `${wanted}-${n}`
  return id
}

export async function removeImage($: EngineInterface, image: UserImage) {
  await run($, ['rm', '-f', `${$.plugin.root}/${image.file}`, `${$.plugin.root}/${thumbFile(image.id)}`])
  thumbs.delete(image.id)
  await writeImages($, (await readImages($)).filter(img => img.id !== image.id))
}

/** Makes sure the copy is in the mod's folder (an update replaces the folder): copies it again from where it came. */
export async function ensureCopy($: EngineInterface, image: UserImage): Promise<UserImage> {
  if ((await sizeOf($, `${$.plugin.root}/${image.file}`)) !== undefined) return image
  const file = await copyIn($, image.from, image.id)
  if (file === image.file) return image
  const fresh = { ...image, file }
  await writeImages($, (await readImages($)).map(img => (img.id === image.id ? fresh : img)))
  return fresh
}
