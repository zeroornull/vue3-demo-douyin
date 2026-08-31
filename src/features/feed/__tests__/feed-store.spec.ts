import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseFeedId } from '@/domain/feed/feed'
import { createFixtureFeedGateway, FIXTURE_FEED_ID } from '@/features/feed/api/fixture-feed-gateway'
import type { FeedGateway } from '@/features/feed/api/feed-gateway'
import { parseFeedItem } from '@/features/feed/api/feed-parser'
import { useFeedStore } from '@/features/feed/store/feed'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { success } from '@/shared/result'

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

describe('useFeedStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    appEventBus.clear()
  })

  it('loads and deduplicates cursor pages', async () => {
    const store = useFeedStore()
    const gateway = createFixtureFeedGateway(2)

    await store.loadFeed({ gateway })
    await store.loadFeed({ gateway, append: true })

    expect(store.items).toHaveLength(4)
    expect(new Set(store.items.map((item) => item.id)).size).toBe(4)
    expect(store.feedStatus).toBe('ready')
  })

  it('replaces current items during refresh', async () => {
    const first = parseFeedItem(feedItemResponse)
    const second = parseFeedItem({ ...feedItemResponse, id: 'feed-refreshed', caption: '刷新结果' })
    if (!first.ok || !second.ok) throw new Error('valid test feed expected')
    const base = createFixtureFeedGateway()
    let calls = 0
    const gateway: FeedGateway = {
      getItem: base.getItem,
      searchFeed: base.searchFeed,
      async listFeed() {
        calls += 1
        return success({ items: [calls === 1 ? first.data : second.data], nextCursor: null })
      },
    }
    const store = useFeedStore()
    await store.loadFeed({ gateway })

    await store.loadFeed({ gateway, refresh: true })

    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.id).toBe('feed-refreshed')
  })

  it('validates before search and cursor-paginates valid results', async () => {
    const base = createFixtureFeedGateway(1)
    let searchCalls = 0
    const gateway: FeedGateway = {
      getItem: base.getItem,
      listFeed: base.listFeed,
      async searchFeed(...args) {
        searchCalls += 1
        return base.searchFeed(...args)
      },
    }
    const store = useFeedStore()

    await store.searchFeed('e', { gateway })
    await store.searchFeed('e', { gateway, append: true })
    expect(store.searchItems.length).toBeGreaterThan(1)

    const invalid = await store.searchFeed('   ', { gateway })

    expect(invalid).toMatchObject({ ok: false, error: { kind: 'validation' } })
    expect(searchCalls).toBe(2)
    expect(store.searchItems).toEqual([])
  })

  it('loads stable detail and emits a typed viewed event', async () => {
    const viewed: string[] = []
    const off = appEventBus.on('feed:item-viewed', ({ feedId }) => viewed.push(feedId))
    const store = useFeedStore()

    await store.loadItem(FIXTURE_FEED_ID, { gateway: createFixtureFeedGateway() })
    off()

    expect(store.activeItem?.id).toBe(FIXTURE_FEED_ID)
    expect(store.detailStatus).toBe('ready')
    expect(viewed).toEqual([FIXTURE_FEED_ID])
  })

  it('keeps not-found separate from invalid route parsing', async () => {
    const store = useFeedStore()

    const result = await store.loadItem(parseFeedId('missing')!, {
      gateway: createFixtureFeedGateway(),
    })

    expect(result).toMatchObject({ ok: false, error: { kind: 'not-found' } })
    expect(store.detailStatus).toBe('error')
  })

  it('resets list, search, and detail state', async () => {
    const store = useFeedStore()
    const gateway = createFixtureFeedGateway()
    await store.loadFeed({ gateway })
    await store.searchFeed('Vue', { gateway })
    await store.loadItem(FIXTURE_FEED_ID, { gateway })

    store.reset()

    expect(store.items).toEqual([])
    expect(store.searchItems).toEqual([])
    expect(store.activeItem).toBeNull()
    expect(store.feedStatus).toBe('idle')
  })
})
