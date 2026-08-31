import { describe, expect, it } from 'vitest'
import type { ProfileDraft } from '@/domain/profile/profile'
import { validateProfileDraft } from '@/features/profile/validation'

const valid: ProfileDraft = {
  displayName: '测试用户',
  handle: 'test_user.1',
  bio: '简介',
  age: 27,
  gender: 'female',
  province: '广东',
  city: '珠海',
  school: null,
}

describe('validateProfileDraft', () => {
  it('normalizes a valid draft', () => {
    expect(validateProfileDraft({ ...valid, displayName: ' 测试用户 ' })).toMatchObject({
      ok: true,
      data: { displayName: '测试用户' },
    })
  })

  it('returns field-specific errors', () => {
    expect(
      validateProfileDraft({
        ...valid,
        displayName: '',
        handle: 'bad handle',
        bio: 'x'.repeat(161),
        age: 121,
      }),
    ).toMatchObject({
      ok: false,
      error: {
        kind: 'validation',
        fields: {
          displayName: expect.any(String),
          handle: expect.any(String),
          bio: expect.any(String),
          age: expect.any(String),
        },
      },
    })
  })
})
