import type { ThemeColors } from 'claude-code'

import { makeColors } from './make-colors.js'

type Anchors = {
  'surface-0': string
  'surface-1': string
  'surface-2': string
  'surface-3'?: string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
}

type Roles = Record<'accent' | 'danger' | 'success' | 'warning' | 'pro', string>

/** A palette for one window mode, its grays tinted from the painting and its roles tuned toward it. */
const palette = (label: string, mode: 'light' | 'dark', roles: Roles, anchors: Anchors): ThemeColors => {
  const { theme, problems } = makeColors({ label, only: mode, roles, [mode]: { gray: { anchors } } })
  // Desktop ignores a whole theme it won't paint; the tests hold every palette to that.
  const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
  if (unpainted !== undefined) throw new Error(`${label}: ${unpainted}`)
  return theme
}

// Each palette takes its grays from its painting: pink-white dawn, rice paper, a green spring hill, a blue moonlit night,
// a teal forest and a violet sky. Reds, greens and ambers keep their meaning, leaning toward the painting.
export const PALETTES = {
  sakura: palette(
    'Sakura Dawn',
    'light',
    { accent: '#c2477a', danger: '#b8323f', success: '#4f7f4a', warning: '#a8701a', pro: '#7a54a0' },
    {
      'surface-0': '#f5e8ed',
      'surface-1': '#f9eff3',
      'surface-2': '#fcf6f8',
      'text-primary': '#2e1f27',
      'text-secondary': '#5a4550',
      'text-muted': '#705a66',
    },
  ),
  inkwash: palette(
    'Ink Mountains',
    'light',
    { accent: '#3d5c74', danger: '#a8362a', success: '#56783e', warning: '#a5711b', pro: '#6b5289' },
    {
      'surface-0': '#ebe3d5',
      'surface-1': '#f2ebdf',
      'surface-2': '#f8f3ea',
      'text-primary': '#23211e',
      'text-secondary': '#4d4840',
      'text-muted': '#625b51',
    },
  ),
  petals: palette(
    'Petal Breeze',
    'light',
    { accent: '#c4517f', danger: '#b5352f', success: '#3f8240', warning: '#a7721a', pro: '#7d55a3' },
    {
      'surface-0': '#edf0e3',
      'surface-1': '#f3f5eb',
      'surface-2': '#f9faf3',
      'text-primary': '#232a1f',
      'text-secondary': '#4a5343',
      'text-muted': '#5f6857',
    },
  ),
  moonlit: palette(
    'Moonlit Lake',
    'dark',
    { accent: '#7fa7e0', danger: '#e0707a', success: '#77c08f', warning: '#e0b45e', pro: '#b598e6' },
    {
      'surface-0': '#0e1524',
      'surface-1': '#141c2e',
      'surface-2': '#1a2337',
      'surface-3': '#1f283d',
      'text-primary': '#e6ecf7',
      'text-secondary': '#b8c3d8',
      'text-muted': '#95a2ba',
    },
  ),
  fireflies: palette(
    'Firefly Forest',
    'dark',
    { accent: '#c9e66a', danger: '#e47a6e', success: '#6cc28a', warning: '#e6c25a', pro: '#a894e0' },
    {
      'surface-0': '#0c1614',
      'surface-1': '#121e1b',
      'surface-2': '#182623',
      'surface-3': '#1d2c28',
      'text-primary': '#e4f0e8',
      'text-secondary': '#b6c9bd',
      'text-muted': '#92a99b',
    },
  ),
  starlit: palette(
    'Starlit Sea',
    'dark',
    { accent: '#9d8cf0', danger: '#ec7a8c', success: '#74c9a0', warning: '#ecbf62', pro: '#d08fe0' },
    {
      'surface-0': '#110e1f',
      'surface-1': '#181429',
      'surface-2': '#1e1a33',
      'surface-3': '#231e3a',
      'text-primary': '#ece8fa',
      'text-secondary': '#c3bddc',
      'text-muted': '#a09abd',
    },
  ),
} satisfies Record<string, ThemeColors>
