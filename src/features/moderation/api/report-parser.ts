import { parseFeedId, type FeedId } from '@/domain/feed/feed'
import type { ReportReceipt } from '@/domain/moderation/moderation'
import { failure, success, type AppResult } from '@/shared/result'
export function parseReportReceipt(input: unknown, expected: FeedId): AppResult<ReportReceipt> {
  if (typeof input !== 'object' || input === null)
    return failure({ kind: 'parse', message: '举报回执格式无效。' })
  const value = input as Record<string, unknown>
  const feedId = parseFeedId(value.feedId)
  if (
    !feedId ||
    feedId !== expected ||
    typeof value.reportId !== 'string' ||
    !value.reportId ||
    value.status !== 'accepted'
  )
    return failure({ kind: 'parse', message: '举报回执字段无效。' })
  return success({ feedId, reportId: value.reportId, status: 'accepted' })
}
