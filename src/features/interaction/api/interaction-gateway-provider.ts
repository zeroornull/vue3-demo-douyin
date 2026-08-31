import type { InteractionGateway } from './interaction-gateway'
import { fixtureInteractionGateway } from './fixture-interaction-gateway'
import { createHttpInteractionGateway } from './http-interaction-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'

let cachedGateway: InteractionGateway | undefined

export function getDefaultInteractionGateway(): InteractionGateway {
  if (cachedGateway) return cachedGateway
  const config = getRuntimeConfig()
  cachedGateway =
    config.feedDataSource === 'fixture'
      ? fixtureInteractionGateway
      : createHttpInteractionGateway(
          createAxiosHttpClient({ baseUrl: config.apiBaseUrl, timeoutMs: config.httpTimeoutMs }),
        )
  return cachedGateway
}
