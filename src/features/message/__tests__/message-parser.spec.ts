import { describe, expect, it } from 'vitest'
import { parseConversationId } from '@/domain/message/message'
import {
  parseChatMessage,
  parseConversationPage,
  parseMessagePage,
  parseReadReceipt,
} from '@/features/message/api/message-parser'

export const chatMessageResponse = {
  id: 'msg-1',
  conversationId: 'conv-e2e',
  senderId: 'friend-e2e',
  body: '你好',
  sentAt: '2026-08-31T02:00:00.000Z',
  delivery: 'delivered',
}

export const conversationResponse = {
  id: 'conv-e2e',
  participant: {
    userId: 'friend-e2e',
    displayName: 'E2E 好友',
    handle: 'e2e_friend',
    online: true,
  },
  lastMessage: chatMessageResponse,
  unreadCount: 2,
  updatedAt: '2026-08-31T02:00:00.000Z',
}

export const conversationPageResponse = {
  conversations: [conversationResponse],
  nextCursor: null,
}

export const messagePageResponse = {
  conversation: conversationResponse,
  messages: [chatMessageResponse],
  nextCursor: null,
}

describe('message response parsers', () => {
  it('parses conversation and message pages', () => {
    expect(parseConversationPage(conversationPageResponse)).toMatchObject({
      ok: true,
      data: { conversations: [{ id: 'conv-e2e' }] },
    })
    expect(parseMessagePage(messagePageResponse)).toMatchObject({
      ok: true,
      data: { messages: [{ id: 'msg-1' }] },
    })
  })

  it('rejects malformed pagination and nested messages', () => {
    expect(parseConversationPage({ conversations: [], nextCursor: 2 })).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['nextCursor'] },
    })
    expect(
      parseMessagePage({
        ...messagePageResponse,
        messages: [{ ...chatMessageResponse, body: '' }],
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['messages.0'] },
    })
    expect(parseChatMessage({ ...chatMessageResponse, body: '   ' })).toMatchObject({
      ok: false,
      error: { kind: 'parse' },
    })
  })

  it('rejects a message from another conversation', () => {
    const otherConversation = parseConversationId('other-conversation')!
    expect(parseChatMessage(chatMessageResponse, otherConversation)).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['conversationId:mismatch'] },
    })
  })

  it('parses a typed read receipt', () => {
    expect(
      parseReadReceipt({
        conversationId: 'conv-e2e',
        readAt: '2026-08-31T02:01:00.000Z',
      }),
    ).toMatchObject({ ok: true, data: { conversationId: 'conv-e2e' } })
  })
})
