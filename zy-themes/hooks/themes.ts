import type { ThemeSetArgs } from 'claude-code'

/** A built-in theme: what the pane and the list say, the window it is made for, and the look it sets. */
export type Theme = {
  id: string
  title: string
  blurb: string
  window: 'light' | 'dark'
  look: ThemeSetArgs
}

// Three still paintings (JPEGs in backdrops/) and three animated scenes (scenes.ts). A look sets the backdrop alone, never
// `colors`: a palette paints the app's own surfaces, and its page color hides the painting behind it.
export const THEMES: readonly Theme[] = [
  {
    id: 'sakura',
    title: 'Sakura Dawn',
    blurb: 'Cherry blossoms over a misty lake at a pastel dawn.',
    window: 'light',
    look: { overrideColorScheme: 'light', backdrop: { image: { source: 'backdrops/sakura-dawn.jpg' } } },
  },
  {
    id: 'inkwash',
    title: 'Ink Mountains',
    blurb: 'Misty ink-wash mountains on rice paper at sunset.',
    window: 'light',
    look: { overrideColorScheme: 'light', backdrop: { image: { source: 'backdrops/ink-mountains.jpg' } } },
  },
  {
    id: 'petals',
    title: 'Petal Breeze',
    blurb: 'A cherry tree on a spring hill, petals drifting on the breeze. Animated.',
    window: 'light',
    look: {
      overrideColorScheme: 'light',
      backdrop: { scene: 'petals', glass: { blur: 16, tint: '#fbf8fc', opacity: 0.5 } },
    },
  },
  {
    id: 'moonlit',
    title: 'Moonlit Lake',
    blurb: 'A full moon over a still mountain lake.',
    window: 'dark',
    look: { overrideColorScheme: 'dark', backdrop: { image: { source: 'backdrops/moonlit-lake.jpg' } } },
  },
  {
    id: 'fireflies',
    title: 'Firefly Forest',
    blurb: 'Fireflies drift through a moonlit forest clearing. Animated.',
    window: 'dark',
    look: {
      overrideColorScheme: 'dark',
      backdrop: { scene: 'fireflies', glass: { blur: 18, tint: '#0b1a1a', opacity: 0.5 } },
    },
  },
  {
    id: 'starlit',
    title: 'Starlit Sea',
    blurb: 'The Milky Way over a calm sea, stars twinkling, a shooting star now and then. Animated.',
    window: 'dark',
    look: {
      overrideColorScheme: 'dark',
      backdrop: { scene: 'starlit', glass: { blur: 18, tint: '#120f22', opacity: 0.5 } },
    },
  },
]
