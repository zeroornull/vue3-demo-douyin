import { describe, expect, it } from 'vitest'
import type { AuthSession } from '@/domain/auth/auth'
import { parseFeedId } from '@/domain/feed/feed'
import { createHttpInteractionGateway } from '@/features/interaction/api/http-interaction-gateway'
import type { HttpClient } from '@/infrastructure/http/http-client'
import { failure, success, type AppResult } from '@/shared/result'

const feedId = parseFeedId('feed-e2e')!
const session: AuthSession = { userId: 'user', displayName: 'User', accessToken: 'secret' }
const comment = {
  id: 'comment-e2e',
  feedId,
  author: { userId: 'user', displayName: 'User' },
  body: '评论',
  createdAt: '2026-08-31T03:00:00.000Z',
  likeCount: 0,
  likedByViewer: false,
  version: 1,
}

function client(results: AppResult<unknown>[], records: string[] = []): HttpClient {
  const next = () => results.shift() ?? failure({ kind: 'unexpected', message: 'missing result' })
  return {
    async get(path) {
      records.push(`GET ${path}`)
      return next()
    },
    async post(path, _body, options) {
      records.push(`POST ${path} ${options?.headers?.Authorization ?? ''}`)
      return next()
    },
    async patch() {
      return failure({ kind: 'unexpected', message: 'patch unused' })
    },
  }
}

describe('HTTP interaction gateway', () => {
  it('uses stable paths and bearer writes', async () => {
    const records: string[] = []
    const gateway = createHttpInteractionGateway(
      client(
        [
          success({ comments: [comment], nextCursor: null }),
          success(comment),
          success({ feedId, liked: true, likeCount: 11, version: 2 }),
        ],
        records,
      ),
    )
    await gateway.listComments(feedId)
    await gateway.createComment(session, feedId, { body: '评论' })
    await gateway.setLiked(session, feedId, true, 1)
    expect(records).toEqual([
      'GET /feed/feed-e2e/comments',
      'POST /feed/feed-e2e/comments Bearer secret',
      'POST /feed/feed-e2e/like Bearer secret',
    ])
  })

  it('maps 401/409/429 separately', async () => {
    for (const [status, kind] of [
      [401, 'unauthorized'],
      [409, 'conflict'],
      [429, 'rate-limit'],
    ] as const) {
      const gateway = createHttpInteractionGateway(
        client([failure({ kind: 'http', message: 'x', status })]),
      )
      expect(await gateway.createComment(session, feedId, { body: 'x' })).toMatchObject({
        ok: false,
        error: { kind },
      })
    }
  })

  it('preserves 503', async () => {
    const gateway = createHttpInteractionGateway(
      client([failure({ kind: 'http', message: '503', status: 503 })]),
    )
    expect(await gateway.setLiked(session, feedId, true, 1)).toEqual({
      ok: false,
      error: { kind: 'http', message: '503', status: 503 },
    })
  })
})
