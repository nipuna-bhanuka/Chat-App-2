import { MOCK_SCENARIOS } from '@/features/scenarios/data/mockScenarios'
import type { AuthUser } from '@/features/auth/types/auth'
import { ApiError } from './api'

const DEMO_USER: AuthUser = {
  id: 'user_sasiru',
  firstName: 'Sasiru',
  lastName: 'Tharinda',
  displayName: 'Sasiru Tharinda',
}

export function dispatchMockRequest<T>(
  path: string,
  method: string,
  _body: unknown,
): T {
  if (path === '/auth/me' && method === 'GET') {
    return DEMO_USER as T
  }

  if (path === '/auth/logout' && method === 'POST') {
    return { ok: true } as T
  }

  if (path === '/scenarios' && method === 'GET') {
    return MOCK_SCENARIOS as T
  }

  const scenarioMatch = /^\/scenarios\/([^/]+)$/.exec(path)
  if (scenarioMatch && method === 'GET') {
    const scenario = MOCK_SCENARIOS.find((item) => item.id === scenarioMatch[1])
    if (!scenario) {
      throw new ApiError('Scenario not found', 404)
    }
    return scenario as T
  }

  throw new ApiError(`No mock handler for ${method} ${path}`, 404)
}
