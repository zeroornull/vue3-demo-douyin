import type { AuthSession } from '@/domain/auth/auth'
import type { ConversationId, MessageAttachment } from '@/domain/message/message'
import type { AppResult } from '@/shared/result'

export interface AttachmentGateway {
  upload(
    session: AuthSession,
    conversationId: ConversationId,
    file: File,
    signal?: AbortSignal,
  ): Promise<AppResult<MessageAttachment>>
}
