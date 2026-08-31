import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MediaPlayer from '@/features/media/components/MediaPlayer.vue'

const mediaSourceResponse = {
  src: '/feed/media/field-demo.mp4',
  mimeType: 'video/mp4' as const,
  posterUrl: '/feed/covers/field.jpg',
  durationSeconds: 4,
}

describe('MediaPlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders without autoplay and exposes labelled controls', () => {
    const wrapper = mount(MediaPlayer, { props: { source: mediaSourceResponse } })

    expect(wrapper.get('video').attributes('autoplay')).toBeUndefined()
    expect(wrapper.get('[aria-label="播放"]').text()).toBe('播放')
    expect(wrapper.get('[aria-label="取消静音"]').text()).toBe('取消静音')
    expect(wrapper.get('[aria-label="媒体播放器"]').attributes('tabindex')).toBe('0')
  })

  it('moves from metadata to user-triggered playing', async () => {
    const wrapper = mount(MediaPlayer, { props: { source: mediaSourceResponse } })
    const element = wrapper.get('video').element
    Object.defineProperty(element, 'duration', { configurable: true, value: 4 })
    await wrapper.get('video').trigger('loadedmetadata')
    expect(wrapper.get('[data-testid="playback-status"]').text()).toBe('已暂停')

    await wrapper.get('[aria-label="播放"]').trigger('click')
    await wrapper.get('video').trigger('playing')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="playback-status"]').text()).toBe('播放中')
  })

  it('supports keyboard mute from the player container', async () => {
    const wrapper = mount(MediaPlayer, { props: { source: mediaSourceResponse } })

    await wrapper.get('[aria-label="媒体播放器"]').trigger('keydown', { key: 'm' })

    expect(wrapper.get('[aria-label="静音"]').text()).toBe('静音')
  })

  it('renders media element failures as an alert', async () => {
    const wrapper = mount(MediaPlayer, { props: { source: mediaSourceResponse } })
    Object.defineProperty(wrapper.get('video').element, 'error', {
      configurable: true,
      value: { code: 4 },
    })

    await wrapper.get('video').trigger('error')

    expect(wrapper.get('[role="alert"]').text()).toContain('code 4')
    expect(wrapper.get('[data-testid="playback-status"]').text()).toBe('播放失败')
  })
})
