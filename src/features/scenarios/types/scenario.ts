export type ScenarioCategory =
  | 'difficult-disclosure'
  | 'leadership'
  | 'stakeholder-management'
  | 'communication'
  | 'executive-stakeholder-presentation'

export type ScenarioAccent = 'blue' | 'orange' | 'green' | 'purple'

export type ScenarioCharacter = {
  name: string
  role: string
  title:string
  organization: string
  location: string
  tone: string
  avatarUrl: string
}

export type PersonaTrap = {
  name: string
  description: string
  penalty: number
}

export type PersonaConfig = {
  scenarioId: string
  profession: string
  category: string
  modality: string
  title: string
  objective: string
  turnCap: number
  character: {
    name: string
    title: string
    background: string
    tone: string
    languageStyle: string
    coreBelief: string
    openingLine: string
  }
  metrics: {
    name: string
    startScore: number
    targetBoundary: number
    rules: {
      increase: string
      decrease: string
    }
  }
  traps: Record<string, PersonaTrap>
}

export type Scenario = {
  id: string
  title: string
  type:string
  description: string
  difficulty: DifficultyType
  category: ScenarioCategory
  categoryLabel: string
  accent: ScenarioAccent
  skills: string[]
  learnerName: string
  character: ScenarioCharacter
  turnCap: number
  persona: PersonaConfig
}

export type DifficultyType = 'Beginner' |'Intermediate' | 'Advanced'