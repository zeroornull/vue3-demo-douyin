import type { ProfileGateway, ProfileRequestOptions } from './profile-gateway'
import { parseUserProfile } from './profile-parser'
import type { AuthSession } from '@/domain/auth/auth'
import type { HttpRequestOptions, HttpClient } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'

function requestOptions(session: AuthSession, options?: ProfileRequestOptions): HttpRequestOptions {
  return {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    ...(options?.signal ? { signal: options.signal } : {}),
  }
}

function mapProfileHttpError(
  error: Extract<Awaited<ReturnType<HttpClient['get']>>, { ok: false }>,
) {
  if (error.error.kind === 'http' && error.error.status === 401) {
    return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
  }
  if (error.error.kind === 'http' && error.error.status === 409) {
    return failure({
      kind: 'conflict',
      message: '资料已被其他设备更新，请重新加载。',
      status: 409,
    })
  }
  return error
}

export function createHttpProfileGateway(client: HttpClient): ProfileGateway {
  return {
    async getCurrent(session, options) {
      const response = await client.get('/profile/me', requestOptions(session, options))
      return response.ok ? parseUserProfile(response.data) : mapProfileHttpError(response)
    },

    async update(session, draft, expectedVersion, options) {
      const response = await client.patch(
        '/profile/me',
        { profile: draft, expectedVersion },
        requestOptions(session, options),
      )
      return response.ok ? parseUserProfile(response.data) : mapProfileHttpError(response)
    },
  }
}
