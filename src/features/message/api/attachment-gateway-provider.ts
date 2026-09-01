import type { AttachmentGateway } from './attachment-gateway'
import { fixtureAttachmentGateway } from './fixture-attachment-gateway'
import { createHttpAttachmentGateway } from './http-attachment-gateway'
import { getRuntimeConfig } from '@/config/runtime'
import { createAxiosHttpClient } from '@/infrastructure/http/http-client'

let cached: AttachmentGateway | undefined
export function getDefaultAttachmentGateway(): AttachmentGateway {
  if (cached) return cached
  const config = getRuntimeConfig()
  cached =
    config.authDataSource === 'fixture'
      ? fixtureAttachmentGateway
      : createHttpAttachmentGateway(
          createAxiosHttpClient({ baseUrl: config.apiBaseUrl, timeoutMs: config.httpTimeoutMs }),
        )
  return cached
}
