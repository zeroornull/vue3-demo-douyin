import { describe, expect, it } from 'vitest'
import { parseFeedId } from '@/domain/feed/feed'
import { createHttpFeedGateway } from '@/features/feed/api/http-feed-gateway'
import { validateFeedSearchQuery } from '@/features/feed/validation'
import type { HttpClient, HttpRequestOptions } from '@/infrastructure/http/http-client'
import { failure, success, type AppResult } from '@/shared/result'

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
const mediaSourceResponse = {
  src: '/feed/media/field-demo.mp4',
  mimeType: 'video/mp4',
  posterUrl: '/feed/covers/field.jpg',
  durationSeconds: 4,
}

interface RequestRecord {
  readonly method: 'GET' | 'PATCH' | 'POST'
  readonly options?: HttpRequestOptions
  readonly path: string
}

function client(results: AppResult<unknown>[], records: RequestRecord[] = []): HttpClient {
  function next() {
    return results.shift() ?? failure({ kind: 'unexpected', message: 'missing mock result' })
  }
  return {
    async get(path, options) {
      records.push({ method: 'GET', path, ...(options ? { options } : {}) })
      return next()
    },
    async patch(path, _body, options) {
      records.push({ method: 'PATCH', path, ...(options ? { options } : {}) })
      return next()
    },
    async post(path, _body, options) {
      records.push({ method: 'POST', path, ...(options ? { options } : {}) })
      return next()
    },
  }
}

describe('createHttpFeedGateway', () => {
  it('uses cursor query for list', async () => {
    const records: RequestRecord[] = []
    const gateway = createHttpFeedGateway(client([success(feedPageResponse)], records))

    await gateway.listFeed({ cursor: 'next-2' })

    expect(records[0]).toMatchObject({
      method: 'GET',
      path: '/feed',
      options: { query: { cursor: 'next-2' } },
    })
  })

  it('sends validated search query and cursor', async () => {
    const records: RequestRecord[] = []
    const query = validateFeedSearchQuery('Vue')
    if (!query.ok) throw new Error(query.error.message)
    const gateway = createHttpFeedGateway(client([success(feedPageResponse)], records))

    await gateway.searchFeed(query.data, { cursor: 'search-2' })

    expect(records[0]).toMatchObject({
      path: '/feed/search',
      options: { query: { q: 'Vue', cursor: 'search-2' } },
    })
  })

  it('parses stable detail and verifies the requested ID', async () => {
    const feedId = parseFeedId('feed-e2e')!
    const gateway = createHttpFeedGateway(
      client([success({ item: feedItemResponse, media: mediaSourceResponse })]),
    )
    expect(await gateway.getItem(feedId)).toMatchObject({
      ok: true,
      data: { item: { id: feedId }, media: { mimeType: 'video/mp4' } },
    })
  })

  it('maps 404 and preserves 503', async () => {
    const missing = createHttpFeedGateway(
      client([failure({ kind: 'http', message: '404', status: 404 })]),
    )
    const unavailable = createHttpFeedGateway(
      client([failure({ kind: 'http', message: '503', status: 503 })]),
    )
    expect(await missing.getItem(parseFeedId('missing')!)).toMatchObject({
      ok: false,
      error: { kind: 'not-found' },
    })
    expect(await unavailable.listFeed()).toEqual({
      ok: false,
      error: { kind: 'http', message: '503', status: 503 },
    })
  })
})
