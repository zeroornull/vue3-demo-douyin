import { describe, expect, it } from 'vitest'
import { maskPhone, parseChinaPhone } from '@/domain/auth/auth'

describe('auth phone domain', () => {
  it('normalizes spaces, hyphens, and +86', () => {
    expect(parseChinaPhone('+86 138-0013-8000')).toBe('13800138000')
  })

  it('rejects an invalid mainland number', () => {
    expect(parseChinaPhone('12800138000')).toBeNull()
  })

  it('masks a validated phone', () => {
    const phone = parseChinaPhone('13800138000')
    if (!phone) throw new Error('phone must be valid')
    expect(maskPhone(phone)).toBe('138****8000')
  })
})
