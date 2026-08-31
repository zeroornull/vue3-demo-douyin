import type { ProfileDraft } from '@/domain/profile/profile'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export interface ProfileFieldErrors {
  readonly age?: string
  readonly bio?: string
  readonly city?: string
  readonly displayName?: string
  readonly handle?: string
  readonly province?: string
  readonly school?: string
}

export interface ProfileValidationError extends AppError {
  readonly kind: 'validation'
  readonly fields: ProfileFieldErrors
}

export function validateProfileDraft(
  draft: ProfileDraft,
): AppResult<ProfileDraft, ProfileValidationError> {
  const fields: ProfileFieldErrors = {
    ...(draft.displayName.trim().length >= 1 && draft.displayName.trim().length <= 20
      ? {}
      : { displayName: '名字长度必须为 1–20 个字符。' }),
    ...(/^[A-Za-z0-9_.]{2,16}$/.test(draft.handle)
      ? {}
      : { handle: '抖音号必须为 2–16 位字母、数字、下划线或点。' }),
    ...(draft.bio.length <= 160 ? {} : { bio: '简介不能超过 160 个字符。' }),
    ...(draft.age === null || (Number.isInteger(draft.age) && draft.age >= 0 && draft.age <= 120)
      ? {}
      : { age: '年龄必须是 0–120 的整数。' }),
    ...(draft.province.length <= 20 ? {} : { province: '省份不能超过 20 个字符。' }),
    ...(draft.city.length <= 20 ? {} : { city: '城市不能超过 20 个字符。' }),
    ...(draft.school === null || draft.school.length <= 60
      ? {}
      : { school: '学校不能超过 60 个字符。' }),
  }
  if (Object.keys(fields).length) {
    return failure({ kind: 'validation', message: '资料表单校验失败。', fields })
  }
  return success({
    ...draft,
    displayName: draft.displayName.trim(),
    handle: draft.handle.trim(),
    bio: draft.bio.trim(),
    province: draft.province.trim(),
    city: draft.city.trim(),
    school: draft.school?.trim() || null,
  })
}
