import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '@/domain/auth/auth'
import type { AuthGateway } from '@/features/auth/api/auth-gateway'
import { getDefaultAuthGateway } from '@/features/auth/api/auth-gateway-provider'
import {
  validateAuthForm,
  type AuthFieldErrors,
  type AuthFormInput,
} from '@/features/auth/validation'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure, type AppError, type AppResult } from '@/shared/result'

export type AuthStatus = 'authenticated' | 'error' | 'idle' | 'submitting'

interface SignInOptions {
  readonly gateway?: AuthGateway
  readonly signal?: AbortSignal
}

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('idle')
  const session = ref<AuthSession | null>(null)
  const error = ref<AppError | null>(null)
  const fieldErrors = ref<AuthFieldErrors>({})
  let requestSequence = 0

  const isAuthenticated = computed(() => session.value !== null)

  async function signIn(
    input: AuthFormInput,
    options: SignInOptions = {},
  ): Promise<AppResult<AuthSession>> {
    const validation = validateAuthForm(input)
    if (!validation.ok) {
      status.value = 'idle'
      error.value = validation.error
      fieldErrors.value = validation.error.fields
      return validation
    }

    const requestId = ++requestSequence
    status.value = 'submitting'
    error.value = null
    fieldErrors.value = {}
    let result: AppResult<AuthSession>
    try {
      const gateway = options.gateway ?? getDefaultAuthGateway()
      result = await gateway.signIn(
        validation.data,
        options.signal ? { signal: options.signal } : undefined,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '登录服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }

    if (requestId !== requestSequence) return result
    if (result.ok) {
      session.value = result.data
      status.value = 'authenticated'
      appEventBus.emit('auth:signed-in', { userId: result.data.userId })
    } else {
      session.value = null
      error.value = result.error
      status.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  function signOut() {
    requestSequence += 1
    status.value = 'idle'
    session.value = null
    error.value = null
    fieldErrors.value = {}
  }

  return {
    status,
    session,
    error,
    fieldErrors,
    isAuthenticated,
    signIn,
    signOut,
  }
})
