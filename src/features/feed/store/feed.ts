import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { FeedDetail, FeedId, FeedItem, FeedPage, FeedSearchQuery } from '@/domain/feed/feed'
import type { MediaSource } from '@/domain/media/media'
import type { FeedGateway, FeedRequestOptions } from '@/features/feed/api/feed-gateway'
import { getDefaultFeedGateway } from '@/features/feed/api/feed-gateway-provider'
import { validateFeedSearchQuery, type FeedSearchFieldErrors } from '@/features/feed/validation'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export type FeedListStatus = 'error' | 'idle' | 'loading' | 'loading-more' | 'ready' | 'refreshing'
export type FeedDetailStatus = 'error' | 'idle' | 'loading' | 'ready'

interface FeedActionOptions {
  readonly gateway?: FeedGateway
  readonly signal?: AbortSignal
}

function gatewayOptions(signal?: AbortSignal, cursor?: string): FeedRequestOptions | undefined {
  return signal || cursor
    ? { ...(cursor ? { cursor } : {}), ...(signal ? { signal } : {}) }
    : undefined
}

function mergeById(current: readonly FeedItem[], incoming: readonly FeedItem[]) {
  const existing = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => !existing.has(item.id))]
}

export const useFeedStore = defineStore('feed', () => {
  const items = ref<FeedItem[]>([])
  const nextCursor = ref<string | null>(null)
  const feedStatus = ref<FeedListStatus>('idle')
  const feedError = ref<AppError | null>(null)

  const searchItems = ref<FeedItem[]>([])
  const searchQuery = ref<FeedSearchQuery | null>(null)
  const nextSearchCursor = ref<string | null>(null)
  const searchStatus = ref<FeedListStatus>('idle')
  const searchError = ref<AppError | null>(null)
  const searchFieldErrors = ref<FeedSearchFieldErrors>({})

  const activeItem = ref<FeedItem | null>(null)
  const activeMedia = ref<MediaSource | null>(null)
  const detailStatus = ref<FeedDetailStatus>('idle')
  const detailError = ref<AppError | null>(null)

  let feedRequestSequence = 0
  let searchRequestSequence = 0
  let detailRequestSequence = 0

  async function loadFeed(
    options: FeedActionOptions & { readonly append?: boolean; readonly refresh?: boolean } = {},
  ): Promise<AppResult<FeedPage>> {
    const append = options.append === true
    const refresh = options.refresh === true
    const cursor = append ? nextCursor.value : null
    if (append && !cursor) return success({ items: [], nextCursor: null })

    const requestId = ++feedRequestSequence
    feedStatus.value = append ? 'loading-more' : refresh ? 'refreshing' : 'loading'
    feedError.value = null
    let result: AppResult<FeedPage>
    try {
      result = await (options.gateway ?? getDefaultFeedGateway()).listFeed(
        gatewayOptions(options.signal, cursor ?? undefined),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '推荐内容服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== feedRequestSequence) return result
    if (result.ok) {
      items.value = append ? mergeById(items.value, result.data.items) : [...result.data.items]
      nextCursor.value = result.data.nextCursor
      feedStatus.value = 'ready'
    } else {
      feedError.value = result.error
      feedStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  async function searchFeed(
    query: unknown,
    options: FeedActionOptions & { readonly append?: boolean } = {},
  ): Promise<AppResult<FeedPage>> {
    const validation = validateFeedSearchQuery(query)
    if (!validation.ok) {
      searchRequestSequence += 1
      searchItems.value = []
      searchQuery.value = null
      nextSearchCursor.value = null
      searchFieldErrors.value = validation.error.fields
      searchError.value = validation.error
      searchStatus.value = 'idle'
      return validation
    }
    const append = options.append === true && searchQuery.value === validation.data
    const cursor = append ? nextSearchCursor.value : null
    if (append && !cursor) return success({ items: [], nextCursor: null })
    if (searchQuery.value !== validation.data) {
      searchItems.value = []
      nextSearchCursor.value = null
    }
    searchQuery.value = validation.data
    searchFieldErrors.value = {}
    searchError.value = null

    const requestId = ++searchRequestSequence
    searchStatus.value = append ? 'loading-more' : 'loading'
    let result: AppResult<FeedPage>
    try {
      result = await (options.gateway ?? getDefaultFeedGateway()).searchFeed(
        validation.data,
        gatewayOptions(options.signal, cursor ?? undefined),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '内容搜索服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== searchRequestSequence) return result
    if (result.ok) {
      searchItems.value = append
        ? mergeById(searchItems.value, result.data.items)
        : [...result.data.items]
      nextSearchCursor.value = result.data.nextCursor
      searchStatus.value = 'ready'
    } else {
      searchError.value = result.error
      searchStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  async function loadItem(
    feedId: FeedId,
    options: FeedActionOptions = {},
  ): Promise<AppResult<FeedDetail>> {
    const requestId = ++detailRequestSequence
    activeItem.value = null
    activeMedia.value = null
    detailStatus.value = 'loading'
    detailError.value = null
    let result: AppResult<FeedDetail>
    try {
      result = await (options.gateway ?? getDefaultFeedGateway()).getItem(
        feedId,
        gatewayOptions(options.signal),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '内容详情服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== detailRequestSequence) return result
    if (result.ok) {
      activeItem.value = result.data.item
      activeMedia.value = result.data.media
      detailStatus.value = 'ready'
      appEventBus.emit('feed:item-viewed', { feedId: result.data.item.id })
    } else {
      detailError.value = result.error
      detailStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  function clearSearch() {
    searchRequestSequence += 1
    searchItems.value = []
    searchQuery.value = null
    nextSearchCursor.value = null
    searchStatus.value = 'idle'
    searchError.value = null
    searchFieldErrors.value = {}
  }

  function reset() {
    feedRequestSequence += 1
    detailRequestSequence += 1
    items.value = []
    nextCursor.value = null
    feedStatus.value = 'idle'
    feedError.value = null
    activeItem.value = null
    activeMedia.value = null
    detailStatus.value = 'idle'
    detailError.value = null
    clearSearch()
  }

  return {
    items,
    nextCursor,
    feedStatus,
    feedError,
    searchItems,
    searchQuery,
    nextSearchCursor,
    searchStatus,
    searchError,
    searchFieldErrors,
    activeItem,
    activeMedia,
    detailStatus,
    detailError,
    loadFeed,
    searchFeed,
    loadItem,
    clearSearch,
    reset,
  }
})
