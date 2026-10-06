import { useNavigate, useParams } from 'react-router-dom'
import { useChat } from '@/features/chat/hooks/useChat'
import { useScenario } from '@/features/scenarios/hooks/useScenario'
import { ChatHeader } from '@/features/chat/components/ChatHeader'
import { CharacterPanel } from '@/features/chat/components/CharacterPanel'
import { MessageInput } from '@/features/chat/components/MessageInput'
import { MessageList } from '@/features/chat/components/MessageList'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/Button'
import styles from './ChatPage.module.css'

export default function ChatPage() {
  const { scenarioId = '' } = useParams()
  const navigate = useNavigate()
  const { data: scenario } = useScenario(scenarioId)
  const chat = useChat(scenarioId)

  if (!scenarioId) {
    return (
      <div className={styles.fullscreen}>
        <ErrorState
          title="Scenario unavailable"
          message="We could not find that role play."
          action={<Button onClick={() => navigate('/')}>Back to scenarios</Button>}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <ChatHeader
        scenario={scenario}
        turnsUsed={chat.turnsUsed}
        onEndSession={() => {
          chat.endSession()
          navigate('/')
        }}
      />
      <div className={styles.body}>
        <CharacterPanel character={scenario.character} />
        <section className={styles.thread} aria-label="Conversation">
          <MessageList
            className={styles.transcript}
            messages={chat.messages}
            scenario={scenario}
            learnerName={scenario.learnerName}
          />
          {chat.error ? <p className={styles.inlineError}>{chat.error.message}</p> : null}
          {chat.isComplete ? (
            <p className={styles.complete}>Session complete. The temporary transcript has been cleared.</p>
          ) : null}
          <MessageInput
            key={scenarioId}
            stage={chat.stage}
            disabled={chat.isSending || chat.isComplete}
            onSendText={chat.sendText}
            onSendAudio={chat.sendAudio}
          />
        </section>
      </div>
    </div>
  )
}
