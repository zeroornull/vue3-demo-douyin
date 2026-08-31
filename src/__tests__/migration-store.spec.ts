import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMigrationStore } from '@/stores/migration'

describe('useMigrationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('describes the verified migration boundary', () => {
    const store = useMigrationStore()

    expect(store.completed).toEqual([0, 1, 2, 3])
    expect(store.currentMilestone).toBe('Round 4A Login 已完成')
    expect(store.nextRound).toBe('Round 4B Profile')
    expect(store.summary).toContain('下一批是 Round 4B Profile')
  })
})
