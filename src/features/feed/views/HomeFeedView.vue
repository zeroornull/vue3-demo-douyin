<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import FeedCard from '@/features/feed/components/FeedCard.vue'
import { useFeedStore } from '@/features/feed/store/feed'
import { ROUTE_NAMES } from '@/router'
import '@/features/feed/feed.css'

defineOptions({ name: 'HomeFeedView' })

const feedStore = useFeedStore()
const { feedError, feedStatus, items, nextCursor } = storeToRefs(feedStore)
let controller: AbortController | undefined

async function load(options: { append?: boolean; refresh?: boolean } = {}) {
  controller?.abort()
  controller = new AbortController()
  await feedStore.loadFeed({ ...options, signal: controller.signal })
}

onMounted(() => load())
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="feed-page" aria-labelledby="feed-title">
    <header class="feed-heading">
      <div>
        <p class="eyebrow">Round 4D · Read-only feed</p>
        <h1 id="feed-title">推荐内容</h1>
        <p>先迁移稳定的内容发现、搜索和深链，不在同一批次复制视频播放器与手势系统。</p>
      </div>
      <div class="feed-heading-actions">
        <RouterLink :to="{ name: ROUTE_NAMES.feedSearch }">搜索内容</RouterLink>
        <button
          type="button"
          :disabled="feedStatus === 'refreshing'"
          @click="load({ refresh: true })"
        >
          {{ feedStatus === 'refreshing' ? '刷新中…' : '刷新推荐' }}
        </button>
      </div>
    </header>

    <div
      v-if="feedStatus === 'idle' || (feedStatus === 'loading' && items.length === 0)"
      class="feed-state"
      aria-live="polite"
    >
      <h2>正在加载推荐内容…</h2>
    </div>

    <div
      v-else-if="feedStatus === 'error' && items.length === 0"
      class="feed-state feed-state-error"
      role="alert"
    >
      <p class="eyebrow">Feed error</p>
      <h2>推荐内容无法加载</h2>
      <p>{{ feedError?.message }}</p>
      <button type="button" @click="load()">重新加载</button>
    </div>

    <div v-else-if="items.length === 0" class="feed-state feed-empty">
      <p class="eyebrow">Empty feed</p>
      <h2>暂时没有推荐内容</h2>
      <p>空 Feed 是业务状态，不会被当成请求错误。</p>
    </div>

    <template v-else>
      <div v-if="feedStatus === 'error' && feedError" class="feed-inline-error" role="alert">
        {{ feedError.message }}
      </div>
      <div class="feed-grid" aria-label="推荐内容列表">
        <FeedCard v-for="item in items" :key="item.id" :item="item" />
      </div>
      <button
        v-if="nextCursor"
        class="feed-load-more"
        type="button"
        :disabled="feedStatus === 'loading-more'"
        @click="load({ append: true })"
      >
        {{ feedStatus === 'loading-more' ? '加载中…' : '加载更多内容' }}
      </button>
      <p v-else class="feed-end">推荐内容已全部加载</p>
    </template>
  </section>
</template>
