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
  if ((!body && !input.attachment) || body.length > 500) {
    return failure({
      kind: 'validation',
      message: '消息内容校验失败。',
      fields: { body: '消息必须为 1–500 个字符。' },
    })
  }
  return success({ body, ...(input.attachment ? { attachment: input.attachment } : {}) })
}

export function validateAttachmentFile(file: File): AppResult<File> {
  const limits = { 'image/jpeg': 5_000_000, 'image/png': 5_000_000, 'video/mp4': 25_000_000 }
  const limit = limits[file.type as keyof typeof limits]
  if (!limit) return failure({ kind: 'validation', message: '只支持 JPEG、PNG 或 MP4 附件。' })
  if (file.size <= 0 || file.size > limit) {
    return failure({ kind: 'validation', message: `附件大小必须在 1–${limit / 1_000_000} MB。` })
  }
  return success(file)
}
