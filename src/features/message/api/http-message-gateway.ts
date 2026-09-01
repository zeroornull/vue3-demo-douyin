import type { MessageGateway, MessageRequestOptions } from './message-gateway'
import {
  parseChatMessage,
  parseConversationPage,
  parseMessagePage,
  parseReadReceipt,
} from './message-parser'
import type { AuthSession } from '@/domain/auth/auth'
import type { ConversationId } from '@/domain/message/message'
import type { HttpClient, HttpRequestOptions } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'

function requestOptions(session: AuthSession, options?: MessageRequestOptions): HttpRequestOptions {
  return {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    ...(options?.cursor ? { query: { cursor: options.cursor } } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  }
}

function pathFor(conversationId: ConversationId, suffix = '') {
  return `/messages/conversations/${encodeURIComponent(conversationId)}${suffix}`
}

function mapMessageHttpError(
  error: Extract<Awaited<ReturnType<HttpClient['get']>>, { ok: false }>,
) {
  if (error.error.kind === 'http' && error.error.status === 401) {
    return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
  }
  if (error.error.kind === 'http' && error.error.status === 404) {
    return failure({ kind: 'not-found', message: '会话不存在。', status: 404 })
  }
  return error
}

export function createHttpMessageGateway(client: HttpClient): MessageGateway {
  return {
    async listConversations(session, options) {
      const response = await client.get('/messages/conversations', requestOptions(session, options))
      return response.ok ? parseConversationPage(response.data) : mapMessageHttpError(response)
    },

    async getConversation(session, conversationId, options) {
      const response = await client.get(
        pathFor(conversationId, '/messages'),
        requestOptions(session, options),
      )
      const result = response.ok ? parseMessagePage(response.data) : mapMessageHttpError(response)
      if (result.ok && result.data.conversation.id !== conversationId) {
        return failure({ kind: 'parse', message: '会话响应与请求 ID 不一致。' })
      }
      return result
    },

    async markRead(session, conversationId, options) {
      const response = await client.post(
        pathFor(conversationId, '/read'),
        {},
        requestOptions(session, options),
      )
      const result = response.ok ? parseReadReceipt(response.data) : mapMessageHttpError(response)
      if (result.ok && result.data.conversationId !== conversationId) {
        return failure({ kind: 'parse', message: '已读回执与请求会话不一致。' })
      }
      return result
    },

    async sendMessage(session, conversationId, draft, options) {
      const response = await client.post(
        pathFor(conversationId, '/messages'),
        { body: draft.body, ...(draft.attachment ? { attachmentId: draft.attachment.id } : {}) },
        requestOptions(session, options),
      )
      return response.ok
        ? parseChatMessage(response.data, conversationId)
        : mapMessageHttpError(response)
    },
  }
}
