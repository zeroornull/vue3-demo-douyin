import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { parseConversationId, type ChatMessage } from '@/domain/message/message'
import {
  createFixtureMessageGateway,
  FIXTURE_CONVERSATION_ID,
} from '@/features/message/api/fixture-message-gateway'
import type { MessageGateway } from '@/features/message/api/message-gateway'
import { useMessageStore } from '@/features/message/store/message'
import { appEventBus } from '@/infrastructure/events/app-event-bus'

const session: AuthSession = {
  userId: 'demo-user',
  displayName: 'Demo',
  accessToken: 'token',
}

describe('useMessageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    appEventBus.clear()
  })

  it('loads paginated conversations and publishes unread totals', async () => {
    const gateway = createFixtureMessageGateway(2)
    const store = useMessageStore()
    const totals: number[] = []
    const off = appEventBus.on('message:unread-changed', ({ total }) => totals.push(total))

    await store.loadConversations(session, { gateway })
    await store.loadConversations(session, { gateway, append: true })
    off()

    expect(store.conversations).toHaveLength(3)
    expect(store.unreadTotal).toBe(3)
    expect(store.nextConversationCursor).toBeNull()
    expect(totals).toEqual([2, 3])
  })

  it('loads older messages and marks an unread conversation as read', async () => {
    const gateway = createFixtureMessageGateway(2)
    const store = useMessageStore()
    const reads: string[] = []
    const off = appEventBus.on('message:read', ({ conversationId }) => reads.push(conversationId))
    await store.loadConversations(session, { gateway })

    await store.openConversation(session, FIXTURE_CONVERSATION_ID, { gateway })
    await store.loadOlderMessages(session, { gateway })
    off()

    expect(store.messages).toHaveLength(4)
    expect(store.activeConversation?.unreadCount).toBe(0)
    expect(store.unreadTotal).toBe(0)
    expect(reads).toEqual([FIXTURE_CONVERSATION_ID])
  })

  it('validates before send, then appends and emits a sent event', async () => {
    const base = createFixtureMessageGateway()
    let sendCalls = 0
    const gateway: MessageGateway = {
      getConversation: base.getConversation,
      listConversations: base.listConversations,
      markRead: base.markRead,
      async sendMessage(...args) {
        sendCalls += 1
        return base.sendMessage(...args)
      },
    }
    const store = useMessageStore()
    const sent: string[] = []
    const off = appEventBus.on('message:sent', ({ messageId }) => sent.push(messageId))
    await store.loadConversations(session, { gateway })
    await store.openConversation(session, FIXTURE_CONVERSATION_ID, { gateway })

    const invalid = await store.sendMessage(session, '   ', { gateway })
    const valid = await store.sendMessage(session, '  新消息  ', { gateway })
    off()

    expect(invalid).toMatchObject({ ok: false, error: { kind: 'validation' } })
    expect(valid).toMatchObject({ ok: true, data: { body: '新消息' } })
    expect(sendCalls).toBe(1)
    expect(store.messages[store.messages.length - 1]?.body).toBe('新消息')
    expect(sent).toEqual(['fixture-sent-1'])
  })

  it('moves an inactive conversation to the top for an incoming message', async () => {
    const gateway = createFixtureMessageGateway()
    const store = useMessageStore()
    await store.loadConversations(session, { gateway })
    await store.openConversation(session, FIXTURE_CONVERSATION_ID, { gateway })
    const conversationId = parseConversationId('conv-smile')!
    const incoming: ChatMessage = {
      id: 'incoming-1',
      conversationId,
      senderId: 'friend-smile',
      body: '新的未读消息',
      sentAt: '2026-08-31T03:00:00.000Z',
      delivery: 'delivered',
    }

    store.receiveIncomingMessage(incoming)

    expect(store.conversations[0]).toMatchObject({
      id: conversationId,
      unreadCount: 1,
      lastMessage: { id: 'incoming-1' },
    })
    expect(store.unreadTotal).toBe(1)
  })

  it('clears private message state on reset', async () => {
    const store = useMessageStore()
    await store.loadConversations(session, { gateway: createFixtureMessageGateway() })

    store.reset()

    expect(store.conversations).toEqual([])
    expect(store.messages).toEqual([])
    expect(store.listStatus).toBe('idle')
    expect(store.threadStatus).toBe('idle')
  })
})
