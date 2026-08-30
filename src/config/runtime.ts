import { failure, success, type AppResult } from '@/shared/result'

export type ShopDataSource = 'fixture' | 'http'

export interface RuntimeConfig {
  readonly apiBaseUrl: string
  readonly httpTimeoutMs: number
  readonly shopDataSource: ShopDataSource
}

const defaultConfig: RuntimeConfig = {
  apiBaseUrl: '/api',
  httpTimeoutMs: 10_000,
  shopDataSource: 'fixture',
}

function isSafeBaseUrl(value: string) {
  if (value.startsWith('/')) return !value.startsWith('//')
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseRuntimeConfig(env: ImportMetaEnv): AppResult<RuntimeConfig> {
  const details: string[] = []
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim() || defaultConfig.apiBaseUrl
  if (!isSafeBaseUrl(apiBaseUrl)) details.push('VITE_API_BASE_URL 必须是根相对路径或 HTTP(S) URL')

  const timeoutText = env.VITE_HTTP_TIMEOUT_MS?.trim()
  const httpTimeoutMs = timeoutText ? Number(timeoutText) : defaultConfig.httpTimeoutMs
  if (!Number.isInteger(httpTimeoutMs) || httpTimeoutMs < 100 || httpTimeoutMs > 120_000) {
    details.push('VITE_HTTP_TIMEOUT_MS 必须是 100 到 120000 之间的整数')
  }

  const shopDataSource = env.VITE_SHOP_DATA_SOURCE ?? defaultConfig.shopDataSource
  if (shopDataSource !== 'fixture' && shopDataSource !== 'http') {
    details.push('VITE_SHOP_DATA_SOURCE 必须是 fixture 或 http')
  }

  if (details.length) {
    return failure({
      kind: 'parse',
      message: '运行环境配置无效。',
      details,
    })
  }

  return success({
    apiBaseUrl,
    httpTimeoutMs,
    shopDataSource,
  })
}

let cachedConfig: RuntimeConfig | undefined

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig
  const result = parseRuntimeConfig(import.meta.env)
  if (!result.ok) {
    throw new Error([result.error.message, ...(result.error.details ?? [])].join(' '))
  }
  cachedConfig = Object.freeze(result.data)
  return cachedConfig
}
