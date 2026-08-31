import { describe, expect, it } from 'vitest'
import { parseUserProfile } from '@/features/profile/api/profile-parser'

export const profileResponse = {
  profile: {
    userId: 'demo-user',
    displayName: '杨老虎🐯',
    handle: '12345xiaolaohu',
    bio: '简介',
    age: 27,
    gender: 'female',
    province: '广东',
    city: '珠海',
    school: null,
  },
  stats: { likes: 100, friends: 2, following: 3, followers: 4, posts: 5 },
  version: 1,
}

describe('parseUserProfile', () => {
  it('parses and freezes a valid profile', () => {
    const result = parseUserProfile(profileResponse)
    expect(result).toMatchObject({ ok: true, data: { userId: 'demo-user', version: 1 } })
    if (!result.ok) throw new Error(result.error.message)
    expect(Object.isFrozen(result.data)).toBe(true)
    expect(Object.isFrozen(result.data.stats)).toBe(true)
  })

  it('reports invalid field paths', () => {
    expect(
      parseUserProfile({ ...profileResponse, profile: { ...profileResponse.profile, age: -1 } }),
    ).toMatchObject({
      ok: false,
      error: { kind: 'parse', details: ['profile.age'] },
    })
  })

  it('rejects a response without profile/stats', () => {
    expect(parseUserProfile({ version: 1 })).toMatchObject({
      ok: false,
      error: { kind: 'parse' },
    })
  })
})
