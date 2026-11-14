/** Where a choice is kept: this session alone, this project, or every project without a choice of its own. */
export type Scope = 'session' | 'project' | 'all'

export type Choice = {
  /** The theme this session shows, by id; absent, none of this mod's. */
  applied?: string
  /** Whose choice `applied` is. */
  scope?: Scope
  /** A theme shown for a look only, until the preview ends. */
  preview?: string
}

declare module 'claude-code' {
  interface PluginState {
    'zy-themes': { choice: Choice; lang: 'en' | 'zh' }
  }
}
