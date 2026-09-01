import { describe, expect, it } from 'vitest'
import { parseMessageAttachment } from '@/features/message/api/message-parser'
import { validateAttachmentFile } from '@/features/message/validation'
describe('message attachments', () => {
  it('parses safe local attachments', () =>
    expect(
      parseMessageAttachment({
        id: 'a1',
        kind: 'image',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        url: '/message/attachments/a1.jpg',
      }),
    ).toMatchObject({ ok: true, data: { kind: 'image' } }))
  it('rejects external URLs', () =>
    expect(
      parseMessageAttachment({
        id: 'a1',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        url: 'https://x/a.jpg',
      }),
    ).toMatchObject({ ok: false }))
  it('validates MIME and size', () => {
    expect(validateAttachmentFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' })).ok).toBe(true)
    expect(validateAttachmentFile(new File(['x'], 'a.gif', { type: 'image/gif' })).ok).toBe(false)
  })
})
