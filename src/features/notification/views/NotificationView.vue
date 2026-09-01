<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { AppNotification } from '@/domain/notification/notification'
import { ROUTE_NAMES } from '@/router'
import '@/features/notification/notification.css'

defineOptions({ name: 'NotificationView' })
const notifications = ref<AppNotification[]>([
  {
    id: 'notice-1',
    kind: 'system',
    title: '系统通知',
    body: '协议修订通知',
    createdAt: '2026-09-01T01:00:00Z',
    read: false,
  },
  {
    id: 'notice-2',
    kind: 'task',
    title: '任务通知',
    body: '完成迁移学习任务',
    createdAt: '2026-08-31T01:00:00Z',
    read: false,
  },
  {
    id: 'notice-3',
    kind: 'wallet',
    title: '钱包通知',
    body: '卡券发放提醒',
    createdAt: '2026-08-30T01:00:00Z',
    read: true,
  },
])
const unread = computed(() => notifications.value.filter((item) => !item.read).length)
function markRead(id: string) {
  notifications.value = notifications.value.map((item) =>
    item.id === id ? { ...item, read: true } : item,
  )
}
function markAllRead() {
  notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
}
</script>
<template>
  <section class="notification-page" aria-labelledby="notification-title">
    <header>
      <div>
        <p class="eyebrow">Round 4G · Typed notifications</p>
        <h1 id="notification-title">通知中心</h1>
        <p>{{ unread }} 条未读</p>
      </div>
      <button type="button" :disabled="unread === 0" @click="markAllRead">全部已读</button>
    </header>
    <RouterLink :to="{ name: ROUTE_NAMES.message }">← 返回消息</RouterLink>
    <ol>
      <li v-for="item in notifications" :key="item.id" :class="{ unread: !item.read }">
        <div>
          <strong>{{ item.title }}</strong>
          <p>{{ item.body }}</p>
          <time :datetime="item.createdAt">{{
            new Date(item.createdAt).toLocaleDateString('zh-CN')
          }}</time>
        </div>
        <button v-if="!item.read" type="button" @click="markRead(item.id)">标为已读</button
        ><span v-else>已读</span>
      </li>
    </ol>
  </section>
</template>
