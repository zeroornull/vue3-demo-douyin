import 'vue-router'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    readonly migrationRound: 1 | 2
    readonly title: string
    readonly transition: 'back' | 'fade' | 'forward' | 'none'
    readonly keepAlive?: boolean
  }
}
