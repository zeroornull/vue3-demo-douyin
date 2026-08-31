import type { FeedSearchQuery } from '@/domain/feed/feed'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export interface FeedSearchFieldErrors {
  readonly query?: string
}

export interface FeedSearchValidationError extends AppError {
  readonly fields: FeedSearchFieldErrors
  readonly kind: 'validation'
}

export function validateFeedSearchQuery(
  value: unknown,
): AppResult<FeedSearchQuery, FeedSearchValidationError> {
  const query = typeof value === 'string' ? value.trim() : ''
  if (!query || query.length > 50) {
    return failure({
      kind: 'validation',
      message: '搜索关键词校验失败。',
      fields: { query: '搜索关键词必须为 1–50 个字符。' },
    })
  }
  return success(query as FeedSearchQuery)
}
