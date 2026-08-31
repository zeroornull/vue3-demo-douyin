export type MediaMimeType = 'video/mp4'
export type PlaybackStatus =
  'buffering' | 'ended' | 'error' | 'idle' | 'loading' | 'paused' | 'playing'

export interface MediaSource {
  readonly durationSeconds: number
  readonly mimeType: MediaMimeType
  readonly posterUrl: string
  readonly src: string
}

export interface PlaybackState {
  readonly currentTime: number
  readonly duration: number
  readonly error: string | null
  readonly muted: boolean
  readonly status: PlaybackStatus
}

export type PlaybackAction =
  | { readonly type: 'ended' }
  | { readonly type: 'failure'; readonly message: string }
  | { readonly type: 'load-start' }
  | { readonly type: 'metadata'; readonly duration: number; readonly muted: boolean }
  | { readonly type: 'mute-change'; readonly muted: boolean }
  | { readonly type: 'pause' }
  | { readonly type: 'play-request' }
  | { readonly type: 'playing' }
  | { readonly type: 'reset'; readonly duration: number; readonly muted: boolean }
  | { readonly type: 'time-update'; readonly currentTime: number }
  | { readonly type: 'waiting' }

export function createPlaybackState(duration = 0, muted = true): PlaybackState {
  return {
    status: 'idle',
    currentTime: 0,
    duration,
    muted,
    error: null,
  }
}

function finiteTime(value: number, fallback: number) {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export function reducePlaybackState(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'reset':
      return createPlaybackState(action.duration, action.muted)
    case 'load-start':
      return { ...state, status: 'loading', error: null }
    case 'metadata':
      return {
        ...state,
        status: 'paused',
        duration: finiteTime(action.duration, state.duration),
        muted: action.muted,
        error: null,
      }
    case 'play-request':
      return { ...state, status: 'loading', error: null }
    case 'playing':
      return { ...state, status: 'playing', error: null }
    case 'waiting':
      return { ...state, status: 'buffering' }
    case 'pause':
      return state.status === 'ended' || state.status === 'error'
        ? state
        : { ...state, status: 'paused' }
    case 'time-update':
      return { ...state, currentTime: finiteTime(action.currentTime, state.currentTime) }
    case 'mute-change':
      return { ...state, muted: action.muted }
    case 'ended':
      return { ...state, status: 'ended', currentTime: state.duration }
    case 'failure':
      return { ...state, status: 'error', error: action.message }
  }
}

export function formatPlaybackTime(value: number): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}
