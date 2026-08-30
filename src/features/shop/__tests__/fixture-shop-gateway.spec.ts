import { describe, expect, it } from 'vitest'
import { parseProductId } from '@/domain/shop/product'
import { fixtureShopGateway } from '@/features/shop/api/fixture-shop-gateway'

describe('fixtureShopGateway', () => {
  it('returns the six unique verified products', async () => {
    const result = await fixtureShopGateway.list()

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.data.map((product) => product.id)).toEqual(['g6', 'g1', 'g2', 'g3', 'g4', 'g5'])
  })

  it('finds a product by its stable ID', async () => {
    const id = parseProductId('g6')
    if (!id) throw new Error('g6 must be a valid ProductId')

    const result = await fixtureShopGateway.getById(id)
    expect(result).toMatchObject({ ok: true, data: { id: 'g6' } })
  })

  it('returns a discriminated not-found error', async () => {
    const id = parseProductId('g99')
    if (!id) throw new Error('g99 must be a valid ProductId')

    expect(await fixtureShopGateway.getById(id)).toMatchObject({
      ok: false,
      error: { kind: 'not-found' },
    })
  })

  it('returns an aborted result without parsing data', async () => {
    const controller = new AbortController()
    controller.abort()

    expect(await fixtureShopGateway.list({ signal: controller.signal })).toEqual({
      ok: false,
      error: { kind: 'aborted', message: '请求已取消。' },
    })
  })
})
