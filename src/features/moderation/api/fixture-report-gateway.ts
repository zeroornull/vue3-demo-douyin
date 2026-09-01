import type { ReportGateway } from './report-gateway'
import { abortedFailure, success } from '@/shared/result'
export const fixtureReportGateway: ReportGateway = {
  async submit(_session, feedId, _draft, signal) {
    await Promise.resolve()
    if (signal?.aborted) return abortedFailure()
    return success({ feedId, reportId: 'fixture-report-1', status: 'accepted' })
  },
}
