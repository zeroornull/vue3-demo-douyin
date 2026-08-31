import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { createFixtureProfileGateway } from '@/features/profile/api/fixture-profile-gateway'
import type { ProfileGateway } from '@/features/profile/api/profile-gateway'
import { useProfileStore } from '@/features/profile/store/profile'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure } from '@/shared/result'

const session: AuthSession = {
  userId: 'demo-user',
  displayName: 'Demo',
  accessToken: 'token',
}

describe('useProfileStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    appEventBus.clear()
  })

  it('loads profile and creates a clean draft', async () => {
    const store = useProfileStore()

    await store.load(session, { gateway: createFixtureProfileGateway() })

    expect(store.status).toBe('ready')
    expect(store.profile?.userId).toBe('demo-user')
    expect(store.draft?.displayName).toContain('杨老虎')
    expect(store.isDirty).toBe(false)
  })

  it('tracks dirty state and validation errors', async () => {
    const store = useProfileStore()
    await store.load(session, { gateway: createFixtureProfileGateway() })
    store.updateDraft({ displayName: '' })

    const result = await store.save(session, { gateway: createFixtureProfileGateway() })

    expect(store.isDirty).toBe(true)
    expect(result).toMatchObject({ ok: false, error: { kind: 'validation' } })
    expect(store.fieldErrors).toHaveProperty('displayName')
  })

  it('saves, increments version, clears dirty state, and emits an event', async () => {
    const gateway = createFixtureProfileGateway()
    const store = useProfileStore()
    const versions: number[] = []
    const off = appEventBus.on('profile:updated', ({ version }) => versions.push(version))
    await store.load(session, { gateway })
    store.updateDraft({ displayName: '更新名字' })

    const result = await store.save(session, { gateway })
    off()

    expect(result).toMatchObject({ ok: true, data: { displayName: '更新名字', version: 2 } })
    expect(store.isDirty).toBe(false)
    expect(versions).toEqual([2])
  })

  it('keeps the local draft on a conflict', async () => {
    const base = createFixtureProfileGateway()
    const conflictGateway: ProfileGateway = {
      getCurrent: base.getCurrent,
      async update() {
        return failure({ kind: 'conflict', message: 'stale', status: 409 })
      },
    }
    const store = useProfileStore()
    await store.load(session, { gateway: conflictGateway })
    store.updateDraft({ displayName: '本地修改' })

    await store.save(session, { gateway: conflictGateway })

    expect(store.status).toBe('conflict')
    expect(store.draft?.displayName).toBe('本地修改')
    expect(store.profile?.displayName).not.toBe('本地修改')
  })

  it('rejects a profile belonging to another session', async () => {
    const gateway = createFixtureProfileGateway()
    const store = useProfileStore()

    const result = await store.load({ ...session, userId: 'other-user' }, { gateway })

    expect(result).toMatchObject({ ok: false, error: { kind: 'unauthorized' } })
    expect(store.status).toBe('error')
  })

  it('resets all user data', async () => {
    const store = useProfileStore()
    await store.load(session, { gateway: createFixtureProfileGateway() })

    store.reset()

    expect(store.profile).toBeNull()
    expect(store.draft).toBeNull()
    expect(store.status).toBe('idle')
  })
})
