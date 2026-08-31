<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import { formatFeedCount, formatFeedPublishedAt, parseFeedId } from '@/domain/feed/feed'
import { useFeedStore } from '@/features/feed/store/feed'
import MediaPlayer from '@/features/media/components/MediaPlayer.vue'
import FeedInteractions from '@/features/interaction/components/FeedInteractions.vue'
import { ROUTE_NAMES } from '@/router'
import '@/features/feed/feed.css'

defineOptions({ name: 'FeedDetailView' })

const route = useRoute()
const feedStore = useFeedStore()
const { activeItem, activeMedia, detailError, detailStatus } = storeToRefs(feedStore)
const routeError = ref<string | null>(null)
let controller: AbortController | undefined

const feedId = computed(() => {
  const value = route.params.feedId
  return parseFeedId(Array.isArray(value) ? value[0] : value)
})

async function load() {
  routeError.value = null
  if (!feedId.value) {
    routeError.value = '内容地址无效。'
    return
  }
  controller?.abort()
  controller = new AbortController()
  await feedStore.loadItem(feedId.value, { signal: controller.signal })
}

watch(
  () => route.params.feedId,
  () => void load(),
  { immediate: true },
)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="feed-detail-page" aria-labelledby="feed-detail-title">
    <div v-if="routeError" class="feed-state feed-state-error" role="alert">
      <p class="eyebrow">Invalid content</p>
      <h1 id="feed-detail-title">内容地址无效</h1>
      <p>{{ routeError }}</p>
      <RouterLink :to="{ name: ROUTE_NAMES.homeFeed }">返回推荐内容</RouterLink>
    </div>

    <div v-else-if="detailStatus === 'loading'" class="feed-state" aria-live="polite">
      <h1 id="feed-detail-title">正在加载内容…</h1>
    </div>

    <div v-else-if="detailStatus === 'error'" class="feed-state feed-state-error" role="alert">
      <p class="eyebrow">Content error</p>
      <h1 id="feed-detail-title">内容无法加载</h1>
      <p>{{ detailError?.message }}</p>
      <button type="button" @click="load">重新加载</button>
    </div>

    <article v-else-if="activeItem" class="feed-detail">
      <header>
        <RouterLink :to="{ name: ROUTE_NAMES.homeFeed }">← 推荐内容</RouterLink>
        <p class="eyebrow">Stable content · {{ activeItem.id }}</p>
        <h1 id="feed-detail-title">{{ activeItem.caption }}</h1>
        <p>@{{ activeItem.author.handle }} · {{ activeItem.author.displayName }}</p>
      </header>

      <MediaPlayer v-if="activeMedia" :source="activeMedia" />

      <section class="feed-playback-boundary" aria-labelledby="playback-boundary-title">
        <p class="eyebrow">Intentional migration boundary</p>
        <h2 id="playback-boundary-title">播放器只接受用户操作</h2>
        <p>
          本批次迁移播放、暂停、缓冲、结束、错误、静音和键盘控制；自动播放、复杂手势、直播与评论仍不进入。
        </p>
      </section>

      <dl class="feed-detail-metrics">
        <div>
          <dt>喜欢</dt>
          <dd>{{ formatFeedCount(activeItem.likeCount) }}</dd>
        </div>
        <div>
          <dt>评论</dt>
          <dd>{{ formatFeedCount(activeItem.commentCount) }}</dd>
        </div>
        <div>
          <dt>分享</dt>
          <dd>{{ formatFeedCount(activeItem.shareCount) }}</dd>
        </div>
        <div>
          <dt>发布</dt>
          <dd>{{ formatFeedPublishedAt(activeItem.publishedAt) }}</dd>
        </div>
      </dl>

      <ul class="feed-tags" aria-label="内容标签">
        <li v-for="tag in activeItem.tags" :key="tag">#{{ tag }}</li>
      </ul>

      <FeedInteractions :item="activeItem" />
    </article>
  </section>
</template>
