import type { AuthGateway } from './auth-gateway'
import { abortedFailure, failure, success } from '@/shared/result'

export const DEMO_PHONE = '13800138000'
export const DEMO_PASSWORD = 'douyin-demo'

export const fixtureAuthGateway: AuthGateway = {
  async signIn(credentials, options) {
    await Promise.resolve()
    if (options?.signal?.aborted) return abortedFailure()
    if (credentials.phone !== DEMO_PHONE || credentials.password !== DEMO_PASSWORD) {
      return failure({
        kind: 'unauthorized',
        message: '手机号或密码不正确。',
        status: 401,
      })
    }
    return success(
      Object.freeze({
        userId: 'demo-user',
        displayName: '迁移演示用户',
        accessToken: 'fixture-access-token',
      }),
    )
  },
}
