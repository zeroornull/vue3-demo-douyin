import type { InteractionGateway, InteractionRequestOptions } from './interaction-gateway'
import { parseCommentPage, parseFeedComment, parseFeedLikeState } from './interaction-parser'
import type { AuthSession } from '@/domain/auth/auth'
import type { FeedId } from '@/domain/feed/feed'
import type { HttpClient, HttpRequestOptions } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'

function path(feedId: FeedId, suffix: string) {
  return `/feed/${encodeURIComponent(feedId)}${suffix}`
}

function readOptions(options?: InteractionRequestOptions): HttpRequestOptions | undefined {
  return options?.cursor || options?.signal
    ? {
        ...(options.cursor ? { query: { cursor: options.cursor } } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
      }
    : undefined
}

function writeOptions(session: AuthSession, signal?: AbortSignal): HttpRequestOptions {
  return {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    ...(signal ? { signal } : {}),
  }
}

function mapWriteError(error: Extract<Awaited<ReturnType<HttpClient['post']>>, { ok: false }>) {
  if (error.error.kind !== 'http') return error
  if (error.error.status === 401) {
    return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
  }
  if (error.error.status === 409) {
    return failure({ kind: 'conflict', message: '内容状态已更新，请重试。', status: 409 })
  }
  if (error.error.status === 429) {
    return failure({ kind: 'rate-limit', message: '操作过于频繁，请稍后再试。', status: 429 })
  }
  return error
}

export function createHttpInteractionGateway(client: HttpClient): InteractionGateway {
  return {
    async listComments(feedId, options) {
      const response = await client.get(path(feedId, '/comments'), readOptions(options))
      return response.ok ? parseCommentPage(response.data, feedId) : response
    },

    async createComment(session, feedId, draft, options) {
      const response = await client.post(
        path(feedId, '/comments'),
        draft,
        writeOptions(session, options?.signal),
      )
      return response.ok ? parseFeedComment(response.data, feedId) : mapWriteError(response)
    },

    async setLiked(session, feedId, liked, expectedVersion, options) {
      const response = await client.post(
        path(feedId, '/like'),
        { liked, expectedVersion },
        writeOptions(session, options?.signal),
      )
      return response.ok ? parseFeedLikeState(response.data, feedId) : mapWriteError(response)
    },
  }
}
