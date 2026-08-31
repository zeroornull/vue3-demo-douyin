import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { describe, expect, it } from 'vitest'
import LoginEntryView from '@/features/auth/views/LoginEntryView.vue'
import PasswordLoginView from '@/features/auth/views/PasswordLoginView.vue'
import { useAuthStore } from '@/features/auth/store/auth'
import { ROUTE_NAMES } from '@/router'

const EmptyView = { template: '<div>target</div>' }
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: ROUTE_NAMES.authLogin,
    component: LoginEntryView,
    meta: { migrationRound: 4, title: 'Login', transition: 'none' },
  },
  {
    path: '/login/password',
    name: ROUTE_NAMES.authPassword,
    component: PasswordLoginView,
    meta: { migrationRound: 4, title: 'Password', transition: 'none' },
  },
  {
    path: '/shop',
    name: ROUTE_NAMES.shop,
    component: EmptyView,
    meta: { migrationRound: 2, title: 'Shop', transition: 'none' },
  },
]

async function mountAt(path: string, component: typeof LoginEntryView | typeof PasswordLoginView) {
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  return { pinia, router, wrapper }
}

describe('Auth views', () => {
  it('links the login entry to password login with a safe redirect', async () => {
    const { wrapper } = await mountAt('/login', LoginEntryView)

    expect(wrapper.get('.auth-primary-action').attributes('href')).toBe(
      '/login/password?redirect=/shop',
    )
    expect(wrapper.text()).toContain('13800138000')
  })

  it('renders field errors immediately without calling a gateway', async () => {
    const { wrapper } = await mountAt('/login/password', PasswordLoginView)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('请输入有效的中国大陆手机号')
    expect(wrapper.text()).toContain('密码长度必须为 8–128 个字符')
    expect(wrapper.text()).toContain('请先阅读并同意')
  })

  it('signs in through the fixture adapter and follows the redirect', async () => {
    const { pinia, router, wrapper } = await mountAt(
      '/login/password?redirect=/shop',
      PasswordLoginView,
    )
    await wrapper.get('input[name="phone"]').setValue('13800138000')
    await wrapper.get('input[name="password"]').setValue('douyin-demo')
    await wrapper.get('input[type="checkbox"]').setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/shop')
    expect(useAuthStore(pinia).session).toMatchObject({ userId: 'demo-user' })
  })

  it('shows unauthorized without clearing field validity', async () => {
    const { wrapper } = await mountAt('/login/password', PasswordLoginView)
    await wrapper.get('input[name="phone"]').setValue('13800138000')
    await wrapper.get('input[name="password"]').setValue('wrong-pass')
    await wrapper.get('input[type="checkbox"]').setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('手机号或密码不正确')
    expect(wrapper.findAll('.auth-field-error')).toHaveLength(0)
  })
})
