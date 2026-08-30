import axios, { AxiosError, CanceledError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { createAxiosHttpClient, mapAxiosError } from '@/infrastructure/http/http-client'

describe('mapAxiosError', () => {
  it('maps cancellation', () => {
    expect(mapAxiosError(new CanceledError('cancelled'))).toEqual({
      kind: 'aborted',
      message: '请求已取消。',
    })
  })

  it('maps timeout codes', () => {
    expect(mapAxiosError(new AxiosError('timeout', AxiosError.ETIMEDOUT))).toEqual({
      kind: 'timeout',
      message: '请求超时。',
    })
  })

  it('maps HTTP status without exposing the response body', () => {
    const response = {
      status: 503,
      statusText: 'Unavailable',
      data: { secret: 'not exposed' },
      headers: {},
      config: {},
    } as AxiosResponse<unknown>

    expect(
      mapAxiosError(
        new AxiosError('bad response', 'ERR_BAD_RESPONSE', undefined, undefined, response),
      ),
    ).toEqual({
      kind: 'http',
      message: 'HTTP 请求失败（503）。',
      status: 503,
    })
  })

  it('maps a request without a response as a network failure', () => {
    expect(mapAxiosError(new AxiosError('network', 'ERR_NETWORK', undefined, {}))).toEqual({
      kind: 'network',
      message: '网络连接失败。',
    })
  })

  it('maps unknown thrown values', () => {
    expect(mapAxiosError('boom')).toEqual({
      kind: 'unexpected',
      message: 'HTTP 客户端发生未预期错误。',
      details: ['boom'],
    })
  })
})

describe('createAxiosHttpClient', () => {
  it('returns response data as unknown through AppResult', async () => {
    const instance = axios.create({
      adapter: async (config) => ({
        config,
        data: { value: 42 },
        headers: {},
        status: 200,
        statusText: 'OK',
      }),
    })
    const client = createAxiosHttpClient({ baseUrl: '/api', instance, timeoutMs: 1000 })

    expect(await client.get('/value')).toEqual({ ok: true, data: { value: 42 } })
  })
})
