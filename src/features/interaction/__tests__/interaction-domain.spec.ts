import { describe, expect, it } from 'vitest'
import {
  formatCommentTime,
  interactionInitials,
  parseCommentId,
} from '@/domain/interaction/interaction'

describe('interaction domain', () => {
  it('accepts URL-safe comment IDs', () => {
    expect(parseCommentId('comment_2026-1')).toBe('comment_2026-1')
    expect(parseCommentId('comment.bad')).toBeNull()
  })

  it('creates local initials without avatars', () => {
    expect(interactionInitials(' 评论者 ')).toBe('评论')
    expect(interactionInitials('')).toBe('U')
  })

  it('formats comment time in Asia/Shanghai', () => {
    expect(formatCommentTime('2026-08-31T03:00:00.000Z')).toMatch(/08/)
  })
})
