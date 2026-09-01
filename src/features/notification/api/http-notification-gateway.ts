import type { NotificationGateway } from './notification-gateway'
import { parseNotificationPage, parseNotificationReceipt } from './notification-parser'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'
function map(error: Extract<Awaited<ReturnType<HttpClient['post']>>, { ok: false }>) {
  return error.error.kind === 'http' && error.error.status === 401
    ? failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
    : error
}
export function createHttpNotificationGateway(client: HttpClient): NotificationGateway {
  return {
    async list(session, options) {
      const response = await client.get('/notifications', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        ...(options?.cursor ? { query: { cursor: options.cursor } } : {}),
        ...(options?.signal ? { signal: options.signal } : {}),
      })
      return response.ok ? parseNotificationPage(response.data) : map(response)
    },
    async markRead(session, ids, signal) {
      const response = await client.post(
        '/notifications/read',
        { ids },
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          ...(signal ? { signal } : {}),
        },
      )
      return response.ok ? parseNotificationReceipt(response.data) : map(response)
    },
  }
}
