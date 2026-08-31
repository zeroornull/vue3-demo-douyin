<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import FeedCard from '@/features/feed/components/FeedCard.vue'
import { useFeedStore } from '@/features/feed/store/feed'
import { ROUTE_NAMES } from '@/router'
import '@/features/feed/feed.css'

defineOptions({ name: 'FeedSearchView' })

const route = useRoute()
const router = useRouter()
const feedStore = useFeedStore()
const { nextSearchCursor, searchError, searchFieldErrors, searchItems, searchQuery, searchStatus } =
  storeToRefs(feedStore)
const input = ref('')
let controller: AbortController | undefined

const routeQuery = computed(() => {
  const value = route.query.q
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
})

async function executeSearch(append = false) {
  if (!routeQuery.value.trim()) {
    controller?.abort()
    controller = undefined
    feedStore.clearSearch()
    return
  }
  controller?.abort()
  controller = new AbortController()
  await feedStore.searchFeed(routeQuery.value, {
    append,
    signal: controller.signal,
  })
}

async function submit() {
  if (input.value === routeQuery.value) await executeSearch()
  else await router.push({ name: ROUTE_NAMES.feedSearch, query: { q: input.value } })
}

watch(
  routeQuery,
  (value) => {
    input.value = value
    void executeSearch()
  },
  { immediate: true },
)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <section class="feed-search-page" aria-labelledby="feed-search-title">
    <header class="feed-search-heading">
      <RouterLink :to="{ name: ROUTE_NAMES.homeFeed }">← 推荐内容</RouterLink>
      <div>
        <p class="eyebrow">Runtime-validated query</p>
        <h1 id="feed-search-title">搜索内容</h1>
      </div>
    </header>

    <form class="feed-search-form" novalidate @submit.prevent="submit">
      <label for="feed-search-query">关键词</label>
      <div>
        <input
          id="feed-search-query"
          v-model="input"
          name="query"
          type="search"
          maxlength="80"
          placeholder="搜索标题、作者或标签"
          :aria-invalid="Boolean(searchFieldErrors.query)"
        />
        <button type="submit">搜索</button>
      </div>
      <small v-if="searchFieldErrors.query" role="alert">{{ searchFieldErrors.query }}</small>
    </form>

    <section v-if="!routeQuery.trim()" class="feed-search-landing" aria-labelledby="suggest-title">
      <p class="eyebrow">Search suggestions</p>
      <h2 id="suggest-title">从一个明确关键词开始</h2>
      <div>
        <RouterLink :to="{ name: ROUTE_NAMES.feedSearch, query: { q: 'Vue' } }">Vue</RouterLink>
        <RouterLink :to="{ name: ROUTE_NAMES.feedSearch, query: { q: 'TypeScript' } }">
          TypeScript
        </RouterLink>
        <RouterLink :to="{ name: ROUTE_NAMES.feedSearch, query: { q: '旅行' } }">旅行</RouterLink>
      </div>
    </section>

    <div
      v-else-if="searchStatus === 'loading' && searchItems.length === 0"
      class="feed-state"
      aria-live="polite"
    >
      <h2>正在搜索“{{ routeQuery }}”…</h2>
    </div>

    <div
      v-else-if="searchStatus === 'error' && searchItems.length === 0"
      class="feed-state feed-state-error"
      role="alert"
    >
      <p class="eyebrow">Search error</p>
      <h2>搜索暂时不可用</h2>
      <p>{{ searchError?.message }}</p>
      <button type="button" @click="executeSearch()">重新搜索</button>
    </div>

    <div
      v-else-if="searchStatus === 'ready' && searchItems.length === 0"
      class="feed-state feed-empty"
    >
      <p class="eyebrow">No results</p>
      <h2>没有找到“{{ searchQuery }}”</h2>
      <p>搜索无结果与网络错误保持分离。</p>
    </div>

    <template v-else-if="searchItems.length">
      <div class="feed-search-result-heading">
        <p>“{{ searchQuery }}”的结果</p>
        <span>{{ searchItems.length }} 条已加载</span>
      </div>
      <div v-if="searchStatus === 'error' && searchError" class="feed-inline-error" role="alert">
        {{ searchError.message }}
      </div>
      <div class="feed-grid" aria-label="搜索结果">
        <FeedCard v-for="item in searchItems" :key="item.id" :item="item" />
      </div>
      <button
        v-if="nextSearchCursor"
        class="feed-load-more"
        type="button"
        :disabled="searchStatus === 'loading-more'"
        @click="executeSearch(true)"
      >
        {{ searchStatus === 'loading-more' ? '加载中…' : '加载更多搜索结果' }}
      </button>
      <p v-else class="feed-end">搜索结果已全部加载</p>
    </template>
  </section>
</template>
