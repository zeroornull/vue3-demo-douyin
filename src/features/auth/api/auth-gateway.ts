import type { AuthCredentials, AuthSession } from '@/domain/auth/auth'
import type { AppResult } from '@/shared/result'

export interface AuthRequestOptions {
  readonly signal?: AbortSignal
}

export interface AuthGateway {
  signIn(
    credentials: AuthCredentials,
    options?: AuthRequestOptions,
  ): Promise<AppResult<AuthSession>>
}
