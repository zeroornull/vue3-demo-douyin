import { describe, expect, it } from 'vitest'
import { defineRouteMeta, parseRouteMeta } from '@/router/meta'

describe('route meta boundary', () => {
  it('defines and parses the required navigation contract', () => {
    const meta = defineRouteMeta({
      keepAlive: true,
      keepAliveName: 'ShopListView',
      migrationRound: 3,
      title: 'Shop',
      transition: 'forward',
    })

    expect(parseRouteMeta(meta)).toEqual(meta)
  })

  it('rejects a missing title', () => {
    expect(() => parseRouteMeta({ migrationRound: 3, transition: 'forward' })).toThrow('meta.title')
  })

  it('rejects an unknown transition', () => {
    expect(() => parseRouteMeta({ migrationRound: 3, title: 'Bad', transition: 'zoom' })).toThrow(
      'meta.transition',
    )
  })
})
