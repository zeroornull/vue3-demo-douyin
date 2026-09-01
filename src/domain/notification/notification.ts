declare const notificationIdBrand: unique symbol

export type NotificationId = string & { readonly [notificationIdBrand]: 'NotificationId' }
export type NotificationKind = 'system' | 'task' | 'wallet'
export interface AppNotification {
  readonly id: NotificationId
  readonly kind: NotificationKind
  readonly title: string
  readonly body: string
  readonly createdAt: string
  readonly read: boolean
}
export interface NotificationPage {
  readonly notifications: readonly AppNotification[]
  readonly nextCursor: string | null
}
export interface NotificationReadReceipt {
  readonly ids: readonly NotificationId[]
  readonly readAt: string
}
export function parseNotificationId(value: unknown): NotificationId | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
    ? (value as NotificationId)
    : null
}
