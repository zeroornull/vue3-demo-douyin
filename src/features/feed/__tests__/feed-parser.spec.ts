import { describe, expect, it } from 'vitest'
import { parseFeedDetail, parseFeedItem, parseFeedPage } from '@/features/feed/api/feed-parser'

const feedItemResponse = {
  id: 'feed-e2e',
  author: { userId: 'author-e2e', displayName: 'E2E 作者', handle: 'e2e_author' },
  caption: 'E2E 推荐内容',
  coverUrl: '/feed/covers/field.jpg',
  durationSeconds: 42,
  likeCount: 1000,
  commentCount: 20,
  shareCount: 10,
  publishedAt: '2026-08-31T01:00:00.000Z',
  tags: ['E2E', '迁移'],
}

const feedPageResponse = { items: [feedItemResponse], nextCursor: null }

describe('feed response parsers', () => {
  it('parses and freezes valid pages and detail', () => {
    const page = parseFeedPage(feedPageResponse)
    const detail = parseFeedDetail({ item: feedItemResponse })
    expect(page).toMatchObject({ ok: true, data: { items: [{ id: 'feed-e2e' }] } })
    expect(detail).toMatchObject({ ok: true, data: { id: 'feed-e2e' } })
    if (!page.ok) throw new Error(page.error.message)
    expect(Object.isFrozen(page.data)).toBe(true)
    expect(Object.isFrozen(page.data.items[0])).toBe(true)
  })

  it('rejects external cover URLs', () => {
    expect(
      parseFeedItem({ ...feedItemResponse, coverUrl: 'https://example.test/cover.jpg' }),
    ).toMatchObject({ ok: false, error: { kind: 'parse', details: ['coverUrl'] } })
    expect(parseFeedItem({ ...feedItemResponse, coverUrl: '/feed/covers/..' })).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['coverUrl'] },
    })
  })

  it('rejects duplicate IDs and invalid cursor', () => {
    expect(
      parseFeedPage({ items: [feedItemResponse, feedItemResponse], nextCursor: 2 }),
    ).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['items.1.duplicate', 'nextCursor'] },
    })
  })

  it('reports invalid nested fields', () => {
    expect(parseFeedItem({ ...feedItemResponse, durationSeconds: 0, tags: [''] })).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['durationSeconds', 'tags'] },
    })
  })
})
