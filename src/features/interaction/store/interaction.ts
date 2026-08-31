import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '@/domain/auth/auth'
import type { FeedId, FeedItem } from '@/domain/feed/feed'
import {
  parseCommentId,
  type CommentPage,
  type FeedComment,
  type FeedLikeState,
} from '@/domain/interaction/interaction'
import type { InteractionGateway } from '@/features/interaction/api/interaction-gateway'
import { getDefaultInteractionGateway } from '@/features/interaction/api/interaction-gateway-provider'
import { validateCommentDraft, type CommentFieldErrors } from '@/features/interaction/validation'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export type CommentStatus = 'error' | 'idle' | 'loading' | 'loading-more' | 'ready' | 'submitting'
export type LikeStatus = 'error' | 'idle' | 'ready' | 'updating'
export type CommentViewModel = FeedComment & { readonly pending: boolean }

interface InteractionActionOptions {
  readonly gateway?: InteractionGateway
  readonly signal?: AbortSignal
}

export const useInteractionStore = defineStore('interaction', () => {
  const feedId = ref<FeedId | null>(null)
  const comments = ref<CommentViewModel[]>([])
  const nextCursor = ref<string | null>(null)
  const commentStatus = ref<CommentStatus>('idle')
  const commentError = ref<AppError | null>(null)
  const fieldErrors = ref<CommentFieldErrors>({})

  const liked = ref(false)
  const likeCount = ref(0)
  const likeVersion = ref(1)
  const likeStatus = ref<LikeStatus>('idle')
  const likeError = ref<AppError | null>(null)

  let commentRequestSequence = 0
  let likeRequestSequence = 0
  let optimisticSequence = 0

  function initialize(item: FeedItem) {
    if (feedId.value === item.id) return
    reset()
    feedId.value = item.id
    likeCount.value = item.likeCount
    likeStatus.value = 'ready'
  }

  async function loadComments(
    options: InteractionActionOptions & { readonly append?: boolean } = {},
  ): Promise<AppResult<CommentPage>> {
    if (!feedId.value) return failure({ kind: 'unexpected', message: '尚未初始化内容交互。' })
    const append = options.append === true
    const cursor = append ? nextCursor.value : null
    if (append && !cursor) return success({ comments: [], nextCursor: null })
    const requestId = ++commentRequestSequence
    commentStatus.value = append ? 'loading-more' : 'loading'
    commentError.value = null
    let result: AppResult<CommentPage>
    try {
      result = await (options.gateway ?? getDefaultInteractionGateway()).listComments(
        feedId.value,
        cursor || options.signal
          ? {
              ...(cursor ? { cursor } : {}),
              ...(options.signal ? { signal: options.signal } : {}),
            }
          : undefined,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '评论列表服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== commentRequestSequence) return result
    if (result.ok) {
      const incoming = result.data.comments.map((comment) => ({ ...comment, pending: false }))
      if (append) {
        const ids = new Set(comments.value.map((comment) => comment.id))
        comments.value.push(...incoming.filter((comment) => !ids.has(comment.id)))
      } else comments.value = incoming
      nextCursor.value = result.data.nextCursor
      commentStatus.value = 'ready'
    } else {
      commentError.value = result.error
      commentStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  async function submitComment(
    session: AuthSession,
    body: string,
    options: InteractionActionOptions = {},
  ): Promise<AppResult<FeedComment>> {
    if (!feedId.value) return failure({ kind: 'unexpected', message: '尚未初始化内容交互。' })
    if (commentStatus.value === 'submitting') {
      return failure({ kind: 'conflict', message: '评论正在提交，请勿重复操作。' })
    }
    const validation = validateCommentDraft({ body })
    if (!validation.ok) {
      fieldErrors.value = validation.error.fields
      return validation
    }
    optimisticSequence += 1
    const temporaryId = parseCommentId(`temp-${optimisticSequence}`)!
    const optimistic: CommentViewModel = {
      id: temporaryId,
      feedId: feedId.value,
      author: { userId: session.userId, displayName: session.displayName },
      body: validation.data.body,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      likedByViewer: false,
      version: 1,
      pending: true,
    }
    comments.value.unshift(optimistic)
    const requestId = ++commentRequestSequence
    commentStatus.value = 'submitting'
    commentError.value = null
    fieldErrors.value = {}
    let result: AppResult<FeedComment>
    try {
      result = await (options.gateway ?? getDefaultInteractionGateway()).createComment(
        session,
        feedId.value,
        validation.data,
        options.signal ? { signal: options.signal } : undefined,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '评论提交发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== commentRequestSequence) return result
    const index = comments.value.findIndex((comment) => comment.id === temporaryId)
    if (result.ok) {
      const confirmed = { ...result.data, pending: false }
      if (index >= 0) comments.value.splice(index, 1, confirmed)
      else comments.value.unshift(confirmed)
      commentStatus.value = 'ready'
      appEventBus.emit('feed:comment-created', {
        feedId: result.data.feedId,
        commentId: result.data.id,
      })
    } else {
      if (index >= 0) comments.value.splice(index, 1)
      commentError.value = result.error
      commentStatus.value = result.error.kind === 'aborted' ? 'ready' : 'error'
    }
    return result
  }

  async function toggleLike(
    session: AuthSession,
    options: InteractionActionOptions = {},
  ): Promise<AppResult<FeedLikeState>> {
    if (!feedId.value) return failure({ kind: 'unexpected', message: '尚未初始化内容交互。' })
    if (likeStatus.value === 'updating') {
      return failure({ kind: 'conflict', message: '点赞正在更新，请勿重复操作。' })
    }
    const snapshot = {
      liked: liked.value,
      likeCount: likeCount.value,
      version: likeVersion.value,
    }
    const target = !snapshot.liked
    liked.value = target
    likeCount.value = Math.max(0, snapshot.likeCount + (target ? 1 : -1))
    likeStatus.value = 'updating'
    likeError.value = null
    const requestId = ++likeRequestSequence
    let result: AppResult<FeedLikeState>
    try {
      result = await (options.gateway ?? getDefaultInteractionGateway()).setLiked(
        session,
        feedId.value,
        target,
        snapshot.version,
        options.signal ? { signal: options.signal } : undefined,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '点赞更新发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== likeRequestSequence) return result
    if (result.ok) {
      liked.value = result.data.liked
      likeCount.value = result.data.likeCount
      likeVersion.value = result.data.version
      likeStatus.value = 'ready'
      appEventBus.emit('feed:liked', { feedId: result.data.feedId, liked: result.data.liked })
    } else {
      liked.value = snapshot.liked
      likeCount.value = snapshot.likeCount
      likeVersion.value = snapshot.version
      likeError.value = result.error
      likeStatus.value = result.error.kind === 'aborted' ? 'ready' : 'error'
    }
    return result
  }

  function reset() {
    commentRequestSequence += 1
    likeRequestSequence += 1
    feedId.value = null
    comments.value = []
    nextCursor.value = null
    commentStatus.value = 'idle'
    commentError.value = null
    fieldErrors.value = {}
    liked.value = false
    likeCount.value = 0
    likeVersion.value = 1
    likeStatus.value = 'idle'
    likeError.value = null
  }

  return {
    feedId,
    comments,
    nextCursor,
    commentStatus,
    commentError,
    fieldErrors,
    liked,
    likeCount,
    likeVersion,
    likeStatus,
    likeError,
    initialize,
    loadComments,
    submitComment,
    toggleLike,
    reset,
  }
})
