import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useNavigationStore } from '@/stores/navigation'

describe('useNavigationStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('derives forward and back from history positions', () => {
    const store = useNavigationStore()
    store.completeNavigation({ position: 1, preferredTransition: 'forward', title: 'one' })
    store.completeNavigation({ position: 2, preferredTransition: 'forward', title: 'two' })
    expect(store.direction).toBe('forward')
    expect(store.transitionName).toBe('route-forward')

    store.completeNavigation({ position: 1, preferredTransition: 'forward', title: 'one' })
    expect(store.direction).toBe('back')
    expect(store.transitionName).toBe('route-back')
  })

  it('honors an explicit fade transition', () => {
    const store = useNavigationStore()
    store.completeNavigation({ position: 1, preferredTransition: 'fade', title: 'one' })
    store.completeNavigation({ position: 2, preferredTransition: 'fade', title: 'two' })

    expect(store.transitionName).toBe('route-fade')
  })

  it('deduplicates keep-alive component names', () => {
    const store = useNavigationStore()
    const navigation = {
      keepAliveName: 'ShopListView',
      position: 1,
      preferredTransition: 'forward' as const,
      title: 'shop',
    }
    store.completeNavigation(navigation)
    store.completeNavigation(navigation)

    expect(store.keepAliveNames).toEqual(['ShopListView'])
  })
})
