import { describe, expect, it } from 'vitest'
import {
  formatFeedCount,
  formatFeedDuration,
  formatFeedPublishedAt,
  parseFeedId,
} from '@/domain/feed/feed'

describe('feed domain', () => {
  it('accepts stable URL-safe feed IDs', () => {
    expect(parseFeedId('feed_2026-08')).toBe('feed_2026-08')
    expect(parseFeedId('feed.bad')).toBeNull()
    expect(parseFeedId('feed/bad')).toBeNull()
  })

  it('formats duration without relying on media elements', () => {
    expect(formatFeedDuration(5)).toBe('0:05')
    expect(formatFeedDuration(125)).toBe('2:05')
  })

  it('formats counts compactly', () => {
    expect(formatFeedCount(640_000)).toMatch(/64|万/)
  })

  it('formats dates in the product timezone', () => {
    expect(formatFeedPublishedAt('2026-08-31T01:00:00.000Z')).toContain('2026')
  })
})
