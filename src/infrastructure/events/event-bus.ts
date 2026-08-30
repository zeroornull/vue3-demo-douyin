type EventHandler<T> = (payload: T) => void

export interface TypedEventBus<Events extends object> {
  clear(): void
  emit<K extends keyof Events>(type: K, payload: Events[K]): void
  listenerCount<K extends keyof Events>(type: K): number
  on<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): () => void
}

export function createEventBus<Events extends object>(): TypedEventBus<Events> {
  type AnyEventPayload = Events[keyof Events]
  const listeners = new Map<keyof Events, Set<EventHandler<AnyEventPayload>>>()

  return {
    clear() {
      listeners.clear()
    },

    emit(type, payload) {
      for (const handler of listeners.get(type) ?? []) handler(payload)
    },

    listenerCount(type) {
      return listeners.get(type)?.size ?? 0
    },

    on(type, handler) {
      let handlers = listeners.get(type)
      if (!handlers) {
        handlers = new Set()
        listeners.set(type, handlers)
      }
      handlers.add(handler as EventHandler<AnyEventPayload>)
      return () => {
        handlers.delete(handler as EventHandler<AnyEventPayload>)
        if (handlers.size === 0) listeners.delete(type)
      }
    },
  }
}
