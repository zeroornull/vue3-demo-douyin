import type { AppEventMap } from '@/shared/events'
import { createEventBus } from './event-bus'

export const appEventBus = createEventBus<AppEventMap>()
