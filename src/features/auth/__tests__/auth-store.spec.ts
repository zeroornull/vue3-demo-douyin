import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthGateway } from '@/features/auth/api/auth-gateway'
import { fixtureAuthGateway } from '@/features/auth/api/fixture-auth-gateway'
import { useAuthStore } from '@/features/auth/store/auth'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure } from '@/shared/result'

const validForm = {
  agreed: true,
  phone: '13800138000',
  password: 'douyin-demo',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    appEventBus.clear()
  })

  it('does not call the gateway when validation fails', async () => {
    let calls = 0
    const gateway: AuthGateway = {
      async signIn() {
        calls += 1
        return failure({ kind: 'unexpected', message: 'must not run' })
      },
    }
    const store = useAuthStore()

    const result = await store.signIn(
      { agreed: false, phone: 'bad', password: 'short' },
      { gateway },
    )

    expect(result).toMatchObject({ ok: false, error: { kind: 'validation' } })
    expect(calls).toBe(0)
    expect(store.fieldErrors).toHaveProperty('agreement')
  })

  it('stores a session and emits auth:signed-in', async () => {
    const users: string[] = []
    const off = appEventBus.on('auth:signed-in', ({ userId }) => users.push(userId))
    const store = useAuthStore()

    const result = await store.signIn(validForm, { gateway: fixtureAuthGateway })
    off()

    expect(result.ok).toBe(true)
    expect(store.status).toBe('authenticated')
    expect(store.isAuthenticated).toBe(true)
    expect(store.session?.accessToken).toBe('fixture-access-token')
    expect(users).toEqual(['demo-user'])
  })

  it('represents unauthorized separately from validation', async () => {
    const store = useAuthStore()

    await store.signIn({ ...validForm, password: 'wrong-pass' }, { gateway: fixtureAuthGateway })

    expect(store.status).toBe('error')
    expect(store.error).toMatchObject({ kind: 'unauthorized', status: 401 })
    expect(store.fieldErrors).toEqual({})
  })

  it('returns to idle after an aborted request', async () => {
    const controller = new AbortController()
    controller.abort()
    const store = useAuthStore()

    await store.signIn(validForm, {
      gateway: fixtureAuthGateway,
      signal: controller.signal,
    })

    expect(store.status).toBe('idle')
    expect(store.error).toMatchObject({ kind: 'aborted' })
  })

  it('clears session and errors on sign out', async () => {
    const store = useAuthStore()
    await store.signIn(validForm, { gateway: fixtureAuthGateway })

    store.signOut()

    expect(store.status).toBe('idle')
    expect(store.session).toBeNull()
    expect(store.error).toBeNull()
  })
})
