import type { AuthChallengeGateway } from './auth-challenge-gateway'
import { parseAuthChallenge, parseResetReceipt } from './auth-challenge-parser'
import { parseAuthSession } from './auth-session-parser'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'
const map = (r: Extract<Awaited<ReturnType<HttpClient['post']>>, { ok: false }>) =>
  r.error.kind === 'http' && r.error.status === 429
    ? failure({ kind: 'rate-limit', message: '请求过于频繁，请稍后再试。', status: 429 })
    : r
export function createHttpAuthChallengeGateway(client: HttpClient): AuthChallengeGateway {
  return {
    async requestCode(phone, signal) {
      const r = await client.post('/auth/code/request', { phone }, signal ? { signal } : undefined)
      return r.ok ? parseAuthChallenge(r.data) : map(r)
    },
    async signIn(challengeId, code, signal) {
      const r = await client.post(
        '/auth/code/verify',
        { challengeId, code },
        signal ? { signal } : undefined,
      )
      return r.ok ? parseAuthSession(r.data) : map(r)
    },
    async requestReset(phone, signal) {
      const r = await client.post(
        '/auth/password/request-reset',
        { phone },
        signal ? { signal } : undefined,
      )
      return r.ok ? parseAuthChallenge(r.data) : map(r)
    },
    async resetPassword(challengeId, code, password, signal) {
      const r = await client.post(
        '/auth/password/reset',
        { challengeId, code, password },
        signal ? { signal } : undefined,
      )
      return r.ok ? parseResetReceipt(r.data) : map(r)
    },
  }
}
