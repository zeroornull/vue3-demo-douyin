declare const conversationIdBrand: unique symbol

export type ConversationId = string & {
  readonly [conversationIdBrand]: 'ConversationId'
}

export type MessageDelivery = 'delivered' | 'read' | 'sent'
export type MessageAttachmentKind = 'image' | 'video'

export interface MessageAttachment {
  readonly id: string
  readonly kind: MessageAttachmentKind
  readonly mimeType: 'image/jpeg' | 'image/png' | 'video/mp4'
  readonly sizeBytes: number
  readonly url: string
}

export interface ConversationParticipant {
  readonly displayName: string
  readonly handle: string
  readonly online: boolean
  readonly userId: string
}

export interface ChatMessage {
  readonly attachment?: MessageAttachment
  readonly body: string
  readonly conversationId: ConversationId
  readonly delivery: MessageDelivery
  readonly id: string
  readonly senderId: string
  readonly sentAt: string
}

export interface ConversationSummary {
  readonly id: ConversationId
  readonly lastMessage: ChatMessage | null
  readonly participant: ConversationParticipant
  readonly unreadCount: number
  readonly updatedAt: string
}

export interface ConversationPage {
  readonly conversations: readonly ConversationSummary[]
  readonly nextCursor: string | null
}

export interface MessagePage {
  readonly conversation: ConversationSummary
  readonly messages: readonly ChatMessage[]
  readonly nextCursor: string | null
}

export interface MessageDraft {
  readonly attachment?: MessageAttachment
  readonly body: string
}

export interface ReadReceipt {
  readonly conversationId: ConversationId
  readonly readAt: string
}

export function parseConversationId(value: unknown): ConversationId | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value)
    ? (value as ConversationId)
    : null
}

export function messageInitials(displayName: string): string {
  return [...displayName.trim()].slice(0, 2).join('').toUpperCase() || 'DM'
}

export function formatConversationTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value))
}

export function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(value))
}
