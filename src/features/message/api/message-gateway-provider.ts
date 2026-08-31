import type { MessageGateway } from './message-gateway'
import { fixtureMessageGateway } from './fixture-message-gateway'
import { createHttpMessageGateway } from './http-message-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'

let cachedGateway: MessageGateway | undefined

export function getDefaultMessageGateway(): MessageGateway {
  if (cachedGateway) return cachedGateway
  const config = getRuntimeConfig()
  cachedGateway =
    config.authDataSource === 'fixture'
      ? fixtureMessageGateway
      : createHttpMessageGateway(
          createAxiosHttpClient({
            baseUrl: config.apiBaseUrl,
            timeoutMs: config.httpTimeoutMs,
          }),
        )
  return cachedGateway
}
