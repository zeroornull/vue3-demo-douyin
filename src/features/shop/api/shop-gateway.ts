import type { Product, ProductId } from '@/domain/shop/product'
import type { AppResult } from '@/shared/result'

export interface GatewayRequestOptions {
  readonly signal?: AbortSignal
}

export interface ShopGateway {
  list(options?: GatewayRequestOptions): Promise<AppResult<readonly Product[]>>
  getById(id: ProductId, options?: GatewayRequestOptions): Promise<AppResult<Product>>
}
