import { wait } from '@/lib/utils/helpers'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 500) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type HttpMethod = 'GET' | 'POST'

type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  delayMs?: number
}

/**
 * Thin client used by feature services. The mock adapter can be replaced
 * with a real fetch implementation without changing callers.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, delayMs = 180 } = options
  await wait(delayMs)
  return mockAdapter<T>(path, method, body)
}

async function mockAdapter<T>(path: string, method: HttpMethod, body: unknown): Promise<T> {
  const { dispatchMockRequest } = await import('./mockApi')
  return dispatchMockRequest<T>(path, method, body)
}
