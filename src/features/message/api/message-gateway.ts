import type { AuthSession } from '@/domain/auth/auth'
import type {
  ChatMessage,
  ConversationId,
  ConversationPage,
  MessageDraft,
  MessagePage,
  ReadReceipt,
} from '@/domain/message/message'
import type { AppResult } from '@/shared/result'

export interface MessageRequestOptions {
  readonly cursor?: string
  readonly signal?: AbortSignal
}

export interface MessageGateway {
  getConversation(
    session: AuthSession,
    conversationId: ConversationId,
    options?: MessageRequestOptions,
  ): Promise<AppResult<MessagePage>>
  listConversations(
    session: AuthSession,
    options?: MessageRequestOptions,
  ): Promise<AppResult<ConversationPage>>
  markRead(
    session: AuthSession,
    conversationId: ConversationId,
    options?: Pick<MessageRequestOptions, 'signal'>,
  ): Promise<AppResult<ReadReceipt>>
  sendMessage(
    session: AuthSession,
    conversationId: ConversationId,
    draft: MessageDraft,
    options?: Pick<MessageRequestOptions, 'signal'>,
  ): Promise<AppResult<ChatMessage>>
}
