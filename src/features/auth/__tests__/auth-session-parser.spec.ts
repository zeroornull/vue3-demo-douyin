import { describe, expect, it } from 'vitest'
import { parseAuthSession } from '@/features/auth/api/auth-session-parser'

const validResponse = {
  user: { id: 'user-1', displayName: '测试用户' },
  accessToken: 'access-token',
}

describe('parseAuthSession', () => {
  it('parses and freezes a valid response', () => {
    const result = parseAuthSession(validResponse)
    expect(result).toMatchObject({ ok: true, data: { userId: 'user-1' } })
    if (!result.ok) throw new Error(result.error.message)
    expect(Object.isFrozen(result.data)).toBe(true)
  })

  it.each([
    [{ accessToken: 'token' }, 'user'],
    [{ ...validResponse, user: { displayName: 'name' } }, 'user.id'],
    [{ ...validResponse, accessToken: '' }, 'accessToken'],
  ])('rejects a response missing %s', (input, field) => {
    expect(parseAuthSession(input)).toMatchObject({
      ok: false,
      error: { kind: 'parse', message: expect.stringContaining(String(field)) },
    })
  })
})
