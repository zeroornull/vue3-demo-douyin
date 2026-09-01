import type { AttachmentGateway } from './attachment-gateway'
import { abortedFailure, success } from '@/shared/result'

export const fixtureAttachmentGateway: AttachmentGateway = {
  async upload(_session, _conversationId, file, signal) {
    await Promise.resolve()
    if (signal?.aborted) return abortedFailure()
    const ext = file.type === 'video/mp4' ? 'mp4' : file.type === 'image/png' ? 'png' : 'jpg'
    return success({
      id: `fixture-${file.name.replace(/[^A-Za-z0-9_-]/g, '-')}`,
      kind: file.type === 'video/mp4' ? 'video' : 'image',
      mimeType: file.type as 'image/jpeg' | 'image/png' | 'video/mp4',
      sizeBytes: file.size,
      url: `/message/attachments/fixture.${ext}`,
    })
  },
}
