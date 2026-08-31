import { describe, expect, it } from 'vitest'
import { parseMediaSource } from '@/features/media/media-parser'

const mediaSourceResponse = {
  src: '/feed/media/field-demo.mp4',
  mimeType: 'video/mp4',
  posterUrl: '/feed/covers/field.jpg',
  durationSeconds: 4,
}

describe('parseMediaSource', () => {
  it('parses and freezes a local MP4 source', () => {
    const result = parseMediaSource(mediaSourceResponse)
    expect(result).toMatchObject({ ok: true, data: { mimeType: 'video/mp4' } })
    if (!result.ok) throw new Error(result.error.message)
    expect(Object.isFrozen(result.data)).toBe(true)
  })

  it('rejects external and dot-segment media URLs', () => {
    expect(
      parseMediaSource({ ...mediaSourceResponse, src: 'https://example.test/video.mp4' }),
    ).toMatchObject({ ok: false, error: { details: ['src'] } })
    expect(parseMediaSource({ ...mediaSourceResponse, src: '/feed/media/..' })).toMatchObject({
      ok: false,
      error: { details: ['src'] },
    })
  })

  it('rejects unsupported MIME types', () => {
    expect(
      parseMediaSource({ ...mediaSourceResponse, mimeType: 'application/x-mpegURL' }),
    ).toMatchObject({ ok: false, error: { details: ['mimeType'] } })
  })

  it('rejects unsafe poster and duration', () => {
    expect(
      parseMediaSource({
        ...mediaSourceResponse,
        posterUrl: '//external/poster.jpg',
        durationSeconds: 0,
      }),
    ).toMatchObject({ ok: false, error: { details: ['posterUrl', 'durationSeconds'] } })
  })
})
