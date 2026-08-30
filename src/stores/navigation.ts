import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppRouteMeta } from '@/router/meta'

export type NavigationDirection = 'back' | 'forward' | 'none'

export interface CompletedNavigation {
  readonly keepAliveName?: string
  readonly position: number | null
  readonly preferredTransition: AppRouteMeta['transition']
  readonly title: string
}

export const useNavigationStore = defineStore('navigation', () => {
  const currentTitle = ref('迁移概览')
  const direction = ref<NavigationDirection>('none')
  const preferredTransition = ref<AppRouteMeta['transition']>('none')
  const previousPosition = ref<number | null>(null)
  const keepAliveNames = ref<readonly string[]>([])

  const transitionName = computed(() => {
    if (preferredTransition.value === 'none' || direction.value === 'none') return ''
    if (preferredTransition.value === 'fade') return 'route-fade'
    if (direction.value === 'back') return 'route-back'
    if (direction.value === 'forward') return 'route-forward'
    return ''
  })

  function completeNavigation(navigation: CompletedNavigation) {
    currentTitle.value = navigation.title
    preferredTransition.value = navigation.preferredTransition
    if (navigation.position === null || previousPosition.value === null) {
      direction.value = 'none'
    } else if (navigation.position > previousPosition.value) {
      direction.value = 'forward'
    } else if (navigation.position < previousPosition.value) {
      direction.value = 'back'
    } else {
      direction.value =
        navigation.preferredTransition === 'back' || navigation.preferredTransition === 'forward'
          ? navigation.preferredTransition
          : 'none'
    }
    previousPosition.value = navigation.position

    if (navigation.keepAliveName && !keepAliveNames.value.includes(navigation.keepAliveName)) {
      keepAliveNames.value = [...keepAliveNames.value, navigation.keepAliveName]
    }
  }

  return {
    currentTitle,
    direction,
    keepAliveNames,
    transitionName,
    completeNavigation,
  }
})
