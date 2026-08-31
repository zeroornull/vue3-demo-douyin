import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { createHttpProfileGateway } from '@/features/profile/api/http-profile-gateway'
import type { HttpClient, HttpRequestOptions } from '@/infrastructure/http/http-client'
import { failure, success, type AppResult } from '@/shared/result'
import { profileResponse } from './profile-parser.spec'

const session: AuthSession = {
  userId: 'demo-user',
  displayName: 'Demo',
  accessToken: 'secret-token',
}

function client(result: AppResult<unknown>, records: HttpRequestOptions[] = []): HttpClient {
  return {
    async get(_path, options) {
      if (options) records.push(options)
      return result
    },
    async patch(_path, _body, options) {
      if (options) records.push(options)
      return result
    },
    async post() {
      return failure({ kind: 'unexpected', message: 'POST should not be used' })
    },
  }
}

describe('createHttpProfileGateway', () => {
  it('sends bearer auth and parses profile', async () => {
    const records: HttpRequestOptions[] = []
    const result = await createHttpProfileGateway(
      client(success(profileResponse), records),
    ).getCurrent(session)

    expect(result).toMatchObject({ ok: true, data: { userId: 'demo-user' } })
    expect(records[0]?.headers).toEqual({ Authorization: 'Bearer secret-token' })
  })

  it('maps 401 and 409 status', async () => {
    const unauthorized = createHttpProfileGateway(
      client(failure({ kind: 'http', message: '401', status: 401 })),
    )
    const conflict = createHttpProfileGateway(
      client(failure({ kind: 'http', message: '409', status: 409 })),
    )

    expect(await unauthorized.getCurrent(session)).toMatchObject({
      ok: false,
      error: { kind: 'unauthorized' },
    })
    expect(
      await conflict.update(
        session,
        {
          displayName: 'name',
          handle: 'handle',
          bio: '',
          age: null,
          gender: 'unspecified',
          province: '',
          city: '',
          school: null,
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { kind: 'conflict' } })
  })

  it('preserves non-auth HTTP errors', async () => {
    const gateway = createHttpProfileGateway(
      client(failure({ kind: 'http', message: '503', status: 503 })),
    )
    expect(await gateway.getCurrent(session)).toEqual({
      ok: false,
      error: { kind: 'http', message: '503', status: 503 },
    })
  })
})
