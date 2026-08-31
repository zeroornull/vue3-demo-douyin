import type { AuthSession } from '@/domain/auth/auth'
import { failure, success, type AppResult } from '@/shared/result'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseAuthSession(input: unknown): AppResult<AuthSession> {
  if (!isRecord(input) || !isRecord(input.user)) {
    return failure({ kind: 'parse', message: '登录响应缺少 user。' })
  }
  if (!nonEmptyString(input.user.id)) {
    return failure({ kind: 'parse', message: '登录响应缺少 user.id。' })
  }
  if (!nonEmptyString(input.user.displayName)) {
    return failure({ kind: 'parse', message: '登录响应缺少 user.displayName。' })
  }
  if (!nonEmptyString(input.accessToken)) {
    return failure({ kind: 'parse', message: '登录响应缺少 accessToken。' })
  }

  return success(
    Object.freeze({
      userId: input.user.id,
      displayName: input.user.displayName,
      accessToken: input.accessToken,
    }),
  )
}
