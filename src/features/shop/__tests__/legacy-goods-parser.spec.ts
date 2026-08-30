import { describe, expect, it } from 'vitest'
import fixture from '@/features/shop/data/goods.fixture.json'
import { parseLegacyGoodsList } from '@/features/shop/api/legacy-goods-parser'

describe('parseLegacyGoodsList', () => {
  it('maps unknown legacy DTOs into immutable domain products', () => {
    const result = parseLegacyGoodsList(fixture as unknown)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.data).toHaveLength(6)
    const firstClothingProduct = result.data.find((product) => product.id === 'g1')
    expect(firstClothingProduct).toMatchObject({
      id: 'g1',
      coverFile: 'g1-0.jpg',
      listPriceCents: 3990,
      salePriceCents: 990,
    })
    expect(Object.isFrozen(result.data)).toBe(true)
    expect(Object.isFrozen(result.data[0])).toBe(true)
  })

  it('rejects unsafe image paths before they enter the domain', () => {
    const result = parseLegacyGoodsList([
      {
        ...fixture[0],
        cover: '../secret.jpg',
        imgs: ['../secret.jpg'],
      },
    ])

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'parse' },
    })
  })

  it('rejects duplicate stable IDs', () => {
    const result = parseLegacyGoodsList([fixture[0], fixture[0]])

    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'parse', message: expect.stringContaining('重复') },
    })
  })

  it('accepts an empty list as a valid empty state', () => {
    expect(parseLegacyGoodsList([])).toEqual({ ok: true, data: [] })
  })
})
