<script setup lang="ts">
import type { FeedItem } from '@/domain/feed/feed'
import { formatFeedCount, formatFeedDuration } from '@/domain/feed/feed'
import { ROUTE_NAMES } from '@/router'

defineOptions({ name: 'FeedCard' })

defineProps<{
  readonly item: FeedItem
}>()
</script>

<template>
  <article class="feed-card">
    <RouterLink
      class="feed-card-cover"
      :to="{ name: ROUTE_NAMES.feedDetail, params: { feedId: item.id } }"
    >
      <img :src="item.coverUrl" :alt="item.caption" width="640" height="800" loading="lazy" />
      <span>{{ formatFeedDuration(item.durationSeconds) }}</span>
    </RouterLink>
    <div class="feed-card-body">
      <p class="feed-card-author">@{{ item.author.handle }}</p>
      <h2>
        <RouterLink :to="{ name: ROUTE_NAMES.feedDetail, params: { feedId: item.id } }">
          {{ item.caption }}
        </RouterLink>
      </h2>
      <ul class="feed-tags" aria-label="内容标签">
        <li v-for="tag in item.tags" :key="tag">#{{ tag }}</li>
      </ul>
      <dl class="feed-card-metrics">
        <div>
          <dt>喜欢</dt>
          <dd>{{ formatFeedCount(item.likeCount) }}</dd>
        </div>
        <div>
          <dt>评论</dt>
          <dd>{{ formatFeedCount(item.commentCount) }}</dd>
        </div>
        <div>
          <dt>分享</dt>
          <dd>{{ formatFeedCount(item.shareCount) }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
