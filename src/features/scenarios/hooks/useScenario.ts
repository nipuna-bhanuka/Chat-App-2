import { fetchScenarioById } from '@/services/scenarioService'
import { useApi } from '@/hooks/useApi'

export function useScenario(scenarioId: string) {
  return useApi(() => fetchScenarioById(scenarioId), scenarioId)
}
