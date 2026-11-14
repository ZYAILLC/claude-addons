// One rate-limit window: `five_hour` or `seven_day`, with the share used so far.
export type Quota = { kind: string; percentUsed: number; resetsAt?: string }

// `checked` is false until the profile request has finished; `renewsAt` is null when there is no date.
export type Account = { checked: boolean; renewsAt: string | null }

declare module 'claude-code' {
  interface PluginState {
    'quota-gauge': { limits: Quota[]; now: number; account: Account }
  }
}
