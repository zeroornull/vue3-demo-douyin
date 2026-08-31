import { describe, expect, it } from 'vitest'
import { validateFeedSearchQuery } from '@/features/feed/validation'

describe('validateFeedSearchQuery', () => {
  it('trims a valid query', () => {
    expect(validateFeedSearchQuery('  Vue  ')).toEqual({ ok: true, data: 'Vue' })
  })

  it('rejects an empty query', () => {
    expect(validateFeedSearchQuery('   ')).toMatchObject({
      ok: false,
      error: { kind: 'validation', fields: { query: expect.any(String) } },
    })
  })

  it('rejects more than 50 characters', () => {
    expect(validateFeedSearchQuery('a'.repeat(51))).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    })
  })
})
