export type AppErrorKind =
  | 'aborted'
  | 'conflict'
  | 'http'
  | 'network'
  | 'not-found'
  | 'parse'
  | 'rate-limit'
  | 'timeout'
  | 'unauthorized'
  | 'unexpected'
  | 'validation'

export interface AppError {
  readonly kind: AppErrorKind
  readonly message: string
  readonly details?: readonly string[]
  readonly status?: number
}

export type AppResult<T, E extends AppError = AppError> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: E }

export function success<T>(data: T): AppResult<T, never> {
  return { ok: true, data }
}

export function failure<E extends AppError>(error: E): AppResult<never, E> {
  return { ok: false, error }
}

export function abortedFailure(): AppResult<never> {
  return failure({
    kind: 'aborted',
    message: '请求已取消。',
  })
}
