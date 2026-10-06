import type {
  ChatMessage,
  SendAudioPayload,
  SendTextPayload,
} from '@/features/chat/types/chat'
import { MOCK_SCENARIOS } from '@/features/scenarios/data/mockScenarios'
import { STORAGE_KEYS } from '@/lib/constants/apiEndpoints'
import { createId } from '@/lib/utils/helpers'
import { callGemini, synthesizeSpeech } from './geminiService'
import { transcribeAudio } from './aiApi'
import { clearScenarioAudio, deleteAudio, saveAudio } from './audioStorage'

type SendResult = {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  sessionComplete: boolean
}

function scenarioFor(scenarioId: string) {
  const scenario = MOCK_SCENARIOS.find((item) => item.id === scenarioId)
  if (!scenario) {
    throw new Error('Scenario not found')
  }
  return scenario
}

function storageKey(scenarioId: string) {
  return STORAGE_KEYS.chatMessages(scenarioId)
}

function openingMessage(scenarioId: string): ChatMessage {
  const scenario = scenarioFor(scenarioId)
  return {
    id: createId('msg'),
    scenarioId,
    role: 'assistant',
    kind: 'text',
    content: scenario.persona.character.openingLine,
    createdAt: new Date().toISOString(),
  }
}

function readMessages(scenarioId: string) {
  try {
    const raw = window.localStorage.getItem(storageKey(scenarioId))
    return raw ? (JSON.parse(raw) as ChatMessage[]) : null
  } catch {
    return null
  }
}

function persistMessages(scenarioId: string, messages: ChatMessage[]) {
  window.localStorage.setItem(storageKey(scenarioId), JSON.stringify(messages))
}

export function clearMessages(scenarioId: string, preserveAudio = false) {
  window.localStorage.removeItem(storageKey(scenarioId))
  if (!preserveAudio) void clearScenarioAudio(scenarioId).catch(() => {})
}

export async function fetchMessages(scenarioId: string): Promise<ChatMessage[]> {
  const stored = readMessages(scenarioId)
  if (stored?.length) {
    return stored
  }
  // A fresh session also removes audio left by a completed tab that was closed.
  await clearScenarioAudio(scenarioId).catch(() => {})
  const initial = [openingMessage(scenarioId)]
  persistMessages(scenarioId, initial)
  return initial
}

export function sendTextMessage(payload: SendTextPayload, signal?: AbortSignal): Promise<SendResult> {
  return sendMessage(payload, undefined, signal)
}

async function sendMessage(payload: SendTextPayload, audio?: SendAudioPayload, signal?: AbortSignal): Promise<SendResult> {
  const scenario = scenarioFor(payload.scenarioId)
  const content = payload.content.trim()
  if (!content) throw new Error('Please enter a message or record clear speech.')
  signal?.throwIfAborted()
  const current = await fetchMessages(payload.scenarioId)
  const userTurns = current.filter((message) => message.role === 'user').length
  if (userTurns >= scenario.turnCap) {
    throw new Error('This session is already complete.')
  }

  const userMessage: ChatMessage = {
    id: createId('msg'),
    scenarioId: payload.scenarioId,
    role: 'user',
    kind: audio ? 'audio' : 'text',
    durationSeconds: audio?.durationSeconds,
    content,
    createdAt: new Date().toISOString(),
  }
  const withUser = [...current, userMessage]

  const turn = await callGemini(scenario.persona, withUser, signal)
  const assistantMessage: ChatMessage = {
    id: createId('msg'),
    scenarioId: payload.scenarioId,
    role: 'assistant',
    kind: 'text',
    content: turn.reply,
    audioUrl: await synthesizeSpeech(turn.reply, signal),
    createdAt: new Date().toISOString(),
  }
  const next = [...withUser, assistantMessage]
  const sessionComplete = userTurns + 1 >= scenario.turnCap || Boolean(turn.resolved)

  signal?.throwIfAborted()
  if (audio) {
    userMessage.audioId = userMessage.id
    await saveAudio(userMessage.id, payload.scenarioId, audio.blob)
  }
  try {
    signal?.throwIfAborted()
    if (sessionComplete) clearMessages(payload.scenarioId, true)
    else persistMessages(payload.scenarioId, next)
  } catch (error) {
    if (audio) await deleteAudio(userMessage.id).catch(() => {})
    throw error
  }

  return { userMessage, assistantMessage, sessionComplete }
}

export async function sendAudioMessage(
  payload: SendAudioPayload,
  signal?: AbortSignal,
  onTranscribed?: (transcript: string) => void,
): Promise<SendResult> {
  const current = await fetchMessages(payload.scenarioId)
  if (current.filter((message) => message.role === 'user').length >= scenarioFor(payload.scenarioId).turnCap) {
    throw new Error('This session is already complete.')
  }
  const transcript = payload.transcript || await transcribeAudio(payload.blob, signal)
  console.log('>>Transcribed audio:', transcript)
  signal?.throwIfAborted()
  onTranscribed?.(transcript)
  return sendMessage({ scenarioId: payload.scenarioId, content: transcript }, payload, signal)
}
