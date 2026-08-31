<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { formatConversationTime, messageInitials } from '@/domain/message/message'
import { useAuthStore } from '@/features/auth/store/auth'
import { useMessageStore } from '@/features/message/store/message'
import { ROUTE_NAMES } from '@/router'
import '@/features/message/message.css'

defineOptions({ name: 'MessageListView' })

const auth = useAuthStore()
const messageStore = useMessageStore()
const { session } = storeToRefs(auth)
const { conversations, listError, listStatus, nextConversationCursor, unreadTotal } =
  storeToRefs(messageStore)
let controller: AbortController | undefined

async function load(append = false) {
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await messageStore.loadConversations(session.value, {
    append,
    signal: controller.signal,
  })
  if (!result.ok && result.error.kind === 'unauthorized') auth.signOut()
}

onMounted(() => load())
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="message-page" aria-labelledby="message-title">
    <header class="message-heading">
      <div>
        <p class="eyebrow">Round 4C · Typed conversations</p>
        <h1 id="message-title">消息</h1>
        <p>会话以稳定 ID、cursor 分页和明确未读状态进入现代运行时。</p>
      </div>
      <div class="message-unread-summary" aria-live="polite">
        <strong>{{ unreadTotal }}</strong>
        <span>条未读</span>
      </div>
    </header>

    <div
      v-if="listStatus === 'idle' || (listStatus === 'loading' && conversations.length === 0)"
      class="message-state"
      aria-live="polite"
    >
      <h2>正在加载会话…</h2>
    </div>

    <div
      v-else-if="listStatus === 'error' && conversations.length === 0"
      class="message-state message-state-error"
      role="alert"
    >
      <p class="eyebrow">Conversation error</p>
      <h2>消息暂时无法加载</h2>
      <p>{{ listError?.message }}</p>
      <button type="button" @click="load(false)">重新加载</button>
    </div>

    <div v-else-if="conversations.length === 0" class="message-state message-empty">
      <p class="eyebrow">Empty inbox</p>
      <h2>还没有会话</h2>
      <p>空列表是显式业务状态，不会伪装成网络错误。</p>
    </div>

    <template v-else>
      <ul class="conversation-list" aria-label="会话列表">
        <li v-for="conversation in conversations" :key="conversation.id">
          <RouterLink
            class="conversation-row"
            :to="{
              name: ROUTE_NAMES.messageChat,
              params: { conversationId: conversation.id },
            }"
          >
            <span class="message-avatar" aria-hidden="true">
              {{ messageInitials(conversation.participant.displayName) }}
              <i v-if="conversation.participant.online"></i>
            </span>
            <span class="conversation-content">
              <span class="conversation-line">
                <strong>{{ conversation.participant.displayName }}</strong>
                <time :datetime="conversation.updatedAt">
                  {{ formatConversationTime(conversation.updatedAt) }}
                </time>
              </span>
              <span class="conversation-line conversation-preview">
                <span>{{ conversation.lastMessage?.body || '还没有消息' }}</span>
                <b
                  v-if="conversation.unreadCount"
                  :aria-label="`${conversation.unreadCount} 条未读`"
                >
                  {{ conversation.unreadCount }}
                </b>
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>

      <div v-if="listStatus === 'error' && listError" class="message-inline-error" role="alert">
        {{ listError.message }}
      </div>

      <button
        v-if="nextConversationCursor"
        class="message-load-more"
        type="button"
        :disabled="listStatus === 'loading-more'"
        @click="load(true)"
      >
        {{ listStatus === 'loading-more' ? '加载中…' : '加载更多会话' }}
      </button>
      <p v-else class="message-end">会话已全部加载</p>
    </template>
  </section>
</template>
