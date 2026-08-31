import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { parseFeedId, type FeedItem } from '@/domain/feed/feed'
import { createFixtureInteractionGateway } from '@/features/interaction/api/fixture-interaction-gateway'
import type { InteractionGateway } from '@/features/interaction/api/interaction-gateway'
import { useInteractionStore } from '@/features/interaction/store/interaction'
import { failure } from '@/shared/result'

const feedId = parseFeedId('feed-alley')!
const item: FeedItem = {
  id: feedId,
  author: { userId: 'a', displayName: 'A', handle: 'a' },
  caption: 'c',
  coverUrl: '/feed/covers/alley.jpg',
  durationSeconds: 4,
  likeCount: 640000,
  commentCount: 3,
  shareCount: 1,
  publishedAt: '2026-08-31T01:00:00Z',
  tags: [],
}
const session: AuthSession = { userId: 'demo-user', displayName: 'Demo', accessToken: 'token' }

describe('interaction store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loads cursor comments', async () => {
    const store = useInteractionStore()
    const gateway = createFixtureInteractionGateway(2)
    store.initialize(item)
    await store.loadComments({ gateway })
    await store.loadComments({ gateway, append: true })
    expect(store.comments).toHaveLength(3)
    expect(store.nextCursor).toBeNull()
  })

  it('optimistically submits then confirms a comment', async () => {
    const store = useInteractionStore()
    const gateway = createFixtureInteractionGateway()
    store.initialize(item)
    const promise = store.submitComment(session, '  新评论  ', { gateway })
    expect(store.comments[0]).toMatchObject({ body: '新评论', pending: true })
    expect(await promise).toMatchObject({ ok: true, data: { body: '新评论' } })
    expect(store.comments[0]?.pending).toBe(false)
  })

  it('rolls back optimistic comments and preserves error kind', async () => {
    const base = createFixtureInteractionGateway()
    const gateway: InteractionGateway = {
      ...base,
      async createComment() {
        return failure({ kind: 'rate-limit', message: 'slow', status: 429 })
      },
    }
    const store = useInteractionStore()
    store.initialize(item)
    await store.submitComment(session, '保留输入', { gateway })
    expect(store.comments).toEqual([])
    expect(store.commentError?.kind).toBe('rate-limit')
  })

  it('optimistically likes and rolls back conflict', async () => {
    const base = createFixtureInteractionGateway()
    const gateway: InteractionGateway = {
      ...base,
      async setLiked() {
        return failure({ kind: 'conflict', message: 'stale', status: 409 })
      },
    }
    const store = useInteractionStore()
    store.initialize(item)
    const promise = store.toggleLike(session, { gateway })
    expect(store.liked).toBe(true)
    expect(store.likeCount).toBe(640001)
    await promise
    expect(store.liked).toBe(false)
    expect(store.likeCount).toBe(640000)
  })

  it('prevents duplicate writes', async () => {
    const base = createFixtureInteractionGateway()
    let resolve!: () => void
    const gate = new Promise<void>((done) => {
      resolve = done
    })
    let calls = 0
    const gateway: InteractionGateway = {
      ...base,
      async createComment(...args) {
        calls += 1
        await gate
        return base.createComment(...args)
      },
    }
    const store = useInteractionStore()
    store.initialize(item)
    const first = store.submitComment(session, '一次', { gateway })
    const second = await store.submitComment(session, '两次', { gateway })
    expect(second).toMatchObject({ ok: false, error: { kind: 'conflict' } })
    expect(calls).toBe(1)
    resolve()
    await first
  })
})
