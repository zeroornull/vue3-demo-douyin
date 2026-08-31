import { describe, expect, it } from 'vitest'
import { resolveAuthRedirect, validateAuthForm } from '@/features/auth/validation'

describe('validateAuthForm', () => {
  it('returns typed credentials only when all fields are valid', () => {
    expect(
      validateAuthForm({ agreed: true, phone: '138 0013 8000', password: 'douyin-demo' }),
    ).toEqual({
      ok: true,
      data: { phone: '13800138000', password: 'douyin-demo' },
    })
  })

  it('returns field-specific errors without a pending promise', () => {
    expect(validateAuthForm({ agreed: false, phone: '12', password: 'short' })).toMatchObject({
      ok: false,
      error: {
        kind: 'validation',
        fields: {
          agreement: expect.any(String),
          phone: expect.any(String),
          password: expect.any(String),
        },
      },
    })
  })
})

describe('resolveAuthRedirect', () => {
  it('allows an internal route', () => {
    expect(resolveAuthRedirect('/shop')).toBe('/shop')
  })

  it('rejects protocol-relative and recursive login redirects', () => {
    expect(resolveAuthRedirect('//evil.example')).toBe('/')
    expect(resolveAuthRedirect('/login/password')).toBe('/')
  })
})
