import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseProductId, type Product } from '@/domain/shop/product'
import type { ShopGateway } from '@/features/shop/api/shop-gateway'
import { fixtureShopGateway } from '@/features/shop/api/fixture-shop-gateway'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { useShopStore } from '@/features/shop/store/shop'
import { failure, success } from '@/shared/result'

const productId = parseProductId('g1')
if (!productId) throw new Error('test ProductId must be valid')

const product: Product = {
  id: productId,
  name: 'Test product',
  coverFile: 'g1-0.jpg',
  imageFiles: ['g1-0.jpg'],
  listPriceCents: 1000,
  salePriceCents: 800,
  soldCount: 2,
  discountLabel: null,
  isRecentLowPrice: false,
}

function gatewayReturning(items: readonly Product[]): ShopGateway {
  return {
    async list() {
      return success(items)
    },
    async getById(id) {
      const match = items.find((item) => item.id === id)
      return match
        ? success(match)
        : failure({ kind: 'not-found', message: 'missing test product' })
    },
  }
}

describe('useShopStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    appEventBus.clear()
  })

  it('moves from idle to ready and indexes products by branded ID', async () => {
    const store = useShopStore()

    const result = await store.load({ gateway: gatewayReturning([product]) })

    expect(result.ok).toBe(true)
    expect(store.status).toBe('ready')
    expect(store.findById(productId)).toEqual(product)
  })

  it('represents a valid empty response separately from failure', async () => {
    const store = useShopStore()

    await store.load({ gateway: gatewayReturning([]) })

    expect(store.status).toBe('empty')
    expect(store.error).toBeNull()
  })

  it('preserves a discriminated parse error', async () => {
    const gateway: ShopGateway = {
      async list() {
        return failure({ kind: 'parse', message: 'invalid fixture' })
      },
      async getById() {
        return failure({ kind: 'parse', message: 'invalid fixture' })
      },
    }
    const store = useShopStore()

    await store.load({ gateway })

    expect(store.status).toBe('error')
    expect(store.error).toEqual({ kind: 'parse', message: 'invalid fixture' })
  })

  it('returns to idle when a request is aborted', async () => {
    const store = useShopStore()
    const controller = new AbortController()
    controller.abort()

    const result = await store.load({
      gateway: fixtureShopGateway,
      signal: controller.signal,
    })

    expect(result).toMatchObject({ ok: false, error: { kind: 'aborted' } })
    expect(store.status).toBe('idle')
  })

  it('maps a thrown gateway error into the unexpected branch', async () => {
    const gateway: ShopGateway = {
      async list() {
        throw new Error('transport exploded')
      },
      async getById() {
        throw new Error('transport exploded')
      },
    }
    const store = useShopStore()

    const result = await store.load({ gateway })

    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: 'unexpected',
        details: ['transport exploded'],
      },
    })
    expect(store.status).toBe('error')
  })

  it('records a typed domain event when a product is viewed', () => {
    const store = useShopStore()
    const received: string[] = []
    const off = appEventBus.on('shop:product-viewed', ({ productId: viewedId }) =>
      received.push(viewedId),
    )

    store.recordViewed(productId)
    off()
    store.recordViewed(productId)

    expect(store.lastViewedEvent).toMatchObject({
      type: 'shop:product-viewed',
      payload: { productId: 'g1' },
    })
    expect(received).toEqual(['g1'])
    expect(appEventBus.listenerCount('shop:product-viewed')).toBe(0)
  })
})
