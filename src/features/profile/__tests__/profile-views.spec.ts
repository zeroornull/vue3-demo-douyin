import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { fixtureAuthGateway } from '@/features/auth/api/fixture-auth-gateway'
import { useAuthStore } from '@/features/auth/store/auth'
import EditProfileView from '@/features/profile/views/EditProfileView.vue'
import ProfileView from '@/features/profile/views/ProfileView.vue'
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
    path: '/me',
    name: ROUTE_NAMES.profile,
    component: ProfileView,
    meta: { migrationRound: 4, title: 'Profile', transition: 'none', requiresAuth: true },
  },
  {
    path: '/me/edit-userinfo',
    name: ROUTE_NAMES.profileEdit,
    component: EditProfileView,
    meta: { migrationRound: 4, title: 'Edit', transition: 'none', requiresAuth: true },
  },
]

async function mountAuthenticated(
  path: string,
  component: typeof ProfileView | typeof EditProfileView,
) {
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
  const wrapper = mount(component, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('Profile views', () => {
  it('renders fixture profile and stats', async () => {
    const { wrapper } = await mountAuthenticated('/me', ProfileView)

    expect(wrapper.get('#profile-title').text()).toContain('杨老虎')
    expect(wrapper.text()).toContain('@12345xiaolaohu')
    expect(wrapper.findAll('.profile-stats > div')).toHaveLength(5)
  })

  it('tracks dirty form state and validates display name', async () => {
    const { wrapper } = await mountAuthenticated('/me/edit-userinfo', EditProfileView)
    await wrapper.get('input[name="displayName"]').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('有未保存修改')
    expect(wrapper.text()).toContain('名字长度必须为 1–20 个字符')
  })

  it('saves a valid name and returns to profile', async () => {
    const { router, wrapper } = await mountAuthenticated('/me/edit-userinfo', EditProfileView)
    await wrapper.get('input[name="displayName"]').setValue('资料新名字')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.profile)
  })
})
