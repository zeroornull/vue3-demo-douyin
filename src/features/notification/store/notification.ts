import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '@/domain/auth/auth'
import type {
  AppNotification,
  NotificationId,
  NotificationPage,
} from '@/domain/notification/notification'
import type { NotificationGateway } from '@/features/notification/api/notification-gateway'
import { getDefaultNotificationGateway } from '@/features/notification/api/notification-gateway-provider'
import { failure, type AppError, type AppResult } from '@/shared/result'
export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<AppNotification[]>([])
  const nextCursor = ref<string | null>(null)
  const status = ref<'idle' | 'loading' | 'loading-more' | 'ready' | 'updating' | 'error'>('idle')
  const error = ref<AppError | null>(null)
  let sequence = 0
  const unread = computed(() => notifications.value.filter((item) => !item.read).length)
  async function load(
    session: AuthSession,
    options: { append?: boolean; gateway?: NotificationGateway; signal?: AbortSignal } = {},
  ): Promise<AppResult<NotificationPage>> {
    const append = options.append === true
    const cursor = append ? nextCursor.value : null
    const request = ++sequence
    status.value = append ? 'loading-more' : 'loading'
    let result
    try {
      result = await (options.gateway ?? getDefaultNotificationGateway()).list(session, {
        ...(cursor ? { cursor } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      })
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '通知服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (request !== sequence) return result
    if (result.ok) {
      const ids = new Set(notifications.value.map((x) => x.id))
      notifications.value = append
        ? [...notifications.value, ...result.data.notifications.filter((x) => !ids.has(x.id))]
        : [...result.data.notifications]
      nextCursor.value = result.data.nextCursor
      status.value = 'ready'
      error.value = null
    } else {
      error.value = result.error
      status.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }
  async function mark(
    session: AuthSession,
    ids: readonly NotificationId[],
    gateway?: NotificationGateway,
  ) {
    if (!ids.length) return failure({ kind: 'validation', message: '没有需要标记的通知。' })
    status.value = 'updating'
    const result = await (gateway ?? getDefaultNotificationGateway()).markRead(session, ids)
    if (result.ok) {
      const selected = new Set(result.data.ids)
      notifications.value = notifications.value.map((x) =>
        selected.has(x.id) ? { ...x, read: true } : x,
      )
      status.value = 'ready'
      error.value = null
    } else {
      status.value = 'error'
      error.value = result.error
    }
    return result
  }
  return {
    notifications,
    nextCursor,
    status,
    error,
    unread,
    load,
    mark,
    markAll: (session: AuthSession, gateway?: NotificationGateway) =>
      mark(
        session,
        notifications.value.filter((x) => !x.read).map((x) => x.id),
        gateway,
      ),
  }
})
