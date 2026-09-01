import { parseNotificationId, type AppNotification } from '@/domain/notification/notification'
import type { NotificationGateway } from './notification-gateway'
import { abortedFailure, success } from '@/shared/result'
const id = (value: string) => parseNotificationId(value)!
const initial: AppNotification[] = [
  {
    id: id('notice-1'),
    kind: 'system',
    title: '系统通知',
    body: '协议修订通知',
    createdAt: '2026-09-01T01:00:00Z',
    read: false,
  },
  {
    id: id('notice-2'),
    kind: 'task',
    title: '任务通知',
    body: '完成迁移学习任务',
    createdAt: '2026-08-31T01:00:00Z',
    read: false,
  },
  {
    id: id('notice-3'),
    kind: 'wallet',
    title: '钱包通知',
    body: '卡券发放提醒',
    createdAt: '2026-08-30T01:00:00Z',
    read: true,
  },
]
export function createFixtureNotificationGateway(pageSize = 2): NotificationGateway {
  let values = [...initial]
  return {
    async list(_session, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      const offset = options?.cursor ? Number(options.cursor) : 0
      const page = values.slice(offset, offset + pageSize)
      const next = offset + page.length
      return success({
        notifications: page,
        nextCursor: next < values.length ? String(next) : null,
      })
    },
    async markRead(_session, ids, signal) {
      await Promise.resolve()
      if (signal?.aborted) return abortedFailure()
      const selected = new Set(ids)
      values = values.map((value) => (selected.has(value.id) ? { ...value, read: true } : value))
      return success({ ids, readAt: '2026-09-01T02:00:00Z' })
    },
  }
}
export const fixtureNotificationGateway = createFixtureNotificationGateway()
