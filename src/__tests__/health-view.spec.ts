import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HealthView from '@/views/HealthView.vue'

describe('HealthView', () => {
  it('renders the runtime contract', () => {
    const wrapper = mount(HealthView)

    expect(wrapper.get('[data-testid="health-status"]').text()).toBe('ok')
    expect(wrapper.text()).toContain('Package manager')
    expect(wrapper.text()).toContain('Bun 1.4')
    expect(wrapper.get('[data-testid="shop-data-source"]').text()).toBe('fixture')
    expect(wrapper.get('[data-testid="auth-data-source"]').text()).toBe('fixture')
  })
})
