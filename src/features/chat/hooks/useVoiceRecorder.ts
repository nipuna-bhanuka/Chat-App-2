import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceRecording } from '@/features/chat/types/chat'

const MAX_SECONDS = 120
const MAX_BYTES = 8 * 1024 * 1024
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
type Status = 'idle' | 'requesting' | 'recording' | 'stopping'

export function useVoiceRecorder() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState<VoiceRecording | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const phase = useRef<Status>('idle')
  const generation = useRef(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const release = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const recorder = recorderRef.current
    if (recorder) {
      recorder.ondataavailable = recorder.onstop = recorder.onerror = null
      if (recorder.state !== 'inactive') recorder.stop()
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const cancel = useCallback(() => {
    generation.current += 1
    release()
    phase.current = 'idle'
    setStatus('idle')
    setRecording(null)
    setElapsed(0)
    setError(null)
  }, [release])

  useEffect(() => () => {
    generation.current += 1
    release()
  }, [release])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (phase.current !== 'recording' || !recorder || recorder.state === 'inactive') return
    phase.current = 'stopping'
    setStatus('stopping')
    if (timerRef.current) clearInterval(timerRef.current)
    recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (phase.current !== 'idle') return
    setError(null)
    setRecording(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording requires a supported browser and HTTPS (or localhost). You can still type a message.')
      return
    }
    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) { setError('This browser cannot record a supported audio format. You can still type a message.'); return }
    const token = ++generation.current
    phase.current = 'requesting'
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (generation.current !== token) { stream.getTracks().forEach((track) => track.stop()); return }
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 })
      recorderRef.current = recorder
      const chunks: Blob[] = []
      let bytes = 0
      let failed = false
      const startedAt = Date.now()
      const fail = (message: string) => {
        failed = true
        release()
        phase.current = 'idle'
        setStatus('idle')
        setError(message)
      }
      recorder.ondataavailable = (event) => {
        if (event.data.size) { chunks.push(event.data); bytes += event.data.size }
        if (bytes > MAX_BYTES) fail('The recording is too large. Please record a shorter message.')
      }
      recorder.onerror = () => fail('Recording was interrupted. Please check your microphone and record again.')
      recorder.onstop = () => {
        if (generation.current !== token || failed) return
        const durationSeconds = Math.min(MAX_SECONDS, (Date.now() - startedAt) / 1000)
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType })
        release()
        phase.current = 'idle'
        setStatus('idle')
        if (!blob.size || durationSeconds < 0.3) { setError('The recording was too short. Please record again.'); return }
        setRecording({ blob, mimeType: blob.type, durationSeconds })
      }
      recorder.start(1000)
      phase.current = 'recording'
      setStatus('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000)
        setElapsed(seconds)
        if (seconds >= MAX_SECONDS) stop()
      }, 250)
    } catch (reason) {
      if (generation.current !== token) return
      release()
      phase.current = 'idle'
      setStatus('idle')
      setError(reason instanceof DOMException && reason.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow microphone access or type a message.'
        : 'Could not start the microphone. Check that it is connected and available.')
    }
  }, [release, stop])

  return { status, isRecording: status === 'recording', error, recording, elapsed, start, stop, cancel }
}
