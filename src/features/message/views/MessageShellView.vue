<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth'
import { useMessageStore } from '@/features/message/store/message'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { ROUTE_NAMES } from '@/router'

defineOptions({ name: 'MessageShellView' })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const messageStore = useMessageStore()
const { session } = storeToRefs(auth)
let stopIncomingMessages: (() => void) | undefined
let redirectingToLogin = false

async function redirectToLogin() {
  if (redirectingToLogin) return
  redirectingToLogin = true
  const redirect = route.fullPath
  messageStore.reset()
  await router.replace({ name: ROUTE_NAMES.authPassword, query: { redirect } })
}

watch(session, (value) => {
  if (!value) void redirectToLogin()
})

onMounted(() => {
  stopIncomingMessages = appEventBus.on('message:received', ({ message }) => {
    messageStore.receiveIncomingMessage(message)
  })
})

onBeforeUnmount(() => stopIncomingMessages?.())
</script>

<template>
  <RouterView />
</template>
