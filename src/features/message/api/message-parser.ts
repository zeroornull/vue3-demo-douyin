import {
  parseConversationId,
  type ChatMessage,
  type ConversationId,
  type ConversationPage,
  type ConversationParticipant,
  type ConversationSummary,
  type MessageDelivery,
  type MessagePage,
  type ReadReceipt,
} from '@/domain/message/message'
import { failure, success, type AppResult } from '@/shared/result'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))
}

function isDelivery(value: unknown): value is MessageDelivery {
  return value === 'sent' || value === 'delivered' || value === 'read'
}

function parseParticipant(input: unknown): AppResult<ConversationParticipant> {
  if (
    !isRecord(input) ||
    typeof input.userId !== 'string' ||
    !input.userId ||
    typeof input.displayName !== 'string' ||
    !input.displayName ||
    typeof input.handle !== 'string' ||
    typeof input.online !== 'boolean'
  ) {
    return failure({ kind: 'parse', message: '会话参与者字段无效。' })
  }
  return success({
    userId: input.userId,
    displayName: input.displayName,
    handle: input.handle,
    online: input.online,
  })
}

export function parseChatMessage(
  input: unknown,
  expectedConversationId?: ConversationId,
): AppResult<ChatMessage> {
  if (!isRecord(input)) {
    return failure({ kind: 'parse', message: '消息响应格式无效。' })
  }
  const conversationId = parseConversationId(input.conversationId)
  const errors: string[] = []
  if (typeof input.id !== 'string' || !input.id) errors.push('id')
  if (!conversationId) errors.push('conversationId')
  if (conversationId && expectedConversationId && conversationId !== expectedConversationId) {
    errors.push('conversationId:mismatch')
  }
  if (typeof input.senderId !== 'string' || !input.senderId) errors.push('senderId')
  if (typeof input.body !== 'string' || !input.body.trim() || input.body.length > 500) {
    errors.push('body')
  }
  if (!isTimestamp(input.sentAt)) errors.push('sentAt')
  if (!isDelivery(input.delivery)) errors.push('delivery')
  if (errors.length || !conversationId) {
    return failure({ kind: 'parse', message: '消息响应字段无效。', details: errors })
  }
  return success({
    id: input.id as string,
    conversationId,
    senderId: input.senderId as string,
    body: input.body as string,
    sentAt: input.sentAt as string,
    delivery: input.delivery as MessageDelivery,
  })
}

function parseConversationSummary(input: unknown): AppResult<ConversationSummary> {
  if (!isRecord(input)) {
    return failure({ kind: 'parse', message: '会话摘要格式无效。' })
  }
  const id = parseConversationId(input.id)
  const participant = parseParticipant(input.participant)
  const errors: string[] = []
  if (!id) errors.push('id')
  if (!participant.ok) errors.push('participant')
  if (!Number.isInteger(input.unreadCount) || typeof input.unreadCount !== 'number') {
    errors.push('unreadCount')
  } else if (input.unreadCount < 0) {
    errors.push('unreadCount')
  }
  if (!isTimestamp(input.updatedAt)) errors.push('updatedAt')
  let lastMessage: ChatMessage | null = null
  if (input.lastMessage !== null) {
    const parsedMessage = parseChatMessage(input.lastMessage, id ?? undefined)
    if (!parsedMessage.ok) errors.push('lastMessage')
    else lastMessage = parsedMessage.data
  }
  if (errors.length || !id || !participant.ok) {
    return failure({ kind: 'parse', message: '会话摘要字段无效。', details: errors })
  }
  return success({
    id,
    participant: participant.data,
    lastMessage,
    unreadCount: input.unreadCount as number,
    updatedAt: input.updatedAt as string,
  })
}

function parseCursor(value: unknown): AppResult<string | null> {
  return value === null || (typeof value === 'string' && value.length > 0)
    ? success(value)
    : failure({ kind: 'parse', message: '分页 cursor 无效。' })
}

export function parseConversationPage(input: unknown): AppResult<ConversationPage> {
  if (!isRecord(input) || !Array.isArray(input.conversations)) {
    return failure({ kind: 'parse', message: '会话列表响应格式无效。' })
  }
  const nextCursor = parseCursor(input.nextCursor)
  const conversations: ConversationSummary[] = []
  const errors: string[] = []
  input.conversations.forEach((item, index) => {
    const parsed = parseConversationSummary(item)
    if (parsed.ok) conversations.push(parsed.data)
    else errors.push(`conversations.${index}`)
  })
  if (!nextCursor.ok) errors.push('nextCursor')
  if (errors.length || !nextCursor.ok) {
    return failure({ kind: 'parse', message: '会话列表响应字段无效。', details: errors })
  }
  return success({ conversations, nextCursor: nextCursor.data })
}

export function parseMessagePage(input: unknown): AppResult<MessagePage> {
  if (!isRecord(input) || !Array.isArray(input.messages)) {
    return failure({ kind: 'parse', message: '会话消息响应格式无效。' })
  }
  const conversation = parseConversationSummary(input.conversation)
  const nextCursor = parseCursor(input.nextCursor)
  const messages: ChatMessage[] = []
  const errors: string[] = []
  input.messages.forEach((item, index) => {
    const parsed = parseChatMessage(item, conversation.ok ? conversation.data.id : undefined)
    if (parsed.ok) messages.push(parsed.data)
    else errors.push(`messages.${index}`)
  })
  if (!conversation.ok) errors.push('conversation')
  if (!nextCursor.ok) errors.push('nextCursor')
  if (errors.length || !conversation.ok || !nextCursor.ok) {
    return failure({ kind: 'parse', message: '会话消息响应字段无效。', details: errors })
  }
  return success({ conversation: conversation.data, messages, nextCursor: nextCursor.data })
}

export function parseReadReceipt(input: unknown): AppResult<ReadReceipt> {
  if (!isRecord(input)) {
    return failure({ kind: 'parse', message: '已读回执格式无效。' })
  }
  const conversationId = parseConversationId(input.conversationId)
  if (!conversationId || !isTimestamp(input.readAt)) {
    return failure({ kind: 'parse', message: '已读回执字段无效。' })
  }
  return success({ conversationId, readAt: input.readAt })
}
