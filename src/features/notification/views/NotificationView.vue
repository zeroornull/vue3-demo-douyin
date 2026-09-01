<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth'
import { useNotificationStore } from '@/features/notification/store/notification'
import { ROUTE_NAMES } from '@/router'
import '@/features/notification/notification.css'
defineOptions({ name: 'NotificationView' })
const auth = useAuthStore()
const store = useNotificationStore()
const { session } = storeToRefs(auth)
const { notifications, nextCursor, status, error, unread } = storeToRefs(store)
let controller: AbortController | undefined
async function load(append = false) {
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await store.load(session.value, { append, signal: controller.signal })
  if (!result.ok && result.error.kind === 'unauthorized') auth.signOut()
}
async function mark(ids: readonly (typeof notifications.value)[number]['id'][]) {
  if (!session.value) return
  const result = await store.mark(session.value, ids)
  if (!result.ok && result.error.kind === 'unauthorized') auth.signOut()
}
onMounted(() => load())
onBeforeUnmount(() => controller?.abort())
</script>
<template>
  <section class="notification-page" aria-labelledby="notification-title">
    <header>
      <div>
        <p class="eyebrow">Round 4G · Notification Gateway</p>
        <h1 id="notification-title">通知中心</h1>
        <p>{{ unread }} 条未读</p>
      </div>
      <button
        type="button"
        :disabled="unread === 0 || status === 'updating'"
        @click="session && store.markAll(session)"
      >
        全部已读
      </button>
    </header>
    <RouterLink :to="{ name: ROUTE_NAMES.message }">← 返回消息</RouterLink>
    <div v-if="status === 'loading'">正在加载通知…</div>
    <div v-else-if="status === 'error' && error" role="alert">{{ error.message }}</div>
    <ol>
      <li v-for="item in notifications" :key="item.id" :class="{ unread: !item.read }">
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.body }}</p>
          <time :datetime="item.createdAt">{{
            new Date(item.createdAt).toLocaleDateString('zh-CN')
          }}</time>
        </div>
        <button v-if="!item.read" type="button" @click="mark([item.id])">标为已读</button
        ><span v-else>已读</span>
      </li>
    </ol>
    <button v-if="nextCursor" type="button" @click="load(true)">加载更多通知</button>
  </section>
</template>
