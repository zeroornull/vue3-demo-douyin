import axios, {
  AxiosError,
  CanceledError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export interface HttpRequestOptions {
  readonly query?: Readonly<Record<string, boolean | number | string>>
  readonly signal?: AbortSignal
}

export interface HttpClient {
  get(path: string, options?: HttpRequestOptions): Promise<AppResult<unknown>>
}

export interface AxiosHttpClientOptions {
  readonly baseUrl: string
  readonly instance?: AxiosInstance
  readonly timeoutMs: number
}

export function mapAxiosError(error: unknown): AppError {
  if (
    error instanceof CanceledError ||
    (error instanceof AxiosError && error.code === 'ERR_CANCELED')
  ) {
    return { kind: 'aborted', message: '请求已取消。' }
  }
  if (
    error instanceof AxiosError &&
    (error.code === AxiosError.ETIMEDOUT || error.code === AxiosError.ECONNABORTED)
  ) {
    return { kind: 'timeout', message: '请求超时。' }
  }
  if (error instanceof AxiosError && error.response) {
    return {
      kind: 'http',
      message: `HTTP 请求失败（${error.response.status}）。`,
      status: error.response.status,
    }
  }
  if (error instanceof AxiosError && error.request) {
    return { kind: 'network', message: '网络连接失败。' }
  }
  return {
    kind: 'unexpected',
    message: 'HTTP 客户端发生未预期错误。',
    details: [error instanceof Error ? error.message : String(error)],
  }
}

export function createAxiosHttpClient(options: AxiosHttpClientOptions): HttpClient {
  const instance =
    options.instance ??
    axios.create({
      baseURL: options.baseUrl,
      timeout: options.timeoutMs,
      headers: { Accept: 'application/json' },
    })

  return {
    async get(path, requestOptions) {
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: path,
        ...(requestOptions?.query ? { params: requestOptions.query } : {}),
        ...(requestOptions?.signal ? { signal: requestOptions.signal } : {}),
      }
      try {
        const response = await instance.request<unknown>(config)
        return success(response.data)
      } catch (error: unknown) {
        return failure(mapAxiosError(error))
      }
    },
  }
}
