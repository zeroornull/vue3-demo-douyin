import type { FeedGateway } from './feed-gateway'
import { fixtureFeedGateway } from './fixture-feed-gateway'
import { createHttpFeedGateway } from './http-feed-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'

let cachedGateway: FeedGateway | undefined

export function getDefaultFeedGateway(): FeedGateway {
  if (cachedGateway) return cachedGateway
  const config = getRuntimeConfig()
  cachedGateway =
    config.feedDataSource === 'fixture'
      ? fixtureFeedGateway
      : createHttpFeedGateway(
          createAxiosHttpClient({
            baseUrl: config.apiBaseUrl,
            timeoutMs: config.httpTimeoutMs,
          }),
        )
  return cachedGateway
}
