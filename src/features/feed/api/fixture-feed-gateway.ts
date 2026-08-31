import { parseFeedId, type FeedItem } from '@/domain/feed/feed'
import type { FeedGateway } from './feed-gateway'
import { abortedFailure, failure, success } from '@/shared/result'

function feedId(value: string) {
  const parsed = parseFeedId(value)
  if (!parsed) throw new Error(`Invalid fixture feed ID: ${value}`)
  return parsed
}

export const FIXTURE_FEED_ID = feedId('feed-alley')

const fixtureItems: readonly FeedItem[] = [
  {
    id: FIXTURE_FEED_ID,
    author: { userId: 'author-home', displayName: '何以为家', handle: 'home_story' },
    caption: '穿过老巷时抬头看见的一束光。',
    coverUrl: '/feed/covers/alley.jpg',
    durationSeconds: 32,
    likeCount: 640_000,
    commentCount: 136_000,
    shareCount: 44_000,
    publishedAt: '2026-08-31T01:00:00.000Z',
    tags: ['城市', '旅行'],
  },
  {
    id: feedId('feed-field'),
    author: { userId: 'author-song', displayName: '浅唱↘我们的歌', handle: '33453' },
    caption: '风从田野经过，今天的云层很有电影感。',
    coverUrl: '/feed/covers/field.jpg',
    durationSeconds: 45,
    likeCount: 128_000,
    commentCount: 8_200,
    shareCount: 3_600,
    publishedAt: '2026-08-30T08:20:00.000Z',
    tags: ['自然', '风景'],
  },
  {
    id: feedId('feed-typescript'),
    author: { userId: 'author-ts', displayName: '迁移学习站', handle: 'strict_ts' },
    caption: '严格 TypeScript 的价值，是让非法状态更难进入页面。',
    coverUrl: '/feed/covers/alley.jpg',
    durationSeconds: 58,
    likeCount: 25_800,
    commentCount: 1_260,
    shareCount: 980,
    publishedAt: '2026-08-29T06:10:00.000Z',
    tags: ['TypeScript', '迁移'],
  },
  {
    id: feedId('feed-bun'),
    author: { userId: 'author-bun', displayName: 'Bun 工作台', handle: 'bun_workspace' },
    caption: '冻结安装、文本锁文件和可复现构建应该一起验证。',
    coverUrl: '/feed/covers/field.jpg',
    durationSeconds: 41,
    likeCount: 18_400,
    commentCount: 760,
    shareCount: 420,
    publishedAt: '2026-08-28T03:00:00.000Z',
    tags: ['Bun', '工程化'],
  },
  {
    id: feedId('feed-vue'),
    author: { userId: 'author-vue', displayName: 'Vue 观察室', handle: 'vue_current' },
    caption: 'Vue 页面也应从 runtime parser 接收数据，而不是相信 JSON 类型断言。',
    coverUrl: '/feed/covers/alley.jpg',
    durationSeconds: 52,
    likeCount: 31_500,
    commentCount: 1_480,
    shareCount: 860,
    publishedAt: '2026-08-27T11:30:00.000Z',
    tags: ['Vue', 'Parser'],
  },
  {
    id: feedId('feed-cursor'),
    author: { userId: 'author-api', displayName: '接口边界课', handle: 'api_boundary' },
    caption: 'Cursor 是服务端协议，不应该由组件自己猜下一页。',
    coverUrl: '/feed/covers/field.jpg',
    durationSeconds: 37,
    likeCount: 12_600,
    commentCount: 540,
    shareCount: 310,
    publishedAt: '2026-08-26T09:40:00.000Z',
    tags: ['Cursor', 'API'],
  },
]

function cursorOffset(cursor: string | undefined, size: number) {
  if (cursor === undefined) return success(0)
  const offset = Number(cursor)
  return Number.isInteger(offset) && offset >= 0 && offset <= size
    ? success(offset)
    : failure({ kind: 'parse', message: 'fixture Feed cursor 无效。' })
}

export function createFixtureFeedGateway(pageSize = 2): FeedGateway {
  function page(items: readonly FeedItem[], cursor?: string) {
    const offset = cursorOffset(cursor, items.length)
    if (!offset.ok) return offset
    const pageItems = items.slice(offset.data, offset.data + pageSize)
    const nextOffset = offset.data + pageItems.length
    return success({
      items: pageItems,
      nextCursor: nextOffset < items.length ? String(nextOffset) : null,
    })
  }

  return {
    async listFeed(options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      return page(fixtureItems, options?.cursor)
    },

    async searchFeed(query, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      const needle = query.toLocaleLowerCase('zh-CN')
      const matches = fixtureItems.filter((item) =>
        [item.caption, item.author.displayName, item.author.handle, ...item.tags]
          .join('\n')
          .toLocaleLowerCase('zh-CN')
          .includes(needle),
      )
      return page(matches, options?.cursor)
    },

    async getItem(id, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      const item = fixtureItems.find((candidate) => candidate.id === id)
      return item
        ? success(item)
        : failure({ kind: 'not-found', message: '内容不存在。', status: 404 })
    },
  }
}

export const fixtureFeedGateway = createFixtureFeedGateway()
