import type { ProductId } from '@/domain/shop/product'
import type { ChatMessage, ConversationId } from '@/domain/message/message'
import type { FeedId } from '@/domain/feed/feed'

export interface AppEventMap {
  'auth:signed-in': {
    readonly userId: string
  }
  'auth:signed-out': {
    readonly userId: string | null
  }
  'profile:updated': {
    readonly userId: string
    readonly version: number
  }
  'message:read': {
    readonly conversationId: ConversationId
  }
  'message:received': {
    readonly message: ChatMessage
  }
  'message:sent': {
    readonly conversationId: ConversationId
    readonly messageId: string
  }
  'message:unread-changed': {
    readonly total: number
  }
  'feed:item-viewed': {
    readonly feedId: FeedId
  }
  'shop:product-viewed': {
    readonly productId: ProductId
  }
}

export type AppEventName = keyof AppEventMap

export interface AppEvent<K extends AppEventName> {
  readonly type: K
  readonly payload: AppEventMap[K]
  readonly occurredAt: string
}

export function createAppEvent<K extends AppEventName>(
  type: K,
  payload: AppEventMap[K],
): AppEvent<K> {
  return {
    type,
    payload,
    occurredAt: new Date().toISOString(),
  }
}
