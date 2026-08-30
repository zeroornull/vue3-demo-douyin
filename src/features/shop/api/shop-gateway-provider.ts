import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'
import { fixtureShopGateway } from './fixture-shop-gateway'
import { createHttpShopGateway } from './http-shop-gateway'
import type { ShopGateway } from './shop-gateway'

let cachedGateway: ShopGateway | undefined

export function getDefaultShopGateway(): ShopGateway {
  if (cachedGateway) return cachedGateway
  const config = getRuntimeConfig()
  cachedGateway =
    config.shopDataSource === 'fixture'
      ? fixtureShopGateway
      : createHttpShopGateway(
          createAxiosHttpClient({
            baseUrl: config.apiBaseUrl,
            timeoutMs: config.httpTimeoutMs,
          }),
        )
  return cachedGateway
}
