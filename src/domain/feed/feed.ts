declare const feedIdBrand: unique symbol
declare const feedSearchQueryBrand: unique symbol

export type FeedId = string & { readonly [feedIdBrand]: 'FeedId' }
export type FeedSearchQuery = string & {
  readonly [feedSearchQueryBrand]: 'FeedSearchQuery'
}

export interface FeedAuthor {
  readonly displayName: string
  readonly handle: string
  readonly userId: string
}

export interface FeedItem {
  readonly author: FeedAuthor
  readonly caption: string
  readonly commentCount: number
  readonly coverUrl: string
  readonly durationSeconds: number
  readonly id: FeedId
  readonly likeCount: number
  readonly publishedAt: string
  readonly shareCount: number
  readonly tags: readonly string[]
}

export interface FeedPage {
  readonly items: readonly FeedItem[]
  readonly nextCursor: string | null
}

export interface FeedDetail {
  readonly item: FeedItem
  readonly media: MediaSource
}

export function parseFeedId(value: unknown): FeedId | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? (value as FeedId) : null
}

export function formatFeedCount(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(value)
}

export function formatFeedDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function formatFeedPublishedAt(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: 'long',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).format(new Date(value))
}
import type { MediaSource } from '@/domain/media/media'
