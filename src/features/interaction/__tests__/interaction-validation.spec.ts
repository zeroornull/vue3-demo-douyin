import { describe, expect, it } from 'vitest'
import { validateCommentDraft } from '@/features/interaction/validation'

describe('validateCommentDraft', () => {
  it('trims valid comments', () => {
    expect(validateCommentDraft({ body: '  有价值的评论  ' })).toEqual({
      ok: true,
      data: { body: '有价值的评论' },
    })
  })

  it('rejects empty comments', () => {
    expect(validateCommentDraft({ body: '   ' })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    })
  })

  it('rejects more than 300 characters', () => {
    expect(validateCommentDraft({ body: 'a'.repeat(301) })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    })
  })
})
