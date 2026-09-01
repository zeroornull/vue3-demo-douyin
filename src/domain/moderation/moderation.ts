import type { FeedId } from '@/domain/feed/feed'
export type ReportReason = 'fraud' | 'harassment' | 'illegal' | 'misinformation' | 'other' | 'spam'
export interface ReportDraft {
  readonly description: string
  readonly reason: ReportReason
}
export interface ReportReceipt {
  readonly feedId: FeedId
  readonly reportId: string
  readonly status: 'accepted'
}
export function buildShareUrl(origin: string, feedId: FeedId): string {
  const url = new URL(`/home/content/${encodeURIComponent(feedId)}`, origin)
  if (url.origin !== new URL(origin).origin)
    throw new Error('Share URL must stay on the current origin')
  return url.toString()
}
