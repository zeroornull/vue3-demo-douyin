import { describe, expect, it } from 'vitest'
import { validateMessageDraft } from '@/features/message/validation'

describe('validateMessageDraft', () => {
  it('trims valid text', () => {
    expect(validateMessageDraft({ body: '  你好  ' })).toEqual({
      ok: true,
      data: { body: '你好' },
    })
  })

  it('rejects empty text synchronously', () => {
    expect(validateMessageDraft({ body: '   ' })).toMatchObject({
      ok: false,
      error: { kind: 'validation', fields: { body: expect.any(String) } },
    })
  })

  it('rejects text longer than 500 characters', () => {
    expect(validateMessageDraft({ body: 'a'.repeat(501) })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    })
  })
})
