import { parseChinaPhone, type AuthCredentials } from '@/domain/auth/auth'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export interface AuthFormInput {
  readonly agreed: boolean
  readonly password: string
  readonly phone: string
}

export interface AuthFieldErrors {
  readonly agreement?: string
  readonly password?: string
  readonly phone?: string
}

export interface AuthValidationError extends AppError {
  readonly kind: 'validation'
  readonly fields: AuthFieldErrors
}

export function validateAuthForm(
  input: AuthFormInput,
): AppResult<AuthCredentials, AuthValidationError> {
  const parsedPhone = parseChinaPhone(input.phone)
  const fields: AuthFieldErrors = {
    ...(input.agreed ? {} : { agreement: '请先阅读并同意用户协议和隐私政策。' }),
    ...(parsedPhone ? {} : { phone: '请输入有效的中国大陆手机号。' }),
    ...(input.password.length >= 8 && input.password.length <= 128
      ? {}
      : { password: '密码长度必须为 8–128 个字符。' }),
  }
  if (Object.keys(fields).length || !parsedPhone) {
    return failure({
      kind: 'validation',
      message: '登录表单校验失败。',
      fields,
    })
  }

  return success({ phone: parsedPhone, password: input.password })
}

export function resolveAuthRedirect(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/'
  if (value.startsWith('/login')) return '/'
  return value
}
