import { describe, expect, it } from 'vitest'
import { parseFeedId } from '@/domain/feed/feed'
import {
  parseCommentPage,
  parseFeedComment,
  parseFeedLikeState,
} from '@/features/interaction/api/interaction-parser'

const feedId = parseFeedId('feed-e2e')!
const comment = {
  id: 'comment-e2e',
  feedId,
  author: { userId: 'user-e2e', displayName: 'E2E 评论者' },
  body: 'E2E 评论',
  createdAt: '2026-08-31T03:00:00.000Z',
  likeCount: 2,
  likedByViewer: false,
  version: 1,
}

describe('interaction parsers', () => {
  it('parses comments and pages', () => {
    expect(parseFeedComment(comment, feedId)).toMatchObject({
      ok: true,
      data: { id: 'comment-e2e' },
    })
    expect(parseCommentPage({ comments: [comment], nextCursor: null }, feedId)).toMatchObject({
      ok: true,
      data: { comments: [{ body: 'E2E 评论' }] },
    })
  })

  it('rejects cross-feed comments and duplicates', () => {
    expect(parseFeedComment({ ...comment, feedId: 'other-feed' }, feedId)).toMatchObject({
      ok: false,
      error: { details: expect.arrayContaining(['feedId:mismatch']) },
    })
    expect(
      parseCommentPage({ comments: [comment, comment], nextCursor: null }, feedId),
    ).toMatchObject({
      ok: false,
      error: { details: ['comments.1.duplicate'] },
    })
  })

  it('parses versioned like state', () => {
    expect(
      parseFeedLikeState({ feedId, liked: true, likeCount: 11, version: 2 }, feedId),
    ).toMatchObject({ ok: true, data: { liked: true, version: 2 } })
  })

  it('rejects invalid body and cursor', () => {
    expect(parseFeedComment({ ...comment, body: '' }, feedId)).toMatchObject({ ok: false })
    expect(parseCommentPage({ comments: [], nextCursor: 2 }, feedId)).toMatchObject({ ok: false })
  })
})
