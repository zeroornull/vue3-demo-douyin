import type { AttachmentGateway } from './attachment-gateway'
import { parseMessageAttachment } from './message-parser'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'

export function createHttpAttachmentGateway(client: HttpClient): AttachmentGateway {
  return {
    async upload(session, conversationId, file, signal) {
      const body = new FormData()
      body.append('file', file)
      const response = await client.post(
        `/messages/conversations/${conversationId}/attachments`,
        body,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          ...(signal ? { signal } : {}),
        },
      )
      if (response.ok) return parseMessageAttachment(response.data)
      if (response.error.kind === 'http' && response.error.status === 401)
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      if (response.error.kind === 'http' && response.error.status === 413)
        return failure({ kind: 'validation', message: '附件超过服务端大小限制。', status: 413 })
      if (response.error.kind === 'http' && response.error.status === 429)
        return failure({ kind: 'rate-limit', message: '上传过于频繁，请稍后再试。', status: 429 })
      return response
    },
  }
}
