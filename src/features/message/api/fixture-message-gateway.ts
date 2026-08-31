import type { AuthSession } from '@/domain/auth/auth'
import {
  parseConversationId,
  type ChatMessage,
  type ConversationId,
  type ConversationSummary,
} from '@/domain/message/message'
import type { MessageGateway } from './message-gateway'
import { abortedFailure, failure, success } from '@/shared/result'

function conversationId(value: string): ConversationId {
  const parsed = parseConversationId(value)
  if (!parsed) throw new Error(`Invalid fixture conversation ID: ${value}`)
  return parsed
}

export const FIXTURE_CONVERSATION_ID = conversationId('conv-anto')

const secondConversationId = conversationId('conv-smile')
const systemConversationId = conversationId('conv-helper')

const initialMessages: readonly ChatMessage[] = [
  {
    id: 'msg-anto-1',
    conversationId: FIXTURE_CONVERSATION_ID,
    senderId: 'friend-anto',
    body: '又在刷抖音？',
    sentAt: '2026-08-31T02:00:00.000Z',
    delivery: 'read',
  },
  {
    id: 'msg-anto-2',
    conversationId: FIXTURE_CONVERSATION_ID,
    senderId: 'friend-anto',
    body: '我昨天 @ 你那个视频发给我下',
    sentAt: '2026-08-31T02:01:00.000Z',
    delivery: 'read',
  },
  {
    id: 'msg-anto-3',
    conversationId: FIXTURE_CONVERSATION_ID,
    senderId: 'demo-user',
    body: '我找不到了，晚点再翻一下。',
    sentAt: '2026-08-31T02:02:00.000Z',
    delivery: 'read',
  },
  {
    id: 'msg-anto-4',
    conversationId: FIXTURE_CONVERSATION_ID,
    senderId: 'friend-anto',
    body: '好，找到后发我就行。',
    sentAt: '2026-08-31T02:03:00.000Z',
    delivery: 'delivered',
  },
]

const initialConversations: readonly ConversationSummary[] = [
  {
    id: FIXTURE_CONVERSATION_ID,
    participant: {
      userId: 'friend-anto',
      displayName: '浅唱↘我们的歌',
      handle: '33453',
      online: true,
    },
    lastMessage: initialMessages[initialMessages.length - 1] ?? null,
    unreadCount: 2,
    updatedAt: '2026-08-31T02:03:00.000Z',
  },
  {
    id: secondConversationId,
    participant: {
      userId: 'friend-smile',
      displayName: '保持微笑',
      handle: 'keep_smiling',
      online: false,
    },
    lastMessage: {
      id: 'msg-smile-1',
      conversationId: secondConversationId,
      senderId: 'demo-user',
      body: '收到，明天见。',
      sentAt: '2026-08-30T11:20:00.000Z',
      delivery: 'read',
    },
    unreadCount: 0,
    updatedAt: '2026-08-30T11:20:00.000Z',
  },
  {
    id: systemConversationId,
    participant: {
      userId: 'douyin-helper',
      displayName: '抖音小助手',
      handle: 'douyin_helper',
      online: false,
    },
    lastMessage: {
      id: 'msg-helper-1',
      conversationId: systemConversationId,
      senderId: 'douyin-helper',
      body: '迁移学习任务已更新。',
      sentAt: '2026-08-29T08:00:00.000Z',
      delivery: 'delivered',
    },
    unreadCount: 1,
    updatedAt: '2026-08-29T08:00:00.000Z',
  },
]

function cursorOffset(cursor: string | undefined, fallback: number) {
  if (cursor === undefined) return success(fallback)
  const offset = Number(cursor)
  return Number.isInteger(offset) && offset >= 0
    ? success(offset)
    : failure({ kind: 'parse', message: 'fixture cursor 无效。' })
}

export function createFixtureMessageGateway(pageSize = 2): MessageGateway {
  let conversations = [...initialConversations]
  const messages = new Map<ConversationId, ChatMessage[]>([
    [FIXTURE_CONVERSATION_ID, [...initialMessages]],
    [secondConversationId, [initialConversations[1]!.lastMessage!]],
    [systemConversationId, [initialConversations[2]!.lastMessage!]],
  ])
  let sendSequence = 0

  function authorized(session: AuthSession) {
    return session.userId === 'demo-user'
  }

  function replaceConversation(value: ConversationSummary, moveToFront = false) {
    const remaining = conversations.filter((conversation) => conversation.id !== value.id)
    conversations = moveToFront
      ? [value, ...remaining]
      : conversations.map((conversation) => (conversation.id === value.id ? value : conversation))
  }

  return {
    async listConversations(session, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      const offset = cursorOffset(options?.cursor, 0)
      if (!offset.ok) return offset
      const page = conversations.slice(offset.data, offset.data + pageSize)
      const nextOffset = offset.data + page.length
      return success({
        conversations: page,
        nextCursor: nextOffset < conversations.length ? String(nextOffset) : null,
      })
    },

    async getConversation(session, id, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      const conversation = conversations.find((item) => item.id === id)
      const thread = messages.get(id)
      if (!conversation || !thread) {
        return failure({ kind: 'not-found', message: '会话不存在。', status: 404 })
      }
      const end = cursorOffset(options?.cursor, thread.length)
      if (!end.ok) return end
      const start = Math.max(0, end.data - pageSize)
      return success({
        conversation,
        messages: thread.slice(start, end.data),
        nextCursor: start > 0 ? String(start) : null,
      })
    },

    async markRead(session, id, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      const conversation = conversations.find((item) => item.id === id)
      if (!conversation) {
        return failure({ kind: 'not-found', message: '会话不存在。', status: 404 })
      }
      replaceConversation({ ...conversation, unreadCount: 0 })
      return success({ conversationId: id, readAt: '2026-08-31T02:04:00.000Z' })
    },

    async sendMessage(session, id, draft, options) {
      await Promise.resolve()
      if (options?.signal?.aborted) return abortedFailure()
      if (!authorized(session)) {
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      }
      const conversation = conversations.find((item) => item.id === id)
      const thread = messages.get(id)
      if (!conversation || !thread) {
        return failure({ kind: 'not-found', message: '会话不存在。', status: 404 })
      }
      sendSequence += 1
      const sentAt = new Date(
        Date.parse('2026-08-31T02:05:00.000Z') + sendSequence * 1000,
      ).toISOString()
      const message: ChatMessage = {
        id: `fixture-sent-${sendSequence}`,
        conversationId: id,
        senderId: session.userId,
        body: draft.body,
        sentAt,
        delivery: 'sent',
      }
      thread.push(message)
      replaceConversation(
        { ...conversation, lastMessage: message, unreadCount: 0, updatedAt: sentAt },
        true,
      )
      return success(message)
    },
  }
}

export const fixtureMessageGateway = createFixtureMessageGateway()
