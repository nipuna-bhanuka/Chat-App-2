import { useEffect, useRef, useState } from 'react'
import { loadAudio } from '@/services/audioStorage'
import { formatDuration } from '@/lib/utils/formatDate'
import { PauseIcon, PlayIcon } from '@/components/ui/icons'
import styles from './AudioPlayer.module.css'

type AudioPlayerProps = {
  src?: string
  audioId?: string
  durationSeconds: number
}

const BARS = [
  { id: 'b1', height: 8 },
  { id: 'b2', height: 16 },
  { id: 'b3', height: 10 },
  { id: 'b4', height: 20 },
  { id: 'b5', height: 12 },
  { id: 'b6', height: 18 },
  { id: 'b7', height: 9 },
  { id: 'b8', height: 15 },
  { id: 'b9', height: 11 },
  { id: 'b10', height: 19 },
  { id: 'b11', height: 8 },
  { id: 'b12', height: 14 },
  { id: 'b13', height: 17 },
  { id: 'b14', height: 10 },
  { id: 'b15', height: 13 },
  { id: 'b16', height: 21 },
  { id: 'b17', height: 9 },
  { id: 'b18', height: 16 },
]

export function AudioPlayer({ src, audioId, durationSeconds }: AudioPlayerProps) {
  const [storedUrl, setStoredUrl] = useState<string>()
  const [playError, setPlayError] = useState<string | null>(null)
  const [actualDuration, setActualDuration] = useState(durationSeconds)
  const playbackUrl = src || storedUrl
  useEffect(() => {
    let disposed = false
    let objectUrl: string | undefined
    if (audioId) void loadAudio(audioId).then((blob) => {
      if (disposed) return
      if (!blob) { setPlayError('Recording is no longer available.'); return }
      objectUrl = URL.createObjectURL(blob)
      setStoredUrl(objectUrl)
    }).catch(() => { if (!disposed) setPlayError('Could not load the recording.') })
    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [audioId])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !playbackUrl) {
      return
    }

    const onTime = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : durationSeconds
      setProgress(duration ? audio.currentTime / duration : 0)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [durationSeconds, playbackUrl])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio || !playbackUrl) {
      return
    }
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlayError(null)
      setIsPlaying(true)
    } catch { setIsPlaying(false); setPlayError('Could not play this recording. Please try again.') }
  }

  return (
    <div className={styles.player}>
      {playbackUrl ? <audio ref={audioRef} src={playbackUrl} preload="metadata"
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration)) setActualDuration(event.currentTarget.duration)
        }} onError={() => { setIsPlaying(false); setPlayError('This recording could not be played.') }} /> : null}
      <button
        type="button"
        className={styles.play}
        onClick={() => void toggle()}
        disabled={!playbackUrl}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
      </button>
      <div className={styles.wave} aria-hidden="true">
        {BARS.map((bar, index) => (
          <span
            key={bar.id}
            className={index / BARS.length < progress ? styles.active : undefined}
            style={{ height: `${bar.height}px` }}
          />
        ))}
      </div>
      <span className={styles.time}>{formatDuration(Math.round(actualDuration))}</span>
      {playError ? <span role="alert">{playError}</span> : null}
    </div>
  )
}
