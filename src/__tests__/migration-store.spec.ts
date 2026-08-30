import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMigrationStore } from '@/stores/migration'

describe('useMigrationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('describes the verified migration boundary', () => {
    const store = useMigrationStore()

    expect(store.completed).toEqual([0, 1])
    expect(store.nextRound).toBe(2)
    expect(store.summary).toContain('第 1 轮已完成')
  })
})
