import type { Scenario } from '@/features/scenarios/types/scenario'
import { API_ENDPOINTS } from '@/lib/constants/apiEndpoints'
import { request } from './api'

export function fetchScenarios(): Promise<Scenario[]> {
  return request<Scenario[]>(API_ENDPOINTS.scenarios.list)
}

export function fetchScenarioById(id: string): Promise<Scenario> {
  return request<Scenario>(API_ENDPOINTS.scenarios.byId(id))
}
