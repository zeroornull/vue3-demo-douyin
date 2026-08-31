import { describe, expect, it } from 'vitest'
import { parseChinaPhone } from '@/domain/auth/auth'
import {
  DEMO_PASSWORD,
  DEMO_PHONE,
  fixtureAuthGateway,
} from '@/features/auth/api/fixture-auth-gateway'

const phone = parseChinaPhone(DEMO_PHONE)
if (!phone) throw new Error('demo phone must be valid')

describe('fixtureAuthGateway', () => {
  it('signs in the documented demo credentials', async () => {
    expect(await fixtureAuthGateway.signIn({ phone, password: DEMO_PASSWORD })).toMatchObject({
      ok: true,
      data: { userId: 'demo-user' },
    })
  })

  it('returns unauthorized for the wrong password', async () => {
    expect(await fixtureAuthGateway.signIn({ phone, password: 'wrong-pass' })).toMatchObject({
      ok: false,
      error: { kind: 'unauthorized', status: 401 },
    })
  })

  it('returns aborted before checking credentials', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(
      await fixtureAuthGateway.signIn(
        { phone, password: DEMO_PASSWORD },
        { signal: controller.signal },
      ),
    ).toMatchObject({ ok: false, error: { kind: 'aborted' } })
  })
})
