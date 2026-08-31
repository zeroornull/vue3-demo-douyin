import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { pinia } from '@/stores'
import { useNavigationStore } from '@/stores/navigation'
import { defineRouteMeta, parseRouteMeta } from './meta'
import { useAuthStore } from '@/features/auth/store/auth'

export const ROUTE_NAMES = {
  migrationHome: 'migration-home',
  health: 'health',
  shop: 'shop',
  shopDetail: 'shop-detail',
  authLogin: 'auth-login',
  authPassword: 'auth-password',
  profile: 'profile',
  profileEdit: 'profile-edit',
  notFound: 'not-found',
} as const

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: ROUTE_NAMES.migrationHome,
    component: () => import('@/views/MigrationHomeView.vue'),
    meta: defineRouteMeta({ migrationRound: 1, title: '迁移概览', transition: 'none' }),
  },
  {
    path: '/health',
    name: ROUTE_NAMES.health,
    component: () => import('@/views/HealthView.vue'),
    meta: defineRouteMeta({ migrationRound: 1, title: '运行状态', transition: 'fade' }),
  },
  {
    path: '/login',
    name: ROUTE_NAMES.authLogin,
    component: () => import('@/features/auth/views/LoginEntryView.vue'),
    meta: defineRouteMeta({ migrationRound: 4, title: '登录', transition: 'forward' }),
  },
  {
    path: '/login/password',
    name: ROUTE_NAMES.authPassword,
    component: () => import('@/features/auth/views/PasswordLoginView.vue'),
    meta: defineRouteMeta({ migrationRound: 4, title: '密码登录', transition: 'forward' }),
  },
  {
    path: '/login/other',
    redirect: { name: ROUTE_NAMES.authPassword },
    meta: defineRouteMeta({ migrationRound: 4, title: '登录方式重定向', transition: 'forward' }),
  },
  {
    path: '/me',
    name: ROUTE_NAMES.profile,
    component: () => import('@/features/profile/views/ProfileView.vue'),
    meta: defineRouteMeta({
      migrationRound: 4,
      title: '个人资料',
      transition: 'forward',
      requiresAuth: true,
    }),
  },
  {
    path: '/me/edit-userinfo',
    name: ROUTE_NAMES.profileEdit,
    component: () => import('@/features/profile/views/EditProfileView.vue'),
    meta: defineRouteMeta({
      migrationRound: 4,
      title: '编辑资料',
      transition: 'forward',
      requiresAuth: true,
    }),
  },
  {
    path: '/shop',
    name: ROUTE_NAMES.shop,
    component: () => import('@/features/shop/views/ShopListView.vue'),
    meta: defineRouteMeta({
      migrationRound: 2,
      title: '商品样板',
      transition: 'forward',
      keepAlive: true,
      keepAliveName: 'ShopListView',
    }),
  },
  {
    path: '/shop/detail',
    redirect: { name: ROUTE_NAMES.shop },
    meta: defineRouteMeta({ migrationRound: 2, title: '商品详情重定向', transition: 'back' }),
  },
  {
    path: '/shop/detail/:productId',
    name: ROUTE_NAMES.shopDetail,
    component: () => import('@/features/shop/views/ShopDetailView.vue'),
    meta: defineRouteMeta({ migrationRound: 2, title: '商品详情', transition: 'forward' }),
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/views/NotFoundView.vue'),
    meta: defineRouteMeta({ migrationRound: 1, title: '页面未迁移', transition: 'fade' }),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const meta = parseRouteMeta(to.meta)
  if (meta.requiresAuth && !useAuthStore(pinia).session) {
    return {
      name: ROUTE_NAMES.authPassword,
      query: { redirect: to.fullPath },
    }
  }
  return true
})

router.afterEach((to) => {
  const meta = parseRouteMeta(to.meta)
  document.title = `${meta.title} · Douyin Web Migration`
  const state: unknown = window.history.state
  const position =
    typeof state === 'object' &&
    state !== null &&
    'position' in state &&
    typeof state.position === 'number'
      ? state.position
      : null
  useNavigationStore(pinia).completeNavigation({
    title: meta.title,
    preferredTransition: meta.transition,
    position,
    ...(meta.keepAliveName ? { keepAliveName: meta.keepAliveName } : {}),
  })
})

export default router
