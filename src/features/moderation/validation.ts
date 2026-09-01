import type { ReportDraft, ReportReason } from '@/domain/moderation/moderation'
import { failure, success, type AppResult } from '@/shared/result'
const reasons: readonly ReportReason[] = [
  'fraud',
  'harassment',
  'illegal',
  'misinformation',
  'spam',
  'other',
]
export function validateReport(input: {
  reason: unknown
  description: unknown
}): AppResult<ReportDraft> {
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  if (!reasons.includes(input.reason as ReportReason))
    return failure({ kind: 'validation', message: '请选择举报原因。' })
  if (description.length > 500)
    return failure({ kind: 'validation', message: '举报说明不能超过 500 个字符。' })
  return success({ reason: input.reason as ReportReason, description })
}
