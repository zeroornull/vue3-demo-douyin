import type { AuthSession } from '@/domain/auth/auth'
import type { FeedId } from '@/domain/feed/feed'
import type {
  CommentDraft,
  CommentPage,
  FeedComment,
  FeedLikeState,
} from '@/domain/interaction/interaction'
import type { AppResult } from '@/shared/result'

export interface InteractionRequestOptions {
  readonly cursor?: string
  readonly signal?: AbortSignal
}

export interface InteractionGateway {
  createComment(
    session: AuthSession,
    feedId: FeedId,
    draft: CommentDraft,
    options?: Pick<InteractionRequestOptions, 'signal'>,
  ): Promise<AppResult<FeedComment>>
  listComments(feedId: FeedId, options?: InteractionRequestOptions): Promise<AppResult<CommentPage>>
  setLiked(
    session: AuthSession,
    feedId: FeedId,
    liked: boolean,
    expectedVersion: number,
    options?: Pick<InteractionRequestOptions, 'signal'>,
  ): Promise<AppResult<FeedLikeState>>
}
