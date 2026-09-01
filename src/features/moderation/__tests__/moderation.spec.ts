import { describe, expect, it } from 'vitest'
import { parseFeedId } from '@/domain/feed/feed'
import { buildShareUrl } from '@/domain/moderation/moderation'
import { parseReportReceipt } from '@/features/moderation/api/report-parser'
import { validateReport } from '@/features/moderation/validation'
const id = parseFeedId('feed-e2e')!
describe('moderation', () => {
  it('builds same-origin links', () =>
    expect(buildShareUrl('https://app.test', id)).toBe('https://app.test/home/content/feed-e2e'))
  it('validates reasons and length', () => {
    expect(validateReport({ reason: 'spam', description: ' x ' }).ok).toBe(true)
    expect(validateReport({ reason: 'bad', description: '' }).ok).toBe(false)
  })
  it('parses receipts', () =>
    expect(
      parseReportReceipt({ feedId: id, reportId: 'r1', status: 'accepted' }, id),
    ).toMatchObject({ ok: true }))
})
