import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { describe, expect, it } from 'vitest'
import ShopDetailView from '@/features/shop/views/ShopDetailView.vue'
import ShopListView from '@/features/shop/views/ShopListView.vue'
import { useShopStore } from '@/features/shop/store/shop'
import { ROUTE_NAMES } from '@/router'

const testRoutes = [
  {
    path: '/shop',
    name: ROUTE_NAMES.shop,
    component: ShopListView,
    meta: { migrationRound: 2, title: 'Shop test', transition: 'none' },
  },
  {
    path: '/shop/detail/:productId',
    name: ROUTE_NAMES.shopDetail,
    component: ShopDetailView,
    meta: { migrationRound: 2, title: 'Detail test', transition: 'none' },
  },
] satisfies RouteRecordRaw[]

async function mountAt(path: string, component: typeof ShopListView | typeof ShopDetailView) {
  const router = createRouter({ history: createMemoryHistory(), routes: testRoutes })
  const pinia = createPinia()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { pinia, wrapper }
}

describe('typed Shop views', () => {
  it('renders six parsed products with stable detail URLs', async () => {
    const { wrapper } = await mountAt('/shop', ShopListView)

    expect(wrapper.findAll('.product-card')).toHaveLength(6)
    expect(wrapper.get('.product-card').attributes('href')).toBe('/shop/detail/g6')
  })

  it('loads a product from a direct detail URL without routeData', async () => {
    const { pinia, wrapper } = await mountAt('/shop/detail/g6', ShopDetailView)

    expect(wrapper.get('#product-title').text()).toContain('小米电视6')
    expect(wrapper.text()).toContain('ID g6')
    expect(useShopStore(pinia).lastViewedEvent).toMatchObject({
      type: 'shop:product-viewed',
      payload: { productId: 'g6' },
    })
  })

  it('renders not-found for an invalid branded ID', async () => {
    const { wrapper } = await mountAt('/shop/detail/not-valid', ShopDetailView)

    expect(wrapper.get('[data-testid="product-not-found"]').text()).toContain('商品不存在')
  })
})
