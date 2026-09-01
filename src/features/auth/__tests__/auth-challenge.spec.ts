import { describe, expect, it } from 'vitest'
import { parseChinaPhone } from '@/domain/auth/auth'
import { fixtureAuthChallengeGateway } from '@/features/auth/api/fixture-auth-challenge-gateway'
import { parseAuthChallenge, parseResetReceipt } from '@/features/auth/api/auth-challenge-parser'
describe('auth challenge', () => {
  it('parses challenge and reset receipt', () => {
    expect(
      parseAuthChallenge({
        id: 'c1',
        phone: '13800138000',
        expiresAt: '2026-09-01T12:10:00Z',
        retryAt: '2026-09-01T12:01:00Z',
      }).ok,
    ).toBe(true)
    expect(parseResetReceipt({ userId: 'u1', resetAt: '2026-09-01T12:02:00Z' }).ok).toBe(true)
  })
  it('signs in with fixture code', async () =>
    expect(await fixtureAuthChallengeGateway.signIn('fixture-challenge', '2468')).toMatchObject({
      ok: true,
      data: { userId: 'demo-user' },
    }))
  it('rejects wrong code', async () =>
    expect(await fixtureAuthChallengeGateway.signIn('fixture-challenge', '0000')).toMatchObject({
      ok: false,
      error: { kind: 'unauthorized' },
    }))
  it('resets password', async () => {
    const phone = parseChinaPhone('13800138000')!
    const c = await fixtureAuthChallengeGateway.requestReset(phone)
    if (!c.ok) throw new Error()
    expect(
      await fixtureAuthChallengeGateway.resetPassword(c.data.id, '2468', 'new-password'),
    ).toMatchObject({ ok: true })
  })
})
