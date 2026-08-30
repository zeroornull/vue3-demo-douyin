import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

export const ROUTE_NAMES = {
  migrationHome: 'migration-home',
  health: 'health',
  shop: 'shop',
  shopDetail: 'shop-detail',
  notFound: 'not-found',
} as const

const routes = [
  {
    path: '/',
    name: ROUTE_NAMES.migrationHome,
    component: () => import('@/views/MigrationHomeView.vue'),
    meta: { migrationRound: 1, title: '迁移概览', transition: 'none' },
  },
  {
    path: '/health',
    name: ROUTE_NAMES.health,
    component: () => import('@/views/HealthView.vue'),
    meta: { migrationRound: 1, title: '运行状态', transition: 'fade' },
  },
  {
    path: '/shop',
    name: ROUTE_NAMES.shop,
    component: () => import('@/features/shop/views/ShopListView.vue'),
    meta: { migrationRound: 2, title: '商品样板', transition: 'forward', keepAlive: true },
  },
  {
    path: '/shop/detail',
    redirect: { name: ROUTE_NAMES.shop },
    meta: { migrationRound: 2, title: '商品详情重定向', transition: 'back' },
  },
  {
    path: '/shop/detail/:productId',
    name: ROUTE_NAMES.shopDetail,
    component: () => import('@/features/shop/views/ShopDetailView.vue'),
    meta: { migrationRound: 2, title: '商品详情', transition: 'forward' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/views/NotFoundView.vue'),
    meta: { migrationRound: 1, title: '页面未迁移', transition: 'fade' },
  },
] satisfies RouteRecordRaw[]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = `${to.meta.title} · Douyin Web Migration`
})

export default router
