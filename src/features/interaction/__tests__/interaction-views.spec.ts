import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type { FeedItem } from '@/domain/feed/feed'
import { parseFeedId } from '@/domain/feed/feed'
import { fixtureAuthGateway } from '@/features/auth/api/fixture-auth-gateway'
import { useAuthStore } from '@/features/auth/store/auth'
import FeedInteractions from '@/features/interaction/components/FeedInteractions.vue'
import { ROUTE_NAMES } from '@/router'

const item: FeedItem = {
  id: parseFeedId('feed-alley')!,
  author: { userId: 'author', displayName: 'Author', handle: 'author' },
  caption: 'Detail',
  coverUrl: '/feed/covers/alley.jpg',
  durationSeconds: 4,
  likeCount: 640000,
  commentCount: 3,
  shareCount: 1,
  publishedAt: '2026-08-31T01:00:00Z',
  tags: [],
}
const routes: RouteRecordRaw[] = [
  {
    path: '/login/password',
    name: ROUTE_NAMES.authPassword,
    component: { template: '<div>login</div>' },
  },
  {
    path: '/home/content/:feedId',
    name: ROUTE_NAMES.feedDetail,
    component: { template: '<div>detail</div>' },
  },
]

async function setup(authenticated = false) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  if (authenticated)
    await auth.signIn(
      { agreed: true, phone: '13800138000', password: 'douyin-demo' },
      { gateway: fixtureAuthGateway },
    )
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/home/content/feed-alley')
  await router.isReady()
  const wrapper = mount(FeedInteractions, { props: { item }, global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('FeedInteractions', () => {
  it('renders public cursor comments and like state', async () => {
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('稳定深链')
    expect(wrapper.get('.feed-like-button').text()).toContain('64万')
  })

  it('redirects unauthenticated comments with focus intent', async () => {
    const { router, wrapper } = await setup()
    await wrapper.get('textarea').setValue('准备登录后发送')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.authPassword)
    expect(router.currentRoute.value.query.redirect).toBe('/home/content/feed-alley#comment-form')
  })

  it('validates then confirms an authenticated comment and restores focus', async () => {
    const { wrapper } = await setup(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('评论必须为 1–300 个字符')
    await wrapper.get('textarea').setValue('组件确认评论')
    const focus = vi.spyOn(wrapper.get('textarea').element, 'focus')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('组件确认评论')
    expect(focus).toHaveBeenCalledOnce()
  })
})
