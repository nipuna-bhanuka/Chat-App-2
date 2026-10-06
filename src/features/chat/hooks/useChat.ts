import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage, VoiceRecording } from '@/features/chat/types/chat'
import { invalidateApiCache, useApi } from '@/hooks/useApi'
import { clearMessages, fetchMessages, sendAudioMessage, sendTextMessage } from '@/services/chatService'

type SessionState = { scenarioId: string; messages: ChatMessage[] | null }
type SendStage = 'idle' | 'transcribing' | 'responding'

function safeError(error: unknown) {
  if (!(error instanceof Error)) return new Error('The message could not be sent. Please retry.')
  if (error.name === 'TimeoutError') return new Error('The request timed out. Your recording is available to retry.')
  if (error.message.includes('"error"') || error.message.includes('{')) return new Error('The message could not be sent. Please retry.')
  return error
}

export function useChat(scenarioId: string) {
  const { data: serverMessages } = useApi(() => fetchMessages(scenarioId), `chat:${scenarioId}`)
  const [session, setSession] = useState<SessionState>({ scenarioId, messages: null })
  const [stage, setStage] = useState<SendStage>('idle')
  const [isComplete, setIsComplete] = useState(false)
  const [sendError, setSendError] = useState<Error | null>(null)
  const active = useRef<AbortController | null>(null)
  const completed = useRef(false)

  useEffect(() => {
    completed.current = false
    return () => {
      invalidateApiCache(`chat:${scenarioId}`)
      active.current?.abort()
      active.current = null
      if (completed.current) clearMessages(scenarioId)
    }
  }, [scenarioId])

  if (session.scenarioId !== scenarioId) {
    setSession({ scenarioId, messages: null })
    setIsComplete(false)
    setStage('idle')
    setSendError(null)
  }

  const messages = session.messages ?? serverMessages
  const turnsUsed = messages.filter((message) => message.role === 'user').length

  const send = useCallback(async (input: string | VoiceRecording): Promise<boolean> => {
    if (active.current || completed.current || isComplete) return false
    if (typeof input === 'string' && !input.trim()) return false
    const controller = new AbortController()
    active.current = controller
    setStage(typeof input === 'string' || input.transcript ? 'responding' : 'transcribing')
    setSendError(null)
    try {
      const result = typeof input === 'string'
        ? await sendTextMessage({ scenarioId, content: input.trim() }, controller.signal)
        : await sendAudioMessage({ scenarioId, ...input }, controller.signal, (transcript) => {
            // Cache a successful transcript on the retained draft so a chat retry needn't transcribe again.
            input.transcript = transcript
            if (!controller.signal.aborted) setStage('responding')
          })
      controller.signal.throwIfAborted()
      setSession((current) => ({ scenarioId, messages: [
        ...(current.messages ?? serverMessages), result.userMessage, result.assistantMessage,
      ] }))
      completed.current = result.sessionComplete
      setIsComplete(result.sessionComplete)
      return true
    } catch (reason) {
      if (!controller.signal.aborted) setSendError(safeError(reason))
      return false
    } finally {
      if (active.current === controller) {
        active.current = null
        setStage('idle')
      }
    }
  }, [isComplete, scenarioId, serverMessages])

  const endSession = useCallback(() => {
    active.current?.abort()
    active.current = null
    completed.current = true
    clearMessages(scenarioId)
    setSession({ scenarioId, messages: serverMessages[0] ? [serverMessages[0]] : [] })
    setStage('idle')
    setIsComplete(true)
  }, [scenarioId, serverMessages])

  return { messages, error: sendError, isSending: stage !== 'idle', stage, isComplete, turnsUsed,
    sendText: send, sendAudio: send, endSession }
}
