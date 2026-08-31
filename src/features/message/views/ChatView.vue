<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import { formatMessageTime, messageInitials, parseConversationId } from '@/domain/message/message'
import { useAuthStore } from '@/features/auth/store/auth'
import { useMessageStore } from '@/features/message/store/message'
import { ROUTE_NAMES } from '@/router'
import '@/features/message/message.css'

defineOptions({ name: 'ChatView' })

const route = useRoute()
const auth = useAuthStore()
const messageStore = useMessageStore()
const { session } = storeToRefs(auth)
const { activeConversation, fieldErrors, messages, nextMessageCursor, threadError, threadStatus } =
  storeToRefs(messageStore)
const composer = ref('')
const routeError = ref<string | null>(null)
let controller: AbortController | undefined

const conversationId = computed(() => {
  const value = route.params.conversationId
  return parseConversationId(Array.isArray(value) ? value[0] : value)
})
const showingActiveConversation = computed(
  () => activeConversation.value?.id === conversationId.value,
)

function deliveryLabel(delivery: 'delivered' | 'read' | 'sent') {
  return delivery === 'read' ? '已读' : delivery === 'delivered' ? '已送达' : '已发送'
}

async function load() {
  routeError.value = null
  if (!conversationId.value) {
    routeError.value = '会话地址无效。'
    return
  }
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await messageStore.openConversation(session.value, conversationId.value, {
    signal: controller.signal,
  })
  if (!result.ok && result.error.kind === 'unauthorized') auth.signOut()
}

async function loadOlder() {
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await messageStore.loadOlderMessages(session.value, {
    signal: controller.signal,
  })
  if (!result.ok && result.error.kind === 'unauthorized') auth.signOut()
}

async function send() {
  if (!session.value) return
  controller?.abort()
  controller = new AbortController()
  const result = await messageStore.sendMessage(session.value, composer.value, {
    signal: controller.signal,
  })
  if (result.ok) composer.value = ''
  else if (result.error.kind === 'unauthorized') auth.signOut()
}

watch(
  () => route.params.conversationId,
  () => void load(),
  { immediate: true },
)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="chat-page" aria-labelledby="chat-title">
    <div v-if="routeError" class="message-state message-state-error" role="alert">
      <p class="eyebrow">Invalid conversation</p>
      <h1 id="chat-title">会话地址无效</h1>
      <p>{{ routeError }}</p>
      <RouterLink :to="{ name: ROUTE_NAMES.message }">返回消息</RouterLink>
    </div>

    <div
      v-else-if="threadStatus === 'loading' && !showingActiveConversation"
      class="message-state"
      aria-live="polite"
    >
      <h1 id="chat-title">正在加载聊天…</h1>
    </div>

    <div
      v-else-if="threadStatus === 'error' && !showingActiveConversation"
      class="message-state message-state-error"
      role="alert"
    >
      <p class="eyebrow">Thread error</p>
      <h1 id="chat-title">聊天无法加载</h1>
      <p>{{ threadError?.message }}</p>
      <button type="button" @click="load">重新加载</button>
    </div>

    <template v-else-if="activeConversation && showingActiveConversation">
      <header class="chat-heading">
        <RouterLink class="chat-back" :to="{ name: ROUTE_NAMES.message }">← 消息</RouterLink>
        <span class="message-avatar" aria-hidden="true">
          {{ messageInitials(activeConversation.participant.displayName) }}
          <i v-if="activeConversation.participant.online"></i>
        </span>
        <div>
          <p class="eyebrow">Stable conversation · {{ activeConversation.id }}</p>
          <h1 id="chat-title">{{ activeConversation.participant.displayName }}</h1>
          <p>@{{ activeConversation.participant.handle }}</p>
        </div>
      </header>

      <div v-if="threadStatus === 'error' && threadError" class="message-inline-error" role="alert">
        {{ threadError.message }}
      </div>

      <div class="chat-history-actions">
        <button
          v-if="nextMessageCursor"
          type="button"
          :disabled="threadStatus === 'loading-more'"
          @click="loadOlder"
        >
          {{ threadStatus === 'loading-more' ? '加载中…' : '加载更早消息' }}
        </button>
        <span v-else>已到达会话起点</span>
      </div>

      <ol class="chat-thread" aria-label="聊天记录" aria-live="polite">
        <li
          v-for="message in messages"
          :key="message.id"
          :class="{ 'chat-message-self': message.senderId === session?.userId }"
        >
          <article>
            <p>{{ message.body }}</p>
            <footer>
              <time :datetime="message.sentAt">{{ formatMessageTime(message.sentAt) }}</time>
              <span v-if="message.senderId === session?.userId">
                {{ deliveryLabel(message.delivery) }}
              </span>
            </footer>
          </article>
        </li>
      </ol>

      <form class="message-composer" novalidate @submit.prevent="send">
        <label for="message-body">消息内容</label>
        <textarea
          id="message-body"
          v-model="composer"
          name="body"
          rows="3"
          maxlength="500"
          placeholder="发送信息…"
          :aria-invalid="Boolean(fieldErrors.body)"
        ></textarea>
        <div class="message-composer-meta">
          <small v-if="fieldErrors.body" role="alert">{{ fieldErrors.body }}</small>
          <span>{{ composer.length }}/500</span>
        </div>
        <button type="submit" :disabled="threadStatus === 'sending'">
          {{ threadStatus === 'sending' ? '发送中…' : '发送' }}
        </button>
      </form>
    </template>
  </section>
</template>
