import { describe, expect, it } from 'vitest'
import { parseRuntimeConfig } from '@/config/runtime'

describe('parseRuntimeConfig', () => {
  it('provides safe fixture defaults', () => {
    expect(parseRuntimeConfig({} as ImportMetaEnv)).toEqual({
      ok: true,
      data: {
        apiBaseUrl: '/api',
        authDataSource: 'fixture',
        feedDataSource: 'fixture',
        httpTimeoutMs: 10_000,
        shopDataSource: 'fixture',
      },
    })
  })

  it('accepts an HTTP adapter configuration', () => {
    expect(
      parseRuntimeConfig({
        VITE_API_BASE_URL: 'https://api.example.test/v1',
        VITE_AUTH_DATA_SOURCE: 'http',
        VITE_FEED_DATA_SOURCE: 'http',
        VITE_HTTP_TIMEOUT_MS: '2500',
        VITE_SHOP_DATA_SOURCE: 'http',
      } as ImportMetaEnv),
    ).toMatchObject({
      ok: true,
      data: {
        authDataSource: 'http',
        feedDataSource: 'http',
        httpTimeoutMs: 2500,
        shopDataSource: 'http',
      },
    })
  })

  it('rejects unsafe API protocols', () => {
    expect(
      parseRuntimeConfig({ VITE_API_BASE_URL: 'javascript:alert(1)' } as ImportMetaEnv),
    ).toMatchObject({ ok: false, error: { kind: 'parse' } })
  })

  it('rejects invalid timeout ranges', () => {
    expect(parseRuntimeConfig({ VITE_HTTP_TIMEOUT_MS: '10' } as ImportMetaEnv)).toMatchObject({
      ok: false,
      error: { kind: 'parse' },
    })
  })

  it('rejects an unknown data source at runtime', () => {
    expect(
      parseRuntimeConfig({ VITE_SHOP_DATA_SOURCE: 'database' } as unknown as ImportMetaEnv),
    ).toMatchObject({ ok: false, error: { kind: 'parse' } })
  })

  it('rejects an unknown auth data source at runtime', () => {
    expect(
      parseRuntimeConfig({ VITE_AUTH_DATA_SOURCE: 'database' } as unknown as ImportMetaEnv),
    ).toMatchObject({ ok: false, error: { kind: 'parse' } })
  })

  it('rejects an unknown feed data source at runtime', () => {
    expect(
      parseRuntimeConfig({ VITE_FEED_DATA_SOURCE: 'database' } as unknown as ImportMetaEnv),
    ).toMatchObject({ ok: false, error: { kind: 'parse' } })
  })
})
