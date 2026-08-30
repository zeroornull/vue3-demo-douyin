import { computed, readonly, ref } from 'vue'
import { defineStore } from 'pinia'

const completedRounds = [0, 1] as const

export const useMigrationStore = defineStore('migration', () => {
  const nextRound = ref(2)
  const completed = readonly(ref<readonly number[]>(completedRounds))

  const summary = computed(
    () =>
      `第 ${completed.value[completed.value.length - 1] ?? 0} 轮已完成，下一轮是第 ${nextRound.value} 轮。`,
  )

  return {
    completed,
    nextRound,
    summary,
  }
})
