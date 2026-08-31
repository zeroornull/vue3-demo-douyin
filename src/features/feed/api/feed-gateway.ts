import type { FeedId, FeedItem, FeedPage, FeedSearchQuery } from '@/domain/feed/feed'
import type { AppResult } from '@/shared/result'

export interface FeedRequestOptions {
  readonly cursor?: string
  readonly signal?: AbortSignal
}

export interface FeedGateway {
  getItem(
    feedId: FeedId,
    options?: Pick<FeedRequestOptions, 'signal'>,
  ): Promise<AppResult<FeedItem>>
  listFeed(options?: FeedRequestOptions): Promise<AppResult<FeedPage>>
  searchFeed(query: FeedSearchQuery, options?: FeedRequestOptions): Promise<AppResult<FeedPage>>
}
