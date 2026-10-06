export async function aiRequest<T>(path: string, body: Blob | object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': body instanceof Blob ? body.type : 'application/json' },
    body: body instanceof Blob ? body : JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90000)]) : AbortSignal.timeout(90000),
  })
  console.log('>>AI API response:', response);
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error || 'The request failed. Please retry.')
  if (!result) throw new Error('The server returned an unreadable response. Please retry.')
  return result as T
}

export async function transcribeAudio(blob: Blob, signal?: AbortSignal) {
  console.log('>>Transcribing audio blob:', blob, signal);
  if (!blob.size) throw new Error('The recording is empty. Please record again.')
  if (blob.size > 8 * 1024 * 1024) throw new Error('The recording is too large. Please record a shorter message.')
  const result = await aiRequest<{ transcript: string }>('/api/transcribe', blob, signal)
console.log('>>Transcription result:', result)
  if (typeof result.transcript !== 'string' || !result.transcript.trim()) {
    throw new Error('No clear speech was detected. Please record again.')
  }
  return result.transcript.trim()
}
