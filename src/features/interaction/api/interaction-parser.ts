import { parseFeedId, type FeedId } from '@/domain/feed/feed'
import {
  parseCommentId,
  type CommentAuthor,
  type CommentPage,
  type FeedComment,
  type FeedLikeState,
} from '@/domain/interaction/interaction'
import { failure, success, type AppResult } from '@/shared/result'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function positiveVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

function timestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))
}

function parseAuthor(input: unknown): AppResult<CommentAuthor> {
  return isRecord(input) &&
    typeof input.userId === 'string' &&
    Boolean(input.userId.trim()) &&
    typeof input.displayName === 'string' &&
    Boolean(input.displayName.trim())
    ? success(Object.freeze({ userId: input.userId, displayName: input.displayName }))
    : failure({ kind: 'parse', message: '评论作者字段无效。' })
}

export function parseFeedComment(input: unknown, expectedFeedId?: FeedId): AppResult<FeedComment> {
  if (!isRecord(input)) return failure({ kind: 'parse', message: '评论格式无效。' })
  const id = parseCommentId(input.id)
  const feedId = parseFeedId(input.feedId)
  const author = parseAuthor(input.author)
  const errors: string[] = []
  if (!id) errors.push('id')
  if (!feedId) errors.push('feedId')
  if (feedId && expectedFeedId && feedId !== expectedFeedId) errors.push('feedId:mismatch')
  if (!author.ok) errors.push('author')
  if (typeof input.body !== 'string' || !input.body.trim() || input.body.length > 300) {
    errors.push('body')
  }
  if (!timestamp(input.createdAt)) errors.push('createdAt')
  if (!nonNegativeInteger(input.likeCount)) errors.push('likeCount')
  if (typeof input.likedByViewer !== 'boolean') errors.push('likedByViewer')
  if (!positiveVersion(input.version)) errors.push('version')
  if (errors.length || !id || !feedId || !author.ok) {
    return failure({ kind: 'parse', message: '评论字段无效。', details: errors })
  }
  return success(
    Object.freeze({
      id,
      feedId,
      author: author.data,
      body: (input.body as string).trim(),
      createdAt: input.createdAt as string,
      likeCount: input.likeCount as number,
      likedByViewer: input.likedByViewer as boolean,
      version: input.version as number,
    }),
  )
}

export function parseCommentPage(input: unknown, feedId: FeedId): AppResult<CommentPage> {
  if (!isRecord(input) || !Array.isArray(input.comments)) {
    return failure({ kind: 'parse', message: '评论列表格式无效。' })
  }
  const comments: FeedComment[] = []
  const ids = new Set<string>()
  const errors: string[] = []
  input.comments.forEach((value, index) => {
    const parsed = parseFeedComment(value, feedId)
    if (!parsed.ok) errors.push(`comments.${index}`)
    else if (ids.has(parsed.data.id)) errors.push(`comments.${index}.duplicate`)
    else {
      ids.add(parsed.data.id)
      comments.push(parsed.data)
    }
  })
  const cursor = input.nextCursor
  if (cursor !== null && (typeof cursor !== 'string' || !cursor)) errors.push('nextCursor')
  if (errors.length) {
    return failure({ kind: 'parse', message: '评论列表字段无效。', details: errors })
  }
  return success(
    Object.freeze({ comments: Object.freeze(comments), nextCursor: cursor as string | null }),
  )
}

export function parseFeedLikeState(
  input: unknown,
  expectedFeedId: FeedId,
): AppResult<FeedLikeState> {
  if (!isRecord(input)) return failure({ kind: 'parse', message: '点赞响应格式无效。' })
  const feedId = parseFeedId(input.feedId)
  const errors: string[] = []
  if (!feedId || feedId !== expectedFeedId) errors.push('feedId')
  if (typeof input.liked !== 'boolean') errors.push('liked')
  if (!nonNegativeInteger(input.likeCount)) errors.push('likeCount')
  if (!positiveVersion(input.version)) errors.push('version')
  if (errors.length || !feedId) {
    return failure({ kind: 'parse', message: '点赞响应字段无效。', details: errors })
  }
  return success({
    feedId,
    liked: input.liked as boolean,
    likeCount: input.likeCount as number,
    version: input.version as number,
  })
}
