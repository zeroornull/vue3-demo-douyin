import type { ReportGateway } from './report-gateway'
import { parseReportReceipt } from './report-parser'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure } from '@/shared/result'
export function createHttpReportGateway(client: HttpClient): ReportGateway {
  return {
    async submit(session, feedId, draft, signal) {
      const response = await client.post(`/feed/${feedId}/reports`, draft, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        ...(signal ? { signal } : {}),
      })
      if (response.ok) return parseReportReceipt(response.data, feedId)
      if (response.error.kind === 'http' && response.error.status === 401)
        return failure({ kind: 'unauthorized', message: '登录已失效。', status: 401 })
      if (response.error.kind === 'http' && response.error.status === 409)
        return failure({ kind: 'conflict', message: '你已经举报过这条内容。', status: 409 })
      if (response.error.kind === 'http' && response.error.status === 429)
        return failure({ kind: 'rate-limit', message: '举报过于频繁，请稍后再试。', status: 429 })
      return response
    },
  }
}
