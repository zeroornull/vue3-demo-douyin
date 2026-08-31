import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { parseConversationId } from '@/domain/message/message'
import { createHttpMessageGateway } from '@/features/message/api/http-message-gateway'
import type { HttpClient, HttpRequestOptions } from '@/infrastructure/http/http-client'
import { failure, success, type AppResult } from '@/shared/result'
import {
  chatMessageResponse,
  conversationPageResponse,
  messagePageResponse,
} from './message-parser.spec'

const session: AuthSession = {
  userId: 'demo-user',
  displayName: 'Demo',
  accessToken: 'secret-token',
}
const conversationId = parseConversationId('conv-e2e')!

interface RequestRecord {
  readonly body?: unknown
  readonly method: 'GET' | 'PATCH' | 'POST'
  readonly options?: HttpRequestOptions
  readonly path: string
}

function client(results: AppResult<unknown>[], records: RequestRecord[] = []): HttpClient {
  function next() {
    return results.shift() ?? failure({ kind: 'unexpected', message: 'missing mock result' })
  }
  return {
    async get(path, options) {
      records.push({ method: 'GET', path, ...(options ? { options } : {}) })
      return next()
    },
    async patch(path, body, options) {
      records.push({ method: 'PATCH', path, body, ...(options ? { options } : {}) })
      return next()
    },
    async post(path, body, options) {
      records.push({ method: 'POST', path, body, ...(options ? { options } : {}) })
      return next()
    },
  }
}

describe('createHttpMessageGateway', () => {
  it('uses bearer auth and cursor for the conversation list', async () => {
    const records: RequestRecord[] = []
    const gateway = createHttpMessageGateway(client([success(conversationPageResponse)], records))

    expect(await gateway.listConversations(session, { cursor: 'next-2' })).toMatchObject({
      ok: true,
      data: { conversations: [{ id: 'conv-e2e' }] },
    })
    expect(records[0]).toMatchObject({
      method: 'GET',
      path: '/messages/conversations',
      options: {
        headers: { Authorization: 'Bearer secret-token' },
        query: { cursor: 'next-2' },
      },
    })
  })

  it('loads, marks read, and sends through stable conversation paths', async () => {
    const records: RequestRecord[] = []
    const gateway = createHttpMessageGateway(
      client(
        [
          success(messagePageResponse),
          success({ conversationId: 'conv-e2e', readAt: '2026-08-31T02:01:00.000Z' }),
          success({ ...chatMessageResponse, senderId: 'demo-user', body: '发送内容' }),
        ],
        records,
      ),
    )

    await gateway.getConversation(session, conversationId)
    await gateway.markRead(session, conversationId)
    await gateway.sendMessage(session, conversationId, { body: '发送内容' })

    expect(records.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /messages/conversations/conv-e2e/messages',
      'POST /messages/conversations/conv-e2e/read',
      'POST /messages/conversations/conv-e2e/messages',
    ])
    expect(records[2]?.body).toEqual({ body: '发送内容' })
  })

  it('maps 401/404 and preserves 503', async () => {
    const unauthorized = createHttpMessageGateway(
      client([failure({ kind: 'http', message: '401', status: 401 })]),
    )
    const missing = createHttpMessageGateway(
      client([failure({ kind: 'http', message: '404', status: 404 })]),
    )
    const unavailable = createHttpMessageGateway(
      client([failure({ kind: 'http', message: '503', status: 503 })]),
    )

    expect(await unauthorized.listConversations(session)).toMatchObject({
      ok: false,
      error: { kind: 'unauthorized' },
    })
    expect(await missing.getConversation(session, conversationId)).toMatchObject({
      ok: false,
      error: { kind: 'not-found' },
    })
    expect(await unavailable.listConversations(session)).toEqual({
      ok: false,
      error: { kind: 'http', message: '503', status: 503 },
    })
  })
})
