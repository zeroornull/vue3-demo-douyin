import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { parseFeedId } from '@/domain/feed/feed'
import { createFixtureInteractionGateway } from '@/features/interaction/api/fixture-interaction-gateway'

const feedId = parseFeedId('feed-alley')!
const session: AuthSession = { userId: 'demo-user', displayName: 'Demo', accessToken: 'token' }

describe('fixture interaction gateway', () => {
  it('paginates comments and creates authenticated comments', async () => {
    const gateway = createFixtureInteractionGateway(2)
    const first = await gateway.listComments(feedId)
    if (!first.ok) throw new Error(first.error.message)
    expect(first.data.comments).toHaveLength(2)
    expect(await gateway.listComments(feedId, { cursor: first.data.nextCursor! })).toMatchObject({
      ok: true,
      data: { comments: [{ id: 'comment-3' }] },
    })
    expect(await gateway.createComment(session, feedId, { body: '新评论' })).toMatchObject({
      ok: true,
      data: { body: '新评论', author: { userId: 'demo-user' } },
    })
  })

  it('version-updates likes and returns conflict for stale versions', async () => {
    const gateway = createFixtureInteractionGateway()
    expect(await gateway.setLiked(session, feedId, true, 1)).toMatchObject({
      ok: true,
      data: { liked: true, version: 2 },
    })
    expect(await gateway.setLiked(session, feedId, false, 1)).toMatchObject({
      ok: false,
      error: { kind: 'conflict' },
    })
  })

  it('rejects unauthorized writes', async () => {
    expect(
      await createFixtureInteractionGateway().createComment(
        { ...session, userId: 'other' },
        feedId,
        { body: 'no' },
      ),
    ).toMatchObject({ ok: false, error: { kind: 'unauthorized' } })
  })
})
