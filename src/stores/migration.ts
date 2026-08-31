import { computed, readonly, ref } from 'vue'
import { defineStore } from 'pinia'

const completedRounds = [0, 1, 2, 3] as const

export const useMigrationStore = defineStore('migration', () => {
  const currentMilestone = ref('Round 4A Login 已完成')
  const nextRound = ref('Round 4B Profile')
  const completed = readonly(ref<readonly number[]>(completedRounds))

  const summary = computed(() => `${currentMilestone.value}，下一批是 ${nextRound.value}。`)

  return {
    completed,
    currentMilestone,
    nextRound,
    summary,
  }
})
