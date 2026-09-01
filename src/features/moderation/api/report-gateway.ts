import type { AuthSession } from '@/domain/auth/auth'
import type { FeedId } from '@/domain/feed/feed'
import type { ReportDraft, ReportReceipt } from '@/domain/moderation/moderation'
import type { AppResult } from '@/shared/result'
export interface ReportGateway {
  submit(
    session: AuthSession,
    feedId: FeedId,
    draft: ReportDraft,
    signal?: AbortSignal,
  ): Promise<AppResult<ReportReceipt>>
}
