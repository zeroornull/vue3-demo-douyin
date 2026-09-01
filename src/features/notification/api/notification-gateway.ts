import type { AuthSession } from '@/domain/auth/auth'
import type {
  NotificationId,
  NotificationPage,
  NotificationReadReceipt,
} from '@/domain/notification/notification'
import type { AppResult } from '@/shared/result'
export interface NotificationGateway {
  list(
    session: AuthSession,
    options?: { cursor?: string; signal?: AbortSignal },
  ): Promise<AppResult<NotificationPage>>
  markRead(
    session: AuthSession,
    ids: readonly NotificationId[],
    signal?: AbortSignal,
  ): Promise<AppResult<NotificationReadReceipt>>
}
