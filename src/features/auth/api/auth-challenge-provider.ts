import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'
import { fixtureAuthChallengeGateway } from './fixture-auth-challenge-gateway'
import { createHttpAuthChallengeGateway } from './http-auth-challenge-gateway'
let cached:
  ReturnType<typeof createHttpAuthChallengeGateway> | typeof fixtureAuthChallengeGateway | undefined
export function getAuthChallengeGateway() {
  if (cached) return cached
  const c = getRuntimeConfig()
  cached =
    c.authDataSource === 'fixture'
      ? fixtureAuthChallengeGateway
      : createHttpAuthChallengeGateway(
          createAxiosHttpClient({ baseUrl: c.apiBaseUrl, timeoutMs: c.httpTimeoutMs }),
        )
  return cached
}
