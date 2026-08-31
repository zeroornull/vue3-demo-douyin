import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { fixtureAuthGateway } from '@/features/auth/api/fixture-auth-gateway'
import { useAuthStore } from '@/features/auth/store/auth'
import { parseConversationId, type ChatMessage } from '@/domain/message/message'
import {
  createFixtureMessageGateway,
  FIXTURE_CONVERSATION_ID,
} from '@/features/message/api/fixture-message-gateway'
import { useMessageStore } from '@/features/message/store/message'
import ChatView from '@/features/message/views/ChatView.vue'
import MessageListView from '@/features/message/views/MessageListView.vue'
import MessageShellView from '@/features/message/views/MessageShellView.vue'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { ROUTE_NAMES } from '@/router'

const EmptyView = { template: '<div>empty</div>' }
const routes: RouteRecordRaw[] = [
  {
    path: '/login/password',
    name: ROUTE_NAMES.authPassword,
    component: EmptyView,
    meta: { migrationRound: 4, title: 'Login', transition: 'none' },
  },
  {
    path: '/message',
    name: ROUTE_NAMES.message,
    component: MessageListView,
    meta: { migrationRound: 4, title: 'Message', transition: 'none', requiresAuth: true },
  },
  {
    path: '/message/chat/:conversationId',
    name: ROUTE_NAMES.messageChat,
    component: ChatView,
    meta: { migrationRound: 4, title: 'Chat', transition: 'none', requiresAuth: true },
  },
]

async function authenticatedContext(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  await auth.signIn(
    { agreed: true, phone: '13800138000', password: 'douyin-demo' },
    { gateway: fixtureAuthGateway },
  )
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  return { auth, pinia, router }
}

describe('Message views', () => {
  beforeEach(() => appEventBus.clear())

  it('renders fixture conversations with stable deep links', async () => {
    const { pinia, router } = await authenticatedContext('/message')
    const wrapper = mount(MessageListView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('#message-title').text()).toBe('消息')
    expect(wrapper.text()).toContain('浅唱↘我们的歌')
    expect(
      wrapper.get(`a[href="/message/chat/${FIXTURE_CONVERSATION_ID}"]`).attributes('href'),
    ).toBe(`/message/chat/${FIXTURE_CONVERSATION_ID}`)
  })

  it('loads a thread, validates empty text, and sends valid text', async () => {
    const { pinia, router } = await authenticatedContext(`/message/chat/${FIXTURE_CONVERSATION_ID}`)
    const wrapper = mount(ChatView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    expect(wrapper.get('#chat-title').text()).toContain('浅唱')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('消息必须为 1–500 个字符')

    await wrapper.get('textarea[name="body"]').setValue('组件发送消息')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('组件发送消息')
  })

  it('renders an invalid conversation ID without loading a gateway', async () => {
    const { pinia, router } = await authenticatedContext('/message/chat/bad.id')
    const wrapper = mount(ChatView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('会话地址无效')
  })

  it('subscribes to typed incoming events and cleans up on unmount', async () => {
    const { auth, pinia, router } = await authenticatedContext('/message')
    const messageStore = useMessageStore()
    if (!auth.session) throw new Error('authenticated session expected')
    await messageStore.loadConversations(auth.session, {
      gateway: createFixtureMessageGateway(),
    })
    const wrapper = mount(MessageShellView, {
      global: {
        plugins: [pinia, router],
        stubs: { RouterView: true },
      },
    })
    const conversationId = parseConversationId('conv-smile')!
    const incoming: ChatMessage = {
      id: 'incoming-through-shell',
      conversationId,
      senderId: 'friend-smile',
      body: '通过 typed event 到达',
      sentAt: '2026-08-31T03:10:00.000Z',
      delivery: 'delivered',
    }

    expect(appEventBus.listenerCount('message:received')).toBe(1)
    appEventBus.emit('message:received', { message: incoming })
    expect(messageStore.conversations[0]?.lastMessage?.id).toBe('incoming-through-shell')
    wrapper.unmount()
    expect(appEventBus.listenerCount('message:received')).toBe(0)
    appEventBus.emit('message:received', {
      message: { ...incoming, id: 'incoming-after-unmount' },
    })
    expect(messageStore.conversations[0]?.lastMessage?.id).toBe('incoming-through-shell')
  })
})
