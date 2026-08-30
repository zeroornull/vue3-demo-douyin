declare const productIdBrand: unique symbol

export type ProductId = string & { readonly [productIdBrand]: 'ProductId' }

export interface Product {
  readonly id: ProductId
  readonly name: string
  readonly coverFile: string
  readonly imageFiles: readonly string[]
  readonly listPriceCents: number
  readonly salePriceCents: number
  readonly soldCount: number
  readonly discountLabel: string | null
  readonly isRecentLowPrice: boolean
}

export function parseProductId(value: unknown): ProductId | null {
  return typeof value === 'string' && /^g[1-9]\d*$/.test(value) ? (value as ProductId) : null
}

export function formatProductPrice(cents: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)
}
