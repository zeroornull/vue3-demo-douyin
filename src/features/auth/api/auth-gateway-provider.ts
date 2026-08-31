import type { AuthGateway } from './auth-gateway'
import { fixtureAuthGateway } from './fixture-auth-gateway'
import { createHttpAuthGateway } from './http-auth-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'

let cachedGateway: AuthGateway | undefined

export function getDefaultAuthGateway(): AuthGateway {
  if (cachedGateway) return cachedGateway
  const config = getRuntimeConfig()
  cachedGateway =
    config.authDataSource === 'fixture'
      ? fixtureAuthGateway
      : createHttpAuthGateway(
          createAxiosHttpClient({
            baseUrl: config.apiBaseUrl,
            timeoutMs: config.httpTimeoutMs,
          }),
        )
  return cachedGateway
}
