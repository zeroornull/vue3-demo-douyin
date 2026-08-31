import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { parseConversationId } from '@/domain/message/message'
import {
  createFixtureMessageGateway,
  FIXTURE_CONVERSATION_ID,
} from '@/features/message/api/fixture-message-gateway'

const session: AuthSession = {
  userId: 'demo-user',
  displayName: 'Demo',
  accessToken: 'token',
}

describe('createFixtureMessageGateway', () => {
  it('paginates conversations and older messages', async () => {
    const gateway = createFixtureMessageGateway(2)
    const first = await gateway.listConversations(session)
    const thread = await gateway.getConversation(session, FIXTURE_CONVERSATION_ID)
    if (!first.ok || !thread.ok) throw new Error('fixture should load')
    const second = await gateway.listConversations(session, { cursor: first.data.nextCursor! })
    const older = await gateway.getConversation(session, FIXTURE_CONVERSATION_ID, {
      cursor: thread.data.nextCursor!,
    })

    expect(first.data.conversations).toHaveLength(2)
    expect(second).toMatchObject({ ok: true, data: { conversations: [{ id: 'conv-helper' }] } })
    expect(thread.data.messages).toHaveLength(2)
    expect(older).toMatchObject({ ok: true, data: { messages: expect.any(Array) } })
  })

  it('marks a conversation read and sends text', async () => {
    const gateway = createFixtureMessageGateway()
    expect(await gateway.markRead(session, FIXTURE_CONVERSATION_ID)).toMatchObject({
      ok: true,
      data: { conversationId: FIXTURE_CONVERSATION_ID },
    })
    expect(
      await gateway.sendMessage(session, FIXTURE_CONVERSATION_ID, { body: '新消息' }),
    ).toMatchObject({
      ok: true,
      data: { body: '新消息', senderId: 'demo-user', delivery: 'sent' },
    })
  })

  it('returns unauthorized, not-found, and aborted as separate states', async () => {
    const gateway = createFixtureMessageGateway()
    const controller = new AbortController()
    controller.abort()

    expect(await gateway.listConversations({ ...session, userId: 'other-user' })).toMatchObject({
      ok: false,
      error: { kind: 'unauthorized' },
    })
    expect(await gateway.getConversation(session, parseConversationId('missing')!)).toMatchObject({
      ok: false,
      error: { kind: 'not-found' },
    })
    expect(await gateway.listConversations(session, { signal: controller.signal })).toMatchObject({
      ok: false,
      error: { kind: 'aborted' },
    })
  })
})
