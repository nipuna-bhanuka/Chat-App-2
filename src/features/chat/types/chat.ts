export type MessageRole = 'user' | 'assistant'
export type MessageKind = 'text' | 'audio'

export type ChatMessage = {
  id: string
  scenarioId: string
  role: MessageRole
  kind: MessageKind
  content: string
  audioId?: string
  audioUrl?: string
  durationSeconds?: number
  createdAt: string
}

export type SendTextPayload = {
  scenarioId: string
  content: string
}

export type VoiceRecording = {
  blob: Blob
  mimeType: string
  durationSeconds: number
  transcript?: string
}

export type SendAudioPayload = VoiceRecording & {
  scenarioId: string
}
