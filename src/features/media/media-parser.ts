import type { MediaSource } from '@/domain/media/media'
import { failure, success, type AppResult } from '@/shared/result'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeMediaUrl(value: unknown): value is string {
  return typeof value === 'string' && /^\/feed\/media\/[A-Za-z0-9][A-Za-z0-9_-]*\.mp4$/.test(value)
}

function isSafePosterUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\/feed\/covers\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:avif|jpe?g|png|webp)$/.test(value)
  )
}

export function parseMediaSource(input: unknown): AppResult<MediaSource> {
  if (!isRecord(input)) {
    return failure({ kind: 'parse', message: 'Media source 格式无效。' })
  }
  const errors: string[] = []
  if (!isSafeMediaUrl(input.src)) errors.push('src')
  if (input.mimeType !== 'video/mp4') errors.push('mimeType')
  if (!isSafePosterUrl(input.posterUrl)) errors.push('posterUrl')
  if (
    typeof input.durationSeconds !== 'number' ||
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds <= 0 ||
    input.durationSeconds > 3600
  ) {
    errors.push('durationSeconds')
  }
  if (errors.length) {
    return failure({ kind: 'parse', message: 'Media source 字段无效。', details: errors })
  }
  return success(
    Object.freeze({
      src: input.src as string,
      mimeType: 'video/mp4',
      posterUrl: input.posterUrl as string,
      durationSeconds: input.durationSeconds as number,
    }),
  )
}
