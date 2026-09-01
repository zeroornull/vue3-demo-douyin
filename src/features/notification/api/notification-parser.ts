import {
  parseNotificationId,
  type AppNotification,
  type NotificationId,
  type NotificationKind,
  type NotificationPage,
  type NotificationReadReceipt,
} from '@/domain/notification/notification'
import { failure, success, type AppResult } from '@/shared/result'
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function timestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}
function kind(value: unknown): value is NotificationKind {
  return value === 'system' || value === 'task' || value === 'wallet'
}
export function parseNotification(input: unknown): AppResult<AppNotification> {
  if (!record(input)) return failure({ kind: 'parse', message: '通知格式无效。' })
  const id = parseNotificationId(input.id)
  const errors: string[] = []
  if (!id) errors.push('id')
  if (!kind(input.kind)) errors.push('kind')
  if (typeof input.title !== 'string' || !input.title.trim()) errors.push('title')
  if (typeof input.body !== 'string' || !input.body.trim()) errors.push('body')
  if (!timestamp(input.createdAt)) errors.push('createdAt')
  if (typeof input.read !== 'boolean') errors.push('read')
  if (errors.length || !id || !kind(input.kind))
    return failure({ kind: 'parse', message: '通知字段无效。', details: errors })
  return success({
    id,
    kind: input.kind,
    title: input.title as string,
    body: input.body as string,
    createdAt: input.createdAt as string,
    read: input.read as boolean,
  })
}
export function parseNotificationPage(input: unknown): AppResult<NotificationPage> {
  if (!record(input) || !Array.isArray(input.notifications))
    return failure({ kind: 'parse', message: '通知列表格式无效。' })
  const values: AppNotification[] = []
  const errors: string[] = []
  const ids = new Set<string>()
  input.notifications.forEach((value, index) => {
    const parsed = parseNotification(value)
    if (!parsed.ok) errors.push(`notifications.${index}`)
    else if (ids.has(parsed.data.id)) errors.push(`notifications.${index}.duplicate`)
    else {
      ids.add(parsed.data.id)
      values.push(parsed.data)
    }
  })
  if (input.nextCursor !== null && (typeof input.nextCursor !== 'string' || !input.nextCursor))
    errors.push('nextCursor')
  return errors.length
    ? failure({ kind: 'parse', message: '通知列表字段无效。', details: errors })
    : success({ notifications: values, nextCursor: input.nextCursor as string | null })
}
export function parseNotificationReceipt(input: unknown): AppResult<NotificationReadReceipt> {
  if (!record(input) || !Array.isArray(input.ids) || !timestamp(input.readAt))
    return failure({ kind: 'parse', message: '通知已读回执无效。' })
  const ids = input.ids.map(parseNotificationId)
  if (ids.some((id) => !id)) return failure({ kind: 'parse', message: '通知已读回执字段无效。' })
  return success({ ids: ids as NotificationId[], readAt: input.readAt })
}
