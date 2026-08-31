import type { CommentDraft } from '@/domain/interaction/interaction'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export interface CommentFieldErrors {
  readonly body?: string
}

export interface CommentValidationError extends AppError {
  readonly fields: CommentFieldErrors
  readonly kind: 'validation'
}

export function validateCommentDraft(
  input: CommentDraft,
): AppResult<CommentDraft, CommentValidationError> {
  const body = input.body.trim()
  if (!body || body.length > 300) {
    return failure({
      kind: 'validation',
      message: '评论内容校验失败。',
      fields: { body: '评论必须为 1–300 个字符。' },
    })
  }
  return success({ body })
}
