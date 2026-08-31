<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { formatFeedCount, type FeedItem } from '@/domain/feed/feed'
import { formatCommentTime, interactionInitials } from '@/domain/interaction/interaction'
import { useAuthStore } from '@/features/auth/store/auth'
import { useInteractionStore } from '@/features/interaction/store/interaction'
import { ROUTE_NAMES } from '@/router'
import '@/features/interaction/interaction.css'

defineOptions({ name: 'FeedInteractions' })

const props = defineProps<{ readonly item: FeedItem }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const interaction = useInteractionStore()
const { session } = storeToRefs(auth)
const {
  comments,
  commentError,
  commentStatus,
  fieldErrors,
  liked,
  likeCount,
  likeError,
  likeStatus,
  nextCursor,
} = storeToRefs(interaction)
const body = ref('')
const commentInput = ref<HTMLTextAreaElement>()
let controller: AbortController | undefined

async function load(append = false) {
  controller?.abort()
  controller = new AbortController()
  await interaction.loadComments({ append, signal: controller.signal })
}

async function redirectToLogin(focusComment = false) {
  const redirect = `${route.fullPath.split('#')[0]}${focusComment ? '#comment-form' : ''}`
  await router.push({ name: ROUTE_NAMES.authPassword, query: { redirect } })
}

async function handleUnauthorized(focusComment = false) {
  auth.signOut()
  await redirectToLogin(focusComment)
}

async function toggleLike() {
  if (!session.value) {
    await redirectToLogin()
    return
  }
  controller?.abort()
  controller = new AbortController()
  const result = await interaction.toggleLike(session.value, { signal: controller.signal })
  if (!result.ok && result.error.kind === 'unauthorized') await handleUnauthorized()
}

async function submitComment() {
  if (commentStatus.value === 'submitting') return
  if (!session.value) {
    await redirectToLogin(true)
    return
  }
  controller?.abort()
  controller = new AbortController()
  const result = await interaction.submitComment(session.value, body.value, {
    signal: controller.signal,
  })
  if (result.ok) {
    body.value = ''
    await nextTick()
    commentInput.value?.focus()
  } else if (result.error.kind === 'unauthorized') await handleUnauthorized(true)
}

watch(
  () => props.item.id,
  () => {
    interaction.initialize(props.item)
    void load()
  },
  { immediate: true },
)

onMounted(async () => {
  if (route.hash === '#comment-form') {
    await nextTick()
    commentInput.value?.focus()
  }
})
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="feed-interactions" aria-labelledby="interactions-title">
    <header>
      <div>
        <p class="eyebrow">Typed optimistic interactions</p>
        <h2 id="interactions-title">点赞与评论</h2>
      </div>
      <button
        class="feed-like-button"
        type="button"
        :aria-pressed="liked"
        :disabled="likeStatus === 'updating'"
        @click="toggleLike"
      >
        {{ liked ? '取消喜欢' : '喜欢' }} · {{ formatFeedCount(likeCount) }}
      </button>
    </header>

    <p v-if="likeStatus === 'updating'" class="interaction-note" aria-live="polite">
      正在同步点赞…
    </p>
    <div v-if="likeError" class="interaction-error" role="alert">{{ likeError.message }}</div>

    <form id="comment-form" class="comment-form" novalidate @submit.prevent="submitComment">
      <label for="comment-body">发表评论</label>
      <textarea
        id="comment-body"
        ref="commentInput"
        v-model="body"
        name="comment"
        rows="3"
        maxlength="300"
        placeholder="善语结善缘，恶言伤人心"
        :aria-invalid="Boolean(fieldErrors.body)"
      ></textarea>
      <div class="comment-form-meta">
        <small v-if="fieldErrors.body" role="alert">{{ fieldErrors.body }}</small>
        <span>{{ body.length }}/300</span>
      </div>
      <button type="submit" :disabled="commentStatus === 'submitting'">
        {{ commentStatus === 'submitting' ? '提交中…' : session ? '发表评论' : '登录后评论' }}
      </button>
    </form>

    <div v-if="commentError" class="interaction-error" role="alert">
      {{ commentError.message }}
    </div>

    <div
      v-if="commentStatus === 'loading' && comments.length === 0"
      class="comments-state"
      aria-live="polite"
    >
      正在加载评论…
    </div>
    <div v-else-if="commentStatus === 'error' && comments.length === 0" class="comments-state">
      评论暂时无法加载。
      <button type="button" @click="load()">重新加载</button>
    </div>
    <div v-else-if="comments.length === 0" class="comments-state">
      还没有评论，成为第一个发言的人。
    </div>

    <ol v-else class="comment-list" aria-label="评论列表" aria-live="polite">
      <li v-for="comment in comments" :key="comment.id" :class="{ pending: comment.pending }">
        <span class="comment-avatar" aria-hidden="true">
          {{ interactionInitials(comment.author.displayName) }}
        </span>
        <article>
          <header>
            <strong>{{ comment.author.displayName }}</strong>
            <time :datetime="comment.createdAt">{{ formatCommentTime(comment.createdAt) }}</time>
          </header>
          <p>{{ comment.body }}</p>
          <footer>
            <span>赞 {{ formatFeedCount(comment.likeCount) }}</span>
            <span v-if="comment.pending">正在发送…</span>
          </footer>
        </article>
      </li>
    </ol>

    <button
      v-if="nextCursor"
      class="comments-load-more"
      type="button"
      :disabled="commentStatus === 'loading-more'"
      @click="load(true)"
    >
      {{ commentStatus === 'loading-more' ? '加载中…' : '加载更多评论' }}
    </button>
  </section>
</template>
