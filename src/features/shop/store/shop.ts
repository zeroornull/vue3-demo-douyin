import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Product, ProductId } from '@/domain/shop/product'
import { createAppEvent, type AppEvent } from '@/shared/events'
import { failure, success, type AppError, type AppResult } from '@/shared/result'
import { fixtureShopGateway } from '@/features/shop/api/fixture-shop-gateway'
import type { GatewayRequestOptions, ShopGateway } from '@/features/shop/api/shop-gateway'

export type ShopStatus = 'empty' | 'error' | 'idle' | 'loading' | 'ready'
export type ProductViewedEvent = AppEvent<'shop:product-viewed'>

interface LoadShopOptions extends GatewayRequestOptions {
  readonly force?: boolean
  readonly gateway?: ShopGateway
}

export const useShopStore = defineStore('shop', () => {
  const items = ref<readonly Product[]>([])
  const status = ref<ShopStatus>('idle')
  const error = ref<AppError | null>(null)
  const lastViewedEvent = shallowRef<ProductViewedEvent | null>(null)
  let requestSequence = 0

  const byId = computed(() => new Map(items.value.map((product) => [product.id, product])))

  function findById(id: ProductId): Product | undefined {
    return byId.value.get(id)
  }

  async function load(options: LoadShopOptions = {}): Promise<AppResult<readonly Product[]>> {
    if (!options.force && (status.value === 'ready' || status.value === 'empty')) {
      return success(items.value)
    }

    const requestId = ++requestSequence
    status.value = 'loading'
    error.value = null
    const gateway = options.gateway ?? fixtureShopGateway
    let result: AppResult<readonly Product[]>
    try {
      result = await gateway.list(options.signal ? { signal: options.signal } : undefined)
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '商品服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }

    if (requestId !== requestSequence) return result
    if (result.ok) {
      items.value = result.data
      status.value = result.data.length ? 'ready' : 'empty'
    } else {
      items.value = []
      error.value = result.error
      status.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  function recordViewed(productId: ProductId) {
    lastViewedEvent.value = createAppEvent('shop:product-viewed', { productId })
  }

  function reset() {
    requestSequence += 1
    items.value = []
    status.value = 'idle'
    error.value = null
    lastViewedEvent.value = null
  }

  return {
    items,
    status,
    error,
    lastViewedEvent,
    findById,
    load,
    recordViewed,
    reset,
  }
})
