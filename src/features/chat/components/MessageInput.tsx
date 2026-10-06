import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useVoiceRecorder } from '@/features/chat/hooks/useVoiceRecorder'
import type { VoiceRecording } from '@/features/chat/types/chat'
import { Button } from '@/components/ui/Button'
import { MicIcon, SendIcon, StopIcon } from '@/components/ui/icons'
import styles from './MessageInput.module.css'

type MessageInputProps = {
  disabled?: boolean
  stage: 'idle' | 'transcribing' | 'responding'
  onSendText: (content: string) => Promise<boolean>
  onSendAudio: (recording: VoiceRecording) => Promise<boolean>
}

export function MessageInput({ disabled, stage, onSendText, onSendAudio }: MessageInputProps) {
  const [value, setValue] = useState('')
  const previewRef = useRef<HTMLAudioElement | null>(null)
  const recorder = useVoiceRecorder()
  const attempted = useRef<VoiceRecording | null>(null)
  const submitting = useRef(false)
  const { recording, cancel } = recorder

  useEffect(() => {
    if (!recording || !previewRef.current) return
    const url = URL.createObjectURL(recording.blob)
    previewRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [recording])

  useEffect(() => {
    if (!recording || disabled || attempted.current === recording) return
    attempted.current = recording
    submitting.current = true
    void onSendAudio(recording).then((sent) => { if (sent) cancel() }).finally(() => { submitting.current = false })
  }, [recording, disabled, onSendAudio, cancel])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = value.trim()
    if (!next || disabled || submitting.current || recorder.status !== 'idle' || recording) return
    submitting.current = true
    try { if (await onSendText(next)) setValue('') } finally { submitting.current = false }
  }

  const retry = async () => {
    if (!recording || disabled || submitting.current) return
    submitting.current = true
    try { if (await onSendAudio(recording)) cancel() } finally { submitting.current = false }
  }

  const busyRecording = recorder.status !== 'idle'
  const statusText = stage === 'transcribing' ? 'Transcribing your recording…'
    : stage === 'responding' ? 'Waiting for the character’s reply…'
      : recorder.status === 'requesting' ? 'Waiting for microphone permission…'
        : recorder.status === 'stopping' ? 'Preparing your recording…'
          : recorder.isRecording ? `Recording ${recorder.elapsed}s / 120s. Tap stop to send.` : ''

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
      <Button variant="icon" aria-label={recorder.isRecording ? 'Stop recording' : 'Record voice message'}
        aria-pressed={recorder.isRecording}
        disabled={disabled || !!recording || recorder.status === 'requesting' || recorder.status === 'stopping'}
        onClick={() => recorder.isRecording ? recorder.stop() : void recorder.start()}
        className={recorder.isRecording ? styles.recording : undefined}>
        {recorder.isRecording ? <StopIcon /> : <MicIcon />}
      </Button>
      <label className={styles.field}>
        <span className={styles.srOnly}>Message</span>
        <input value={value} onChange={(event) => setValue(event.target.value)}
          placeholder={recorder.isRecording ? 'Recording… tap stop to send' : 'Type a message...'}
          disabled={disabled || busyRecording || !!recording} />
      </label>
      <Button variant="icon" type="submit" aria-label="Send message"
        disabled={disabled || busyRecording || !!recording || !value.trim()}><SendIcon /></Button>
      {statusText ? <p className={styles.status} role="status">{statusText}</p> : null}
      {busyRecording ? <Button variant="ghost" onClick={cancel}>Cancel recording</Button> : null}
      {recording ? (
        <div className={styles.draft}>
          <audio ref={previewRef} controls aria-label="Your recorded message" />
          {!disabled ? <>
            <p>Your recording is ready to retry, or you can discard it and record again.</p>
            <Button onClick={() => void retry()}>Retry voice message</Button>
            <Button variant="ghost" onClick={cancel}>Discard recording</Button>
          </> : null}
        </div>
      ) : null}
      {recorder.error ? <p className={styles.error} role="alert">{recorder.error}</p> : null}
    </form>
  )
}
