export type Level = number

declare module 'claude-code' {
  interface PluginState {
    anbani: { level: Level }
  }
}
