import type { ChatMessage } from '@/features/chat/types/chat'
import type { Scenario } from '@/features/scenarios/types/scenario'
import { formatDayLabel, formatMessageTime } from '@/lib/utils/formatDate'
import { Avatar } from '@/components/ui/Avatar'
import { AudioPlayer } from './AudioPlayer'
import styles from './MessageList.module.css'

type MessageListProps = {
  className?: string
  messages: ChatMessage[]
  scenario: Scenario
  learnerName: string
}

export function MessageList({ messages, scenario, learnerName, className }: MessageListProps) {
  const firstStamp = messages[0]?.createdAt

  const setEndRef = (node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={[styles.list, className].filter(Boolean).join(' ')}>
      {firstStamp ? <p className={styles.day}>{formatDayLabel(firstStamp)}</p> : null}
      {messages.map((message) => {
        const isUser = message.role === 'user'
        return (
          <div
            key={message.id}
            className={`${styles.row} ${isUser ? styles.user : styles.assistant}`}
          >
            {!isUser ? (
              <Avatar name={scenario.character.name} src={scenario.character.avatarUrl} size="sm" />
            ) : null}
            <div className={styles.bubbleWrap}>
              <div className={`${styles.bubble} ${message.kind === 'audio' ? styles.audio : ''}`}>
                <p>{message.content}</p>
                {message.audioUrl || message.audioId ? (
                  <AudioPlayer
                    src={message.audioUrl}
                    audioId={message.audioId}
                    durationSeconds={message.durationSeconds ?? 0}
                  />
                ) : null}
              </div>
              <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
            </div>
            {isUser ? <Avatar name={learnerName} size="sm" /> : null}
          </div>
        )
      })}
      <div ref={setEndRef} />
    </div>
  )
}
