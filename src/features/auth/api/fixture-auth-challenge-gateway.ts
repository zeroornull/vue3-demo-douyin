import type { AuthChallengeGateway } from './auth-challenge-gateway'
import { abortedFailure, failure, success } from '@/shared/result'
const challenge = (phone: Parameters<AuthChallengeGateway['requestCode']>[0]) => ({
  id: 'fixture-challenge',
  phone,
  expiresAt: '2026-09-01T12:10:00Z',
  retryAt: '2026-09-01T12:01:00Z',
})
export const fixtureAuthChallengeGateway: AuthChallengeGateway = {
  async requestCode(phone, signal) {
    await Promise.resolve()
    return signal?.aborted ? abortedFailure() : success(challenge(phone))
  },
  async signIn(id, code, signal) {
    await Promise.resolve()
    if (signal?.aborted) return abortedFailure()
    return id === 'fixture-challenge' && code === '2468'
      ? success({
          userId: 'demo-user',
          displayName: '验证码用户',
          accessToken: 'fixture-code-token',
        })
      : failure({ kind: 'unauthorized', message: '验证码不正确。', status: 401 })
  },
  async requestReset(phone, signal) {
    await Promise.resolve()
    return signal?.aborted ? abortedFailure() : success(challenge(phone))
  },
  async resetPassword(id, code, password, signal) {
    await Promise.resolve()
    if (signal?.aborted) return abortedFailure()
    if (id !== 'fixture-challenge' || code !== '2468')
      return failure({ kind: 'unauthorized', message: '验证码不正确。', status: 401 })
    if (password.length < 8)
      return failure({ kind: 'validation', message: '新密码至少 8 个字符。' })
    return success({ userId: 'demo-user', resetAt: '2026-09-01T12:02:00Z' })
  },
}
