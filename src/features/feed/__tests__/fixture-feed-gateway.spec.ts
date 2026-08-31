import { describe, expect, it } from 'vitest'
import { parseFeedId } from '@/domain/feed/feed'
import { validateFeedSearchQuery } from '@/features/feed/validation'
import { createFixtureFeedGateway, FIXTURE_FEED_ID } from '@/features/feed/api/fixture-feed-gateway'

describe('createFixtureFeedGateway', () => {
  it('cursor-paginates the recommendation feed', async () => {
    const gateway = createFixtureFeedGateway(2)
    const first = await gateway.listFeed()
    if (!first.ok) throw new Error(first.error.message)
    const second = await gateway.listFeed({ cursor: first.data.nextCursor! })

    expect(first.data.items).toHaveLength(2)
    expect(second).toMatchObject({ ok: true, data: { items: expect.any(Array) } })
  })

  it('searches captions, authors, handles, and tags', async () => {
    const query = validateFeedSearchQuery('TypeScript')
    if (!query.ok) throw new Error(query.error.message)

    expect(await createFixtureFeedGateway().searchFeed(query.data)).toMatchObject({
      ok: true,
      data: { items: [{ id: 'feed-typescript' }] },
    })
  })

  it('loads detail and returns not-found explicitly', async () => {
    const gateway = createFixtureFeedGateway()
    expect(await gateway.getItem(FIXTURE_FEED_ID)).toMatchObject({
      ok: true,
      data: { id: FIXTURE_FEED_ID },
    })
    expect(await gateway.getItem(parseFeedId('missing')!)).toMatchObject({
      ok: false,
      error: { kind: 'not-found' },
    })
  })

  it('honors abort and rejects an invalid cursor', async () => {
    const controller = new AbortController()
    controller.abort()
    const gateway = createFixtureFeedGateway()
    expect(await gateway.listFeed({ signal: controller.signal })).toMatchObject({
      ok: false,
      error: { kind: 'aborted' },
    })
    expect(await gateway.listFeed({ cursor: 'outside' })).toMatchObject({
      ok: false,
      error: { kind: 'parse' },
    })
  })
})
