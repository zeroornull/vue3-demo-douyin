import type { AuthGateway } from './auth-gateway'
import { parseAuthSession } from './auth-session-parser'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'

export function createHttpAuthGateway(client: HttpClient): AuthGateway {
  return {
    async signIn(credentials, options) {
      const response = await client.post(
        '/auth/login',
        { phone: credentials.phone, password: credentials.password },
        options?.signal ? { signal: options.signal } : undefined,
      )
      if (!response.ok) {
        return response.error.kind === 'http' && response.error.status === 401
          ? failure({
              kind: 'unauthorized',
              message: '手机号或密码不正确。',
              status: 401,
            })
          : response
      }
      return parseAuthSession(response.data)
    },
  }
}
