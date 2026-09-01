import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { createFixtureNotificationGateway } from '@/features/notification/api/fixture-notification-gateway'
import { parseNotificationPage } from '@/features/notification/api/notification-parser'
import { useNotificationStore } from '@/features/notification/store/notification'
const session: AuthSession = { userId: 'demo-user', displayName: 'Demo', accessToken: 'token' }
describe('notifications', () => {
  it('rejects invalid pages', () =>
    expect(parseNotificationPage({ notifications: [{}], nextCursor: null })).toMatchObject({
      ok: false,
      error: { kind: 'parse' },
    }))
  it('paginates and marks all read', async () => {
    setActivePinia(createPinia())
    const store = useNotificationStore()
    const gateway = createFixtureNotificationGateway(2)
    await store.load(session, { gateway })
    await store.load(session, { gateway, append: true })
    expect(store.notifications).toHaveLength(3)
    expect(store.unread).toBe(2)
    await store.markAll(session, gateway)
    expect(store.unread).toBe(0)
  })
})
