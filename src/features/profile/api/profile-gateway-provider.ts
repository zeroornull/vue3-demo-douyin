import type { ProfileGateway } from './profile-gateway'
import { fixtureProfileGateway } from './fixture-profile-gateway'
import { createHttpProfileGateway } from './http-profile-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'

let cachedGateway: ProfileGateway | undefined

export function getDefaultProfileGateway(): ProfileGateway {
  if (cachedGateway) return cachedGateway
  const config = getRuntimeConfig()
  cachedGateway =
    config.authDataSource === 'fixture'
      ? fixtureProfileGateway
      : createHttpProfileGateway(
          createAxiosHttpClient({
            baseUrl: config.apiBaseUrl,
            timeoutMs: config.httpTimeoutMs,
          }),
        )
  return cachedGateway
}
