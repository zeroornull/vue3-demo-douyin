import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { FIXTURE_FEED_ID } from '@/features/feed/api/fixture-feed-gateway'
import FeedDetailView from '@/features/feed/views/FeedDetailView.vue'
import FeedSearchView from '@/features/feed/views/FeedSearchView.vue'
import HomeFeedView from '@/features/feed/views/HomeFeedView.vue'
import { ROUTE_NAMES } from '@/router'

const routes: RouteRecordRaw[] = [
  {
    path: '/home',
    name: ROUTE_NAMES.homeFeed,
    component: HomeFeedView,
  },
  {
    path: '/home/search',
    name: ROUTE_NAMES.feedSearch,
    component: FeedSearchView,
  },
  {
    path: '/home/content/:feedId',
    name: ROUTE_NAMES.feedDetail,
    component: FeedDetailView,
  },
]

async function mountRoute(path: string, component: typeof HomeFeedView) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('Feed views', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders and cursor-paginates fixture feed cards', async () => {
    const { wrapper } = await mountRoute('/home', HomeFeedView)

    expect(wrapper.get('#feed-title').text()).toBe('推荐内容')
    expect(wrapper.findAll('.feed-card')).toHaveLength(2)
    await wrapper.get('.feed-load-more').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.feed-card')).toHaveLength(4)
  })

  it('searches a validated route query', async () => {
    const { wrapper } = await mountRoute('/home/search?q=TypeScript', FeedSearchView)

    expect(wrapper.get('#feed-search-title').text()).toBe('搜索内容')
    expect(wrapper.text()).toContain('严格 TypeScript')
    expect(wrapper.findAll('.feed-card')).toHaveLength(1)
  })

  it('renders route query validation without results', async () => {
    const { wrapper } = await mountRoute(`/home/search?q=${'a'.repeat(51)}`, FeedSearchView)

    expect(wrapper.get('[role="alert"]').text()).toContain('搜索关键词必须为 1–50 个字符')
    expect(wrapper.findAll('.feed-card')).toHaveLength(0)
  })

  it('renders stable detail with an explicit playback boundary', async () => {
    const { wrapper } = await mountRoute(`/home/content/${FIXTURE_FEED_ID}`, FeedDetailView)

    expect(wrapper.get('#feed-detail-title').text()).toContain('老巷')
    expect(wrapper.text()).toContain('本批次不挂载视频播放器')
    expect(wrapper.get('img').attributes('src')).toBe('/feed/covers/alley.jpg')
  })
})
