import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '@/domain/auth/auth'
import { profileToDraft, type ProfileDraft, type UserProfile } from '@/domain/profile/profile'
import type { ProfileGateway } from '@/features/profile/api/profile-gateway'
import { getDefaultProfileGateway } from '@/features/profile/api/profile-gateway-provider'
import { validateProfileDraft, type ProfileFieldErrors } from '@/features/profile/validation'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure, type AppError, type AppResult } from '@/shared/result'

export type ProfileStatus = 'conflict' | 'error' | 'idle' | 'loading' | 'ready' | 'saving'

interface ProfileActionOptions {
  readonly gateway?: ProfileGateway
  readonly signal?: AbortSignal
}

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile | null>(null)
  const draft = ref<ProfileDraft | null>(null)
  const status = ref<ProfileStatus>('idle')
  const error = ref<AppError | null>(null)
  const fieldErrors = ref<ProfileFieldErrors>({})
  let requestSequence = 0

  const isDirty = computed(
    () =>
      profile.value !== null &&
      draft.value !== null &&
      JSON.stringify(profileToDraft(profile.value)) !== JSON.stringify(draft.value),
  )

  function acceptProfile(value: UserProfile, session: AuthSession): AppResult<UserProfile> {
    if (value.userId !== session.userId) {
      return failure({ kind: 'parse', message: '资料用户与当前登录会话不一致。' })
    }
    profile.value = value
    draft.value = profileToDraft(value)
    fieldErrors.value = {}
    error.value = null
    status.value = 'ready'
    return { ok: true, data: value }
  }

  async function load(
    session: AuthSession,
    options: ProfileActionOptions & { readonly force?: boolean } = {},
  ): Promise<AppResult<UserProfile>> {
    if (!options.force && profile.value?.userId === session.userId && status.value === 'ready') {
      return { ok: true, data: profile.value }
    }
    if (profile.value && profile.value.userId !== session.userId) reset()

    const requestId = ++requestSequence
    status.value = 'loading'
    error.value = null
    let result: AppResult<UserProfile>
    try {
      result = await (options.gateway ?? getDefaultProfileGateway()).getCurrent(
        session,
        options.signal ? { signal: options.signal } : undefined,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '资料服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== requestSequence) return result
    if (result.ok) return acceptProfile(result.data, session)
    error.value = result.error
    status.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    return result
  }

  function updateDraft(patch: Partial<ProfileDraft>) {
    if (!draft.value) return
    draft.value = { ...draft.value, ...patch }
    fieldErrors.value = {}
    if (status.value === 'conflict' || status.value === 'error') {
      status.value = 'ready'
      error.value = null
    }
  }

  function resetDraft() {
    if (profile.value) draft.value = profileToDraft(profile.value)
    fieldErrors.value = {}
    error.value = null
    status.value = profile.value ? 'ready' : 'idle'
  }

  async function save(
    session: AuthSession,
    options: ProfileActionOptions = {},
  ): Promise<AppResult<UserProfile>> {
    if (!profile.value || !draft.value) {
      return failure({ kind: 'unexpected', message: '资料尚未加载。' })
    }
    const validation = validateProfileDraft(draft.value)
    if (!validation.ok) {
      fieldErrors.value = validation.error.fields
      error.value = validation.error
      status.value = 'ready'
      return validation
    }
    if (!isDirty.value) return { ok: true, data: profile.value }

    const requestId = ++requestSequence
    status.value = 'saving'
    error.value = null
    let result: AppResult<UserProfile>
    try {
      result = await (options.gateway ?? getDefaultProfileGateway()).update(
        session,
        validation.data,
        profile.value.version,
        options.signal ? { signal: options.signal } : undefined,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '资料保存发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== requestSequence) return result
    if (result.ok) {
      const accepted = acceptProfile(result.data, session)
      if (accepted.ok) {
        appEventBus.emit('profile:updated', {
          userId: result.data.userId,
          version: result.data.version,
        })
      }
      return accepted
    }
    error.value = result.error
    status.value =
      result.error.kind === 'aborted'
        ? 'ready'
        : result.error.kind === 'conflict'
          ? 'conflict'
          : 'error'
    return result
  }

  function reset() {
    requestSequence += 1
    profile.value = null
    draft.value = null
    status.value = 'idle'
    error.value = null
    fieldErrors.value = {}
  }

  return {
    profile,
    draft,
    status,
    error,
    fieldErrors,
    isDirty,
    load,
    updateDraft,
    resetDraft,
    save,
    reset,
  }
})
