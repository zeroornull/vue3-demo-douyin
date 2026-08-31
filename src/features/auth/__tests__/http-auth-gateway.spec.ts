import { describe, expect, it } from 'vitest'
import { parseChinaPhone } from '@/domain/auth/auth'
import { createHttpAuthGateway } from '@/features/auth/api/http-auth-gateway'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure, success } from '@/shared/result'

const phone = parseChinaPhone('13800138000')
if (!phone) throw new Error('test phone must be valid')
const credentials = { phone, password: 'douyin-demo' }

function clientWithPost(result: Awaited<ReturnType<HttpClient['post']>>): HttpClient {
  return {
    async get() {
      return failure({ kind: 'unexpected', message: 'GET should not be used' })
    },
    async post() {
      return result
    },
  }
}

describe('createHttpAuthGateway', () => {
  it('parses a successful session response', async () => {
    const gateway = createHttpAuthGateway(
      clientWithPost(
        success({
          user: { id: 'http-user', displayName: 'HTTP 用户' },
          accessToken: 'http-token',
        }),
      ),
    )

    expect(await gateway.signIn(credentials)).toMatchObject({
      ok: true,
      data: { userId: 'http-user' },
    })
  })

  it('maps HTTP 401 to unauthorized', async () => {
    const gateway = createHttpAuthGateway(
      clientWithPost(failure({ kind: 'http', message: 'HTTP 401', status: 401 })),
    )

    expect(await gateway.signIn(credentials)).toEqual({
      ok: false,
      error: { kind: 'unauthorized', message: '手机号或密码不正确。', status: 401 },
    })
  })

  it('preserves non-401 transport errors', async () => {
    const gateway = createHttpAuthGateway(
      clientWithPost(failure({ kind: 'http', message: 'HTTP 503', status: 503 })),
    )

    expect(await gateway.signIn(credentials)).toEqual({
      ok: false,
      error: { kind: 'http', message: 'HTTP 503', status: 503 },
    })
  })
})
