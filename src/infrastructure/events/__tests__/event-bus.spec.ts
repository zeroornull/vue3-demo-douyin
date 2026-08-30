import { describe, expect, it } from 'vitest'
import { createEventBus } from '@/infrastructure/events/event-bus'

interface TestEvents {
  changed: { readonly value: number }
  reset: undefined
}

describe('createEventBus', () => {
  it('delivers a typed payload and removes the listener', () => {
    const bus = createEventBus<TestEvents>()
    const values: number[] = []
    const off = bus.on('changed', ({ value }) => values.push(value))

    bus.emit('changed', { value: 1 })
    off()
    bus.emit('changed', { value: 2 })

    expect(values).toEqual([1])
    expect(bus.listenerCount('changed')).toBe(0)
  })

  it('clears every subscription', () => {
    const bus = createEventBus<TestEvents>()
    bus.on('reset', () => undefined)
    bus.on('changed', () => undefined)

    bus.clear()

    expect(bus.listenerCount('reset')).toBe(0)
    expect(bus.listenerCount('changed')).toBe(0)
  })
})
