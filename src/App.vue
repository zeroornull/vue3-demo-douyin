<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, RouterView } from 'vue-router'
import { useNavigationStore } from '@/stores/navigation'
import { useAuthStore } from '@/features/auth/store/auth'
import { ROUTE_NAMES } from '@/router'
import { useMessageStore } from '@/features/message/store/message'
import { appEventBus } from '@/infrastructure/events/app-event-bus'

const navigation = useNavigationStore()
const { keepAliveNames, transitionName } = storeToRefs(navigation)
const auth = useAuthStore()
const { session } = storeToRefs(auth)
const messageStore = useMessageStore()
const unreadMessages = ref(0)
let stopUnread: (() => void) | undefined
let stopSignedOut: (() => void) | undefined

onMounted(() => {
  stopUnread = appEventBus.on('message:unread-changed', ({ total }) => {
    unreadMessages.value = total
  })
  stopSignedOut = appEventBus.on('auth:signed-out', () => {
    unreadMessages.value = 0
    messageStore.reset()
  })
})

onBeforeUnmount(() => {
  stopUnread?.()
  stopSignedOut?.()
})
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>

    <header class="app-header">
      <div>
        <p class="eyebrow">Douyin Web Migration</p>
        <p class="brand">现代化迁移工作区</p>
      </div>

      <nav aria-label="主要导航">
        <RouterLink to="/">迁移概览</RouterLink>
        <RouterLink to="/shop">商品样板</RouterLink>
        <RouterLink to="/health">运行状态</RouterLink>
        <RouterLink v-if="session" class="message-nav-link" :to="{ name: ROUTE_NAMES.message }">
          消息
          <span v-if="unreadMessages" aria-label="未读消息">{{ unreadMessages }}</span>
        </RouterLink>
        <RouterLink v-if="!session" to="/login">登录</RouterLink>
        <span v-else class="auth-summary">
          <RouterLink :to="{ name: ROUTE_NAMES.profile }">{{ session.displayName }}</RouterLink>
          <button type="button" @click="auth.signOut">退出</button>
        </span>
      </nav>
    </header>

    <main id="main-content">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="transitionName" mode="out-in">
          <KeepAlive :include="[...keepAliveNames]">
            <component :is="Component" :key="route.fullPath" />
          </KeepAlive>
        </Transition>
      </RouterView>
    </main>

    <footer class="app-footer">
      <span>当前包含现代基座与 Shop、Auth、Profile、Message 纵切，不导入 legacy 运行时代码。</span>
      <span>迁移文档位于仓库 <code>docs/</code>。</span>
    </footer>
  </div>
</template>
