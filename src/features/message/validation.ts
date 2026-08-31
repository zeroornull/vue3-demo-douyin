import type { MessageDraft } from '@/domain/message/message'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export interface MessageFieldErrors {
  readonly body?: string
}

export interface MessageValidationError extends AppError {
  readonly fields: MessageFieldErrors
  readonly kind: 'validation'
}

export function validateMessageDraft(
  input: MessageDraft,
): AppResult<MessageDraft, MessageValidationError> {
  const body = input.body.trim()
  if (!body || body.length > 500) {
    return failure({
      kind: 'validation',
      message: '消息内容校验失败。',
      fields: { body: '消息必须为 1–500 个字符。' },
    })
  }
  return success({ body })
}
