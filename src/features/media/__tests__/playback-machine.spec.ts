import { describe, expect, it } from 'vitest'
import { createPlaybackState, formatPlaybackTime, reducePlaybackState } from '@/domain/media/media'

describe('playback state machine', () => {
  it('moves from load to paused metadata without autoplay', () => {
    const loading = reducePlaybackState(createPlaybackState(4), { type: 'load-start' })
    const paused = reducePlaybackState(loading, {
      type: 'metadata',
      duration: 4,
      muted: true,
    })

    expect(loading.status).toBe('loading')
    expect(paused).toMatchObject({ status: 'paused', duration: 4, muted: true })
  })

  it('represents playing, buffering, and resume separately', () => {
    const playing = reducePlaybackState(createPlaybackState(4), { type: 'playing' })
    const buffering = reducePlaybackState(playing, { type: 'waiting' })
    const resumed = reducePlaybackState(buffering, { type: 'playing' })

    expect([playing.status, buffering.status, resumed.status]).toEqual([
      'playing',
      'buffering',
      'playing',
    ])
  })

  it('keeps ended stable when the browser emits pause afterward', () => {
    const ended = reducePlaybackState(createPlaybackState(4), { type: 'ended' })
    expect(reducePlaybackState(ended, { type: 'pause' })).toEqual(ended)
  })

  it('stores a safe error and resets for a new source', () => {
    const failed = reducePlaybackState(createPlaybackState(4), {
      type: 'failure',
      message: 'decode failed',
    })
    const reset = reducePlaybackState(failed, { type: 'reset', duration: 8, muted: false })

    expect(failed).toMatchObject({ status: 'error', error: 'decode failed' })
    expect(reducePlaybackState(failed, { type: 'pause' })).toEqual(failed)
    expect(reset).toEqual(createPlaybackState(8, false))
  })

  it('formats finite playback time defensively', () => {
    expect(formatPlaybackTime(65.9)).toBe('1:05')
    expect(formatPlaybackTime(Number.NaN)).toBe('0:00')
  })
})
