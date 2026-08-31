import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { createFixtureProfileGateway } from '@/features/profile/api/fixture-profile-gateway'

const session: AuthSession = {
  userId: 'demo-user',
  displayName: 'Demo',
  accessToken: 'token',
}

describe('createFixtureProfileGateway', () => {
  it('loads and version-updates the current user', async () => {
    const gateway = createFixtureProfileGateway()
    const current = await gateway.getCurrent(session)
    if (!current.ok) throw new Error(current.error.message)
    const updated = await gateway.update(
      session,
      { ...current.data, displayName: '新名字' },
      current.data.version,
    )

    expect(updated).toMatchObject({
      ok: true,
      data: { displayName: '新名字', version: 2 },
    })
  })

  it('returns conflict for a stale version', async () => {
    const gateway = createFixtureProfileGateway()
    const current = await gateway.getCurrent(session)
    if (!current.ok) throw new Error(current.error.message)

    expect(await gateway.update(session, { ...current.data }, 99)).toMatchObject({
      ok: false,
      error: { kind: 'conflict', status: 409 },
    })
  })

  it('returns unauthorized for another user', async () => {
    expect(
      await createFixtureProfileGateway().getCurrent({ ...session, userId: 'other-user' }),
    ).toMatchObject({ ok: false, error: { kind: 'unauthorized' } })
  })

  it('honors AbortSignal', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(
      await createFixtureProfileGateway().getCurrent(session, { signal: controller.signal }),
    ).toMatchObject({ ok: false, error: { kind: 'aborted' } })
  })
})
