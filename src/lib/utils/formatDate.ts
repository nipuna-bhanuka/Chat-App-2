const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export function formatMessageTime(isoDate: string): string {
  return TIME_FORMATTER.format(new Date(isoDate))
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate)
  const today = new Date()

  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }

  return DAY_FORMATTER.format(date)
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
