import priyaAvatar from '@/assets/images/priya.svg'
import colomboPersona from '@/Personas/colombo-fde-agentic-01.json'
import type { DifficultyType, Scenario } from '@/features/scenarios/types/scenario'

export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: colomboPersona.scenarioId,
    title: colomboPersona.title,
    type: colomboPersona.type,
    description: colomboPersona.objective,
    difficulty: colomboPersona.difficulty as DifficultyType,
    category: 'executive-stakeholder-presentation',
    categoryLabel: colomboPersona.category,
    accent: 'green',
    skills: [colomboPersona.profession, colomboPersona.modality],
    learnerName: 'Amila',
    character: {
      name: colomboPersona.character.name,
      role: colomboPersona.character.title,
      title: colomboPersona.character.title,
      organization: 'Lanka Logistics & Warehousing',
      location: 'Colombo, Sri Lanka',
      tone: colomboPersona.character.tone,
      avatarUrl: priyaAvatar,
    },
    turnCap: colomboPersona.turnCap,
    persona: colomboPersona,
  },
]
