import { describe, expect, it } from 'vitest'
import {
  formatConversationTime,
  formatMessageTime,
  messageInitials,
  parseConversationId,
} from '@/domain/message/message'

describe('message domain', () => {
  it('accepts stable URL-safe conversation IDs', () => {
    expect(parseConversationId('conv_2026-08')).toBe('conv_2026-08')
    expect(parseConversationId('conversation/unsafe')).toBeNull()
    expect(parseConversationId('')).toBeNull()
    expect(parseConversationId(42)).toBeNull()
  })

  it('derives initials without loading an external avatar', () => {
    expect(messageInitials(' 浅唱 ')).toBe('浅唱')
    expect(messageInitials('')).toBe('DM')
  })

  it('formats timestamps in a fixed product timezone', () => {
    expect(formatConversationTime('2026-08-31T02:03:00.000Z')).toContain('08')
    expect(formatMessageTime('2026-08-31T02:03:00.000Z')).toMatch(/10[:：]03/)
  })
})
