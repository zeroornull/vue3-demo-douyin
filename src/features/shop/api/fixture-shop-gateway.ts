import rawGoodsFixture from '@/features/shop/data/goods.fixture.json'
import type { ProductId } from '@/domain/shop/product'
import { parseLegacyGoodsList } from './legacy-goods-parser'
import type { GatewayRequestOptions, ShopGateway } from './shop-gateway'
import { abortedFailure, failure, success } from '@/shared/result'

const fixtureInput: unknown = rawGoodsFixture

function isAborted(options?: GatewayRequestOptions) {
  return options?.signal?.aborted === true
}

async function listFixture(options?: GatewayRequestOptions) {
  await Promise.resolve()
  if (isAborted(options)) return abortedFailure()
  return parseLegacyGoodsList(fixtureInput)
}

export const fixtureShopGateway: ShopGateway = {
  list: listFixture,
  async getById(id: ProductId, options) {
    const listResult = await listFixture(options)
    if (!listResult.ok) return listResult
    const product = listResult.data.find((item) => item.id === id)
    return product
      ? success(product)
      : failure({ kind: 'not-found', message: `商品 ${id} 不存在。` })
  },
}
