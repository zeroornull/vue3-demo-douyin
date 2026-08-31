<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  createPlaybackState,
  formatPlaybackTime,
  reducePlaybackState,
  type MediaSource,
  type PlaybackAction,
  type PlaybackState,
} from '@/domain/media/media'
import '@/features/media/media.css'

defineOptions({ name: 'MediaPlayer' })

const props = defineProps<{ readonly source: MediaSource }>()
const video = ref<HTMLVideoElement>()
const state = ref<PlaybackState>(createPlaybackState(props.source.durationSeconds, true))

const statusLabel = computed(() => {
  const labels = {
    buffering: '缓冲中',
    ended: '播放结束',
    error: '播放失败',
    idle: '等待加载',
    loading: '加载中',
    paused: '已暂停',
    playing: '播放中',
  } as const
  return labels[state.value.status]
})
const playLabel = computed(() =>
  state.value.status === 'playing' ? '暂停' : state.value.status === 'ended' ? '重新播放' : '播放',
)
const duration = computed(() => state.value.duration || props.source.durationSeconds)

function dispatch(action: PlaybackAction) {
  state.value = reducePlaybackState(state.value, action)
}

async function togglePlayback() {
  const element = video.value
  if (!element) return
  if (!element.paused && !element.ended) {
    element.pause()
    return
  }
  if (element.ended || state.value.status === 'ended') element.currentTime = 0
  dispatch({ type: 'play-request' })
  try {
    await element.play()
  } catch (cause: unknown) {
    dispatch({
      type: 'failure',
      message: cause instanceof Error ? cause.message : '浏览器拒绝播放。',
    })
  }
}

function toggleMuted() {
  if (!video.value) return
  video.value.muted = !video.value.muted
  dispatch({ type: 'mute-change', muted: video.value.muted })
}

function seekTo(value: number) {
  const element = video.value
  if (!element || !Number.isFinite(value)) return
  const next = Math.min(Math.max(0, value), duration.value)
  element.currentTime = next
  dispatch({ type: 'time-update', currentTime: next })
}

function updateProgress(event: Event) {
  if (event.currentTarget instanceof HTMLInputElement) {
    seekTo(Number(event.currentTarget.value))
  }
}

function onLoadedMetadata() {
  if (!video.value) return
  dispatch({
    type: 'metadata',
    duration: video.value.duration,
    muted: video.value.muted,
  })
}

function onTimeUpdate() {
  if (video.value) dispatch({ type: 'time-update', currentTime: video.value.currentTime })
}

function onMediaError() {
  const code = video.value?.error?.code
  dispatch({
    type: 'failure',
    message: code ? `媒体加载失败（code ${code}）。` : '媒体加载失败。',
  })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  if (event.key === ' ' || event.key.toLowerCase() === 'k') {
    event.preventDefault()
    void togglePlayback()
  } else if (event.key.toLowerCase() === 'm') {
    event.preventDefault()
    toggleMuted()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    seekTo(state.value.currentTime + 5)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    seekTo(state.value.currentTime - 5)
  }
}

watch(
  () => props.source.src,
  async () => {
    video.value?.pause()
    state.value = createPlaybackState(props.source.durationSeconds, true)
    await nextTick()
    video.value?.load()
  },
)

onBeforeUnmount(() => video.value?.pause())
</script>

<template>
  <section class="media-player" tabindex="0" aria-label="媒体播放器" @keydown="handleKeydown">
    <video
      ref="video"
      data-testid="media-element"
      :src="source.src"
      :poster="source.posterUrl"
      :muted="state.muted"
      :aria-label="`视频内容，${statusLabel}`"
      playsinline
      preload="metadata"
      @loadstart="dispatch({ type: 'load-start' })"
      @loadedmetadata="onLoadedMetadata"
      @play="dispatch({ type: 'play-request' })"
      @playing="dispatch({ type: 'playing' })"
      @waiting="dispatch({ type: 'waiting' })"
      @pause="dispatch({ type: 'pause' })"
      @timeupdate="onTimeUpdate"
      @volumechange="dispatch({ type: 'mute-change', muted: video?.muted ?? state.muted })"
      @ended="dispatch({ type: 'ended' })"
      @error="onMediaError"
    >
      您的浏览器不支持 HTML5 视频。
    </video>

    <div class="media-controls">
      <button
        type="button"
        :disabled="state.status === 'error'"
        :aria-label="playLabel"
        @click="togglePlayback"
      >
        {{ playLabel }}
      </button>
      <button type="button" :aria-label="state.muted ? '取消静音' : '静音'" @click="toggleMuted">
        {{ state.muted ? '取消静音' : '静音' }}
      </button>
      <label>
        <span>播放进度</span>
        <input
          type="range"
          min="0"
          :max="duration"
          step="0.1"
          :value="state.currentTime"
          @input="updateProgress"
        />
      </label>
      <span class="media-time">
        {{ formatPlaybackTime(state.currentTime) }} / {{ formatPlaybackTime(duration) }}
      </span>
      <output data-testid="playback-status" aria-live="polite">{{ statusLabel }}</output>
    </div>

    <p v-if="state.error" class="media-error" role="alert">{{ state.error }}</p>
    <p class="media-keyboard-help">键盘：Space/K 播放暂停，M 静音，方向键快退/快进。</p>
  </section>
</template>
