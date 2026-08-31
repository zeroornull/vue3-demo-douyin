import type { AuthSession } from '@/domain/auth/auth'
import { parseFeedId, type FeedId } from '@/domain/feed/feed'
import {
  parseCommentId,
  type FeedComment,
  type FeedLikeState,
} from '@/domain/interaction/interaction'
import type { InteractionGateway } from './interaction-gateway'
import { abortedFailure, failure, success } from '@/shared/result'

function feedId(value: string) {
  const parsed = parseFeedId(value)
  if (!parsed) throw new Error(`Invalid feed ID: ${value}`)
  return parsed
}

function commentId(value: string) {
  const parsed = parseCommentId(value)
  if (!parsed) throw new Error(`Invalid comment ID: ${value}`)
  return parsed
}

const fixtureFeedId = feedId('feed-alley')
const initialComments: readonly FeedComment[] = [
  {
    id: commentId('comment-1'),
    feedId: fixtureFeedId,
    author: { userId: 'reader-1', displayName: '迁移读者' },
    body: '稳定深链让内容和评论都可以直接刷新。',
    createdAt: '2026-08-31T03:00:00.000Z',
    likeCount: 12,
    likedByViewer: false,
    version: 1,
  },
  {
    id: commentId('comment-2'),
    feedId: fixtureFeedId,
    author: { userId: 'reader-2', displayName: '严格类型用户' },
    body: '失败回滚比只改本地计数更重要。',
    createdAt: '2026-08-31T02:00:00.000Z',
    likeCount: 8,
    likedByViewer: false,
    version: 1,
  },
  {
    id: commentId('comment-3'),
    feedId: fixtureFeedId,
    author: { userId: 'reader-3', displayName: 'Cursor 学习者' },
    body: '评论分页也应该使用服务端 cursor。',
    createdAt: '2026-08-31T01:00:00.000Z',
    likeCount: 4,
    likedByViewer: false,
    version: 1,
  },
]

function authorized(session: AuthSession) {
  return session.userId === 'demo-user'
}

export function createFixtureInteractionGateway(pageSize = 2): InteractionGateway {
  const comments = new Map<FeedId, FeedComment[]>([[fixtureFeedId, [...initialComments]]])
  const likes = new Map<FeedId, FeedLikeState>([
    [fixtureFeedId, { feedId: fixtureFeedId, liked: false, likeCount: 640_000, version: 1 }],
  ])
  let commentSequence = 0

  return {
    async listComments(id, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      const list = comments.get(id) ?? []
      const offset = options?.cursor === undefined ? 0 : Number(options.cursor)
      if (!Number.isInteger(offset) || offset < 0 || offset > list.length) {
        return failure({ kind: 'parse', message: 'fixture 评论 cursor 无效。' })
      }
      const page = list.slice(offset, offset + pageSize)
      const next = offset + page.length
      return success({ comments: page, nextCursor: next < list.length ? String(next) : null })
    },

    async createComment(session, id, draft, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      commentSequence += 1
      const value: FeedComment = {
        id: commentId(`created-${commentSequence}`),
        feedId: id,
        author: { userId: session.userId, displayName: session.displayName },
        body: draft.body,
        createdAt: new Date(
          Date.parse('2026-08-31T04:00:00.000Z') + commentSequence * 1000,
        ).toISOString(),
        likeCount: 0,
        likedByViewer: false,
        version: 1,
      }
      comments.set(id, [value, ...(comments.get(id) ?? [])])
      return success(value)
    },

    async setLiked(session, id, liked, expectedVersion, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      const current = likes.get(id) ?? { feedId: id, liked: false, likeCount: 0, version: 1 }
      if (expectedVersion !== current.version) {
        return failure({ kind: 'conflict', message: '内容状态已更新，请重试。', status: 409 })
      }
      const next = {
        feedId: id,
        liked,
        likeCount: current.likeCount + (liked === current.liked ? 0 : liked ? 1 : -1),
        version: current.version + 1,
      }
      likes.set(id, next)
      return success(next)
    },
  }
}

export const fixtureInteractionGateway = createFixtureInteractionGateway()
