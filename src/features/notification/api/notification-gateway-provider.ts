import type { NotificationGateway } from './notification-gateway'
import { fixtureNotificationGateway } from './fixture-notification-gateway'
import { createHttpNotificationGateway } from './http-notification-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'
let cached: NotificationGateway | undefined
export function getDefaultNotificationGateway() {
  if (cached) return cached
  const config = getRuntimeConfig()
  cached =
    config.authDataSource === 'fixture'
      ? fixtureNotificationGateway
      : createHttpNotificationGateway(
          createAxiosHttpClient({ baseUrl: config.apiBaseUrl, timeoutMs: config.httpTimeoutMs }),
        )
  return cached
}
