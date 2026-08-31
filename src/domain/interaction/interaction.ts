import type { FeedId } from '@/domain/feed/feed'

declare const commentIdBrand: unique symbol

export type CommentId = string & { readonly [commentIdBrand]: 'CommentId' }

export interface CommentAuthor {
  readonly displayName: string
  readonly userId: string
}

export interface FeedComment {
  readonly author: CommentAuthor
  readonly body: string
  readonly createdAt: string
  readonly feedId: FeedId
  readonly id: CommentId
  readonly likeCount: number
  readonly likedByViewer: boolean
  readonly version: number
}

export interface CommentPage {
  readonly comments: readonly FeedComment[]
  readonly nextCursor: string | null
}

export interface CommentDraft {
  readonly body: string
}

export interface FeedLikeState {
  readonly feedId: FeedId
  readonly likeCount: number
  readonly liked: boolean
  readonly version: number
}

export function parseCommentId(value: unknown): CommentId | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
    ? (value as CommentId)
    : null
}

export function interactionInitials(displayName: string): string {
  return [...displayName.trim()].slice(0, 2).join('').toUpperCase() || 'U'
}

export function formatCommentTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value))
}
