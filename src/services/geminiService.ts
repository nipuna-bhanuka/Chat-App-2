import type { Content } from '@google/genai'
import { aiRequest } from './aiApi'
import type { ChatMessage } from '@/features/chat/types/chat'
import type { PersonaConfig, PersonaTrap } from '@/features/scenarios/types/scenario'

type CharacterTurn = {
  reply: string
  frictionDelta?: number
  reason?: string
  trapsTriggered?: string[]
  critique?: unknown
  resolved?: boolean
}

export function compileSystemPrompt(cfg: PersonaConfig) {
  const c = cfg.character
  const traps = Object.entries(cfg.traps)
    .map(([key, trap]: [string, PersonaTrap]) => (
      `- ${trap.name} (id: ${key}, penalty ${trap.penalty}): ${trap.description}`
    ))
    .join('\n')

  return `You are playing a character in a professional English training simulation. Stay in character at all times. Never mention that you are an AI, a simulation, or a language exercise.

CHARACTER
Name: ${c.name}
Role: ${c.title}
Background: ${c.background}
Tone: ${c.tone}
Language style: ${c.languageStyle}
Core belief driving this conversation: ${c.coreBelief}

SITUATION
The learner is playing Amila, a professional speaking with you. Scenario objective (for your reference, never state it): ${cfg.objective}

INTERNAL STATE - "${cfg.metrics.name}", scale 0-100.
It rises when: ${cfg.metrics.rules.increase}
It falls when: ${cfg.metrics.rules.decrease}

TRAPS to watch for in what the learner says:
${traps}

CONVERSATION SHAPE
Phase 1 - the objection. Your opening line is fixed.
Phase 2 - the deep dive. Challenge, press, do not accept vague reassurance. If they hit a trap, push back in character exactly as your background dictates.
Phase 3 - alignment. Only once they have genuinely met the objective across at least two substantive turns, accept, warm noticeably, and propose a concrete next step. Set "resolved": true on that turn.

RULES
- Keep every reply under three sentences. Conversational, realistic, never a lecture.
- Do not coach the learner. You are the counterparty, not the teacher.
- Do not reward effort. Reward substance.
- If the learner writes something empty, evasive or off-topic, react as this character actually would.

OUTPUT FORMAT
Reply with a single JSON object and nothing else. No prose before or after, no markdown fences.
{
  "reply": "your in-character dialogue",
  "frictionDelta": <integer between -30 and 25; negative means friction fell>,
  "reason": "<8 words or fewer on why the score moved>",
  "trapsTriggered": [<trap ids from the list above, or empty array>],
  "critique": {
    "verdict": "penalty" | "neutral" | "strong",
    "note": "<one sentence, addressed to the learner, on what their phrasing did in this room>",
    "upgrade": "<if verdict is penalty, a better version of their line in their voice; otherwise null>"
  },
  "resolved": <true only when Phase 3 is reached>
}`
}

function parseJSON(text: string): CharacterTurn | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleaned) as CharacterTurn
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end <= start) {
      return null
    }
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as CharacterTurn
    } catch {
      return null
    }
  }
}

function toGeminiContents(messages: ChatMessage[]): Content[] {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.role === 'assistant' ? JSON.stringify({ reply: message.content }) : message.content }],
  }))
}

export async function callGemini(cfg: PersonaConfig, messages: ChatMessage[], signal?: AbortSignal) {
  const response = await aiRequest<{ text: string }>('/api/chat', {
    contents: toGeminiContents(messages),
    systemInstruction: compileSystemPrompt(cfg),
  }, signal)
  const parsed = parseJSON(response.text ?? '')
  if (!parsed?.reply) throw new Error('Unreadable response from Gemini. Please retry.')
  return parsed
}

function base64ToBytes(base64: string) {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function pcmToWavDataUrl(pcmBase64: string, sampleRate = 24000) {
  const pcm = base64ToBytes(pcmBase64)
  const header = 44
  const buffer = new ArrayBuffer(header + pcm.length)
  const view = new DataView(buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcm.length, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcm.length, true)
  new Uint8Array(buffer, header).set(pcm)
  const wavBytes = new Uint8Array(buffer)
  let binary = ''
  wavBytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return `data:audio/wav;base64,${window.btoa(binary)}`
}

export async function synthesizeSpeech(text: string, signal?: AbortSignal) {
  try {
    const { data } = await aiRequest<{ data: string }>('/api/speech', { text }, signal)
    return pcmToWavDataUrl(data)
  } catch {
    signal?.throwIfAborted()
    return undefined
  }
}
