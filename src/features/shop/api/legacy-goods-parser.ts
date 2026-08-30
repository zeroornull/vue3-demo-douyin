import { parseProductId, type Product, type ProductId } from '@/domain/shop/product'
import { failure, success, type AppResult } from '@/shared/result'

interface LegacyGoodsDto {
  readonly cover: string
  readonly discount: string
  readonly imgs: readonly string[]
  readonly isLowPrice: boolean
  readonly name: string
  readonly price: number
  readonly real_price: number
  readonly sold: number
}

const safeImageFile = /^[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function nonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function parseDto(value: unknown, path: string): AppResult<LegacyGoodsDto> {
  if (!isRecord(value)) {
    return failure({ kind: 'parse', message: `${path} 必须是对象。` })
  }

  const errors: string[] = []
  if (!nonEmptyString(value.name)) errors.push(`${path}.name 必须是非空字符串`)
  if (!nonEmptyString(value.cover) || !safeImageFile.test(value.cover)) {
    errors.push(`${path}.cover 必须是安全的图片文件名`)
  }
  if (!Array.isArray(value.imgs) || value.imgs.length === 0) {
    errors.push(`${path}.imgs 必须是非空数组`)
  } else if (value.imgs.some((image) => !nonEmptyString(image) || !safeImageFile.test(image))) {
    errors.push(`${path}.imgs 只能包含安全的图片文件名`)
  }
  if (!nonNegativeNumber(value.price)) errors.push(`${path}.price 必须是非负有限数字`)
  if (!nonNegativeNumber(value.real_price)) {
    errors.push(`${path}.real_price 必须是非负有限数字`)
  }
  if (!Number.isInteger(value.sold) || !nonNegativeNumber(value.sold)) {
    errors.push(`${path}.sold 必须是非负整数`)
  }
  if (typeof value.discount !== 'string') errors.push(`${path}.discount 必须是字符串`)
  if (typeof value.isLowPrice !== 'boolean') {
    errors.push(`${path}.isLowPrice 必须是布尔值`)
  }

  if (errors.length) {
    return failure({
      kind: 'parse',
      message: `${path} 不符合旧商品契约。`,
      details: errors,
    })
  }

  const dto: LegacyGoodsDto = {
    cover: value.cover as string,
    discount: value.discount as string,
    imgs: value.imgs as string[],
    isLowPrice: value.isLowPrice as boolean,
    name: value.name as string,
    price: value.price as number,
    real_price: value.real_price as number,
    sold: value.sold as number,
  }
  if (!dto.imgs.includes(dto.cover)) {
    return failure({
      kind: 'parse',
      message: `${path}.cover 必须存在于 imgs 中。`,
    })
  }

  return success(dto)
}

function deriveProductId(cover: string): ProductId | null {
  const prefix = cover.match(/^(g[1-9]\d*)-/)?.[1]
  return parseProductId(prefix)
}

function toCents(value: number) {
  return Math.round(value * 100)
}

function toProduct(dto: LegacyGoodsDto): AppResult<Product> {
  const id = deriveProductId(dto.cover)
  if (!id) {
    return failure({
      kind: 'parse',
      message: `无法从 cover ${dto.cover} 派生稳定商品 ID。`,
    })
  }

  return success(
    Object.freeze({
      id,
      name: dto.name.trim(),
      coverFile: dto.cover,
      imageFiles: Object.freeze([...dto.imgs]),
      listPriceCents: toCents(dto.price),
      salePriceCents: toCents(dto.real_price),
      soldCount: dto.sold,
      discountLabel: dto.discount.trim() || null,
      isRecentLowPrice: dto.isLowPrice,
    }),
  )
}

export function parseLegacyGoodsList(input: unknown): AppResult<readonly Product[]> {
  if (!Array.isArray(input)) {
    return failure({
      kind: 'parse',
      message: '商品列表必须是数组。',
    })
  }

  const products: Product[] = []
  const ids = new Set<ProductId>()
  for (const [index, value] of input.entries()) {
    const dtoResult = parseDto(value, `goods[${index}]`)
    if (!dtoResult.ok) return dtoResult
    const productResult = toProduct(dtoResult.data)
    if (!productResult.ok) return productResult
    if (ids.has(productResult.data.id)) {
      return failure({
        kind: 'parse',
        message: `商品 ID ${productResult.data.id} 重复。`,
      })
    }
    ids.add(productResult.data.id)
    products.push(productResult.data)
  }

  return success(Object.freeze(products))
}
