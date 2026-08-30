import type { ProductId } from '@/domain/shop/product'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure, success } from '@/shared/result'
import { parseLegacyGoodsList } from './legacy-goods-parser'
import type { GatewayRequestOptions, ShopGateway } from './shop-gateway'

function requestOptions(options?: GatewayRequestOptions) {
  return options?.signal ? { signal: options.signal } : undefined
}

export function createHttpShopGateway(client: HttpClient): ShopGateway {
  return {
    async list(options) {
      const response = await client.get('/shop/products', requestOptions(options))
      if (!response.ok) return response
      return parseLegacyGoodsList(response.data)
    },

    async getById(id: ProductId, options) {
      const response = await client.get(
        `/shop/products/${encodeURIComponent(id)}`,
        requestOptions(options),
      )
      if (!response.ok) return response
      const parsed = parseLegacyGoodsList([response.data])
      if (!parsed.ok) return parsed
      const product = parsed.data[0]
      if (!product || product.id !== id) {
        return failure({ kind: 'not-found', message: `商品 ${id} 不存在。` })
      }
      return success(product)
    },
  }
}
