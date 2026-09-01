import { parseChinaPhone } from '@/domain/auth/auth'
import type { AuthChallenge, PasswordResetReceipt } from '@/domain/auth/challenge'
import { failure, success, type AppResult } from '@/shared/result'
export function parseAuthChallenge(input: unknown): AppResult<AuthChallenge> {
  if (typeof input !== 'object' || input === null)
    return failure({ kind: 'parse', message: '验证码挑战格式无效。' })
  const v = input as Record<string, unknown>
  const phone = parseChinaPhone(v.phone)
  if (
    typeof v.id !== 'string' ||
    !v.id ||
    !phone ||
    typeof v.expiresAt !== 'string' ||
    Number.isNaN(Date.parse(v.expiresAt)) ||
    typeof v.retryAt !== 'string' ||
    Number.isNaN(Date.parse(v.retryAt))
  )
    return failure({ kind: 'parse', message: '验证码挑战字段无效。' })
  return success({ id: v.id, phone, expiresAt: v.expiresAt, retryAt: v.retryAt })
}
export function parseResetReceipt(input: unknown): AppResult<PasswordResetReceipt> {
  if (typeof input !== 'object' || input === null)
    return failure({ kind: 'parse', message: '密码重置回执格式无效。' })
  const v = input as Record<string, unknown>
  return typeof v.userId === 'string' &&
    v.userId &&
    typeof v.resetAt === 'string' &&
    !Number.isNaN(Date.parse(v.resetAt))
    ? success({ userId: v.userId, resetAt: v.resetAt })
    : failure({ kind: 'parse', message: '密码重置回执字段无效。' })
}
