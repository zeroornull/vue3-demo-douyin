import type { PhoneNumber } from '@/domain/auth/auth'
export interface AuthChallenge {
  readonly id: string
  readonly phone: PhoneNumber
  readonly expiresAt: string
  readonly retryAt: string
}
export interface PasswordResetReceipt {
  readonly userId: string
  readonly resetAt: string
}
