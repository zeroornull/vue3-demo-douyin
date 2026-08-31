import type { ProductId } from '@/domain/shop/product'

export interface AppEventMap {
  'auth:signed-in': {
    readonly userId: string
  }
  'shop:product-viewed': {
    readonly productId: ProductId
  }
}

export type AppEventName = keyof AppEventMap

export interface AppEvent<K extends AppEventName> {
  readonly type: K
  readonly payload: AppEventMap[K]
  readonly occurredAt: string
}

export function createAppEvent<K extends AppEventName>(
  type: K,
  payload: AppEventMap[K],
): AppEvent<K> {
  return {
    type,
    payload,
    occurredAt: new Date().toISOString(),
  }
}
