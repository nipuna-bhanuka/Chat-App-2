import { fetchScenarios } from '@/services/scenarioService'
import { useApi } from '@/hooks/useApi'

export function useScenarios() {
  return useApi(fetchScenarios, 'scenarios')
}
