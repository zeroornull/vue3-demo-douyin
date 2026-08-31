import {
  parseFeedId,
  type FeedAuthor,
  type FeedDetail,
  type FeedItem,
  type FeedPage,
} from '@/domain/feed/feed'
import { parseMediaSource } from '@/features/media/media-parser'
import { failure, success, type AppResult } from '@/shared/result'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))
}

function isSafeCoverUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\/feed\/covers\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:avif|jpe?g|png|webp)$/.test(value)
  )
}

function parseFeedAuthor(input: unknown): AppResult<FeedAuthor> {
  if (
    !isRecord(input) ||
    typeof input.userId !== 'string' ||
    !input.userId.trim() ||
    typeof input.displayName !== 'string' ||
    !input.displayName.trim() ||
    typeof input.handle !== 'string' ||
    !input.handle.trim()
  ) {
    return failure({ kind: 'parse', message: 'Feed author 字段无效。' })
  }
  return success(
    Object.freeze({
      userId: input.userId,
      displayName: input.displayName,
      handle: input.handle,
    }),
  )
}

export function parseFeedItem(input: unknown): AppResult<FeedItem> {
  if (!isRecord(input)) return failure({ kind: 'parse', message: 'Feed item 格式无效。' })
  const id = parseFeedId(input.id)
  const author = parseFeedAuthor(input.author)
  const errors: string[] = []
  if (!id) errors.push('id')
  if (!author.ok) errors.push('author')
  if (typeof input.caption !== 'string' || !input.caption.trim() || input.caption.length > 500) {
    errors.push('caption')
  }
  if (!isSafeCoverUrl(input.coverUrl)) errors.push('coverUrl')
  if (
    typeof input.durationSeconds !== 'number' ||
    !Number.isInteger(input.durationSeconds) ||
    input.durationSeconds < 1 ||
    input.durationSeconds > 86_400
  ) {
    errors.push('durationSeconds')
  }
  for (const key of ['likeCount', 'commentCount', 'shareCount'] as const) {
    if (!isNonNegativeInteger(input[key])) errors.push(key)
  }
  if (!isTimestamp(input.publishedAt)) errors.push('publishedAt')
  if (
    !Array.isArray(input.tags) ||
    input.tags.length > 5 ||
    input.tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 30)
  ) {
    errors.push('tags')
  }
  if (errors.length || !id || !author.ok || !Array.isArray(input.tags)) {
    return failure({ kind: 'parse', message: 'Feed item 字段无效。', details: errors })
  }
  return success(
    Object.freeze({
      id,
      author: author.data,
      caption: (input.caption as string).trim(),
      coverUrl: input.coverUrl as string,
      durationSeconds: input.durationSeconds as number,
      likeCount: input.likeCount as number,
      commentCount: input.commentCount as number,
      shareCount: input.shareCount as number,
      publishedAt: input.publishedAt as string,
      tags: Object.freeze((input.tags as string[]).map((tag) => tag.trim())),
    }),
  )
}

function parseCursor(value: unknown): AppResult<string | null> {
  return value === null || (typeof value === 'string' && value.length > 0)
    ? success(value)
    : failure({ kind: 'parse', message: 'Feed cursor 无效。' })
}

export function parseFeedPage(input: unknown): AppResult<FeedPage> {
  if (!isRecord(input) || !Array.isArray(input.items)) {
    return failure({ kind: 'parse', message: 'Feed page 格式无效。' })
  }
  const nextCursor = parseCursor(input.nextCursor)
  const items: FeedItem[] = []
  const ids = new Set<string>()
  const errors: string[] = []
  input.items.forEach((item, index) => {
    const parsed = parseFeedItem(item)
    if (!parsed.ok) errors.push(`items.${index}`)
    else if (ids.has(parsed.data.id)) errors.push(`items.${index}.duplicate`)
    else {
      ids.add(parsed.data.id)
      items.push(parsed.data)
    }
  })
  if (!nextCursor.ok) errors.push('nextCursor')
  if (errors.length || !nextCursor.ok) {
    return failure({ kind: 'parse', message: 'Feed page 字段无效。', details: errors })
  }
  return success(Object.freeze({ items: Object.freeze(items), nextCursor: nextCursor.data }))
}

export function parseFeedDetail(input: unknown): AppResult<FeedDetail> {
  if (!isRecord(input) || !('item' in input) || !('media' in input)) {
    return failure({ kind: 'parse', message: 'Feed detail 格式无效。' })
  }
  const item = parseFeedItem(input.item)
  const media = parseMediaSource(input.media)
  const errors: string[] = []
  if (!item.ok) errors.push('item')
  if (!media.ok) errors.push('media')
  if (errors.length || !item.ok || !media.ok) {
    return failure({ kind: 'parse', message: 'Feed detail 字段无效。', details: errors })
  }
  return success(Object.freeze({ item: item.data, media: media.data }))
}
