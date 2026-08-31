import type { AuthSession } from '@/domain/auth/auth'
import type { ProfileDraft, UserProfile } from '@/domain/profile/profile'
import type { AppResult } from '@/shared/result'

export interface ProfileRequestOptions {
  readonly signal?: AbortSignal
}

export interface ProfileGateway {
  getCurrent(session: AuthSession, options?: ProfileRequestOptions): Promise<AppResult<UserProfile>>
  update(
    session: AuthSession,
    draft: ProfileDraft,
    expectedVersion: number,
    options?: ProfileRequestOptions,
  ): Promise<AppResult<UserProfile>>
}
