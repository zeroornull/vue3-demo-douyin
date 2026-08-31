import { describe, expect, it } from 'vitest'
import fixture from '@/features/shop/data/goods.fixture.json'
import { createHttpShopGateway } from '@/features/shop/api/http-shop-gateway'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure, success } from '@/shared/result'
import { parseProductId } from '@/domain/shop/product'

function clientWithGet(result: Awaited<ReturnType<HttpClient['get']>>): HttpClient {
  return {
    async get() {
      return result
    },
    async post() {
      return failure({ kind: 'unexpected', message: 'POST should not be used' })
    },
  }
}

describe('createHttpShopGateway', () => {
  it('parses an unknown HTTP list response', async () => {
    const client = clientWithGet(success(fixture as unknown))

    const result = await createHttpShopGateway(client).list()

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.data).toHaveLength(6)
    expect(result.data[0]?.id).toBe('g6')
  })

  it('preserves an HTTP error without running the DTO parser', async () => {
    const client = clientWithGet(
      failure({ kind: 'http', message: 'HTTP 请求失败（503）。', status: 503 }),
    )

    expect(await createHttpShopGateway(client).list()).toEqual({
      ok: false,
      error: { kind: 'http', message: 'HTTP 请求失败（503）。', status: 503 },
    })
  })

  it('rejects a detail payload whose ID does not match the requested ID', async () => {
    const client = clientWithGet(success(fixture[0] as unknown))
    const requestedId = parseProductId('g1')
    if (!requestedId) throw new Error('g1 must be valid')

    expect(await createHttpShopGateway(client).getById(requestedId)).toMatchObject({
      ok: false,
      error: { kind: 'not-found' },
    })
  })
})
