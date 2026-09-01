import type { PhoneNumber } from '@/domain/auth/auth'
import type { AuthSession } from '@/domain/auth/auth'
import type { AuthChallenge, PasswordResetReceipt } from '@/domain/auth/challenge'
import type { AppResult } from '@/shared/result'
export interface AuthChallengeGateway {
  requestCode(phone: PhoneNumber, signal?: AbortSignal): Promise<AppResult<AuthChallenge>>
  signIn(challengeId: string, code: string, signal?: AbortSignal): Promise<AppResult<AuthSession>>
  requestReset(phone: PhoneNumber, signal?: AbortSignal): Promise<AppResult<AuthChallenge>>
  resetPassword(
    challengeId: string,
    code: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<AppResult<PasswordResetReceipt>>
}
