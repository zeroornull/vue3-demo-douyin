import type { FeedGateway, FeedRequestOptions } from './feed-gateway'
import { parseFeedDetail, parseFeedPage } from './feed-parser'
import type { FeedId, FeedSearchQuery } from '@/domain/feed/feed'
import type { HttpClient, HttpRequestOptions } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'

function requestOptions(options?: FeedRequestOptions): HttpRequestOptions | undefined {
  return options?.cursor || options?.signal
    ? {
        ...(options.cursor ? { query: { cursor: options.cursor } } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      }
    : undefined
}

function searchOptions(query: FeedSearchQuery, options?: FeedRequestOptions): HttpRequestOptions {
  return {
    query: { q: query, ...(options?.cursor ? { cursor: options.cursor } : {}) },
    ...(options?.signal ? { signal: options.signal } : {}),
  }
}

function itemPath(feedId: FeedId) {
  return `/feed/${encodeURIComponent(feedId)}`
}

function mapFeedHttpError(error: Extract<Awaited<ReturnType<HttpClient['get']>>, { ok: false }>) {
  return error.error.kind === 'http' && error.error.status === 404
    ? failure({ kind: 'not-found', message: '内容不存在。', status: 404 })
    : error
}

export function createHttpFeedGateway(client: HttpClient): FeedGateway {
  return {
    async listFeed(options) {
      const response = await client.get('/feed', requestOptions(options))
      return response.ok ? parseFeedPage(response.data) : mapFeedHttpError(response)
    },

    async searchFeed(query, options) {
      const response = await client.get('/feed/search', searchOptions(query, options))
      return response.ok ? parseFeedPage(response.data) : mapFeedHttpError(response)
    },

    async getItem(feedId, options) {
      const response = await client.get(
        itemPath(feedId),
        options?.signal ? { signal: options.signal } : undefined,
      )
      const result = response.ok ? parseFeedDetail(response.data) : mapFeedHttpError(response)
      if (result.ok && result.data.item.id !== feedId) {
        return failure({ kind: 'parse', message: '内容响应与请求 ID 不一致。' })
      }
      return result
    },
  }
}
