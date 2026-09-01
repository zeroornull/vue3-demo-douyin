export type NotificationKind = 'system' | 'task' | 'wallet'
export interface AppNotification {
  readonly id: string
  readonly kind: NotificationKind
  readonly title: string
  readonly body: string
  readonly createdAt: string
  readonly read: boolean
}
