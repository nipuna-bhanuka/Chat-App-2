import { Link } from 'react-router-dom'
import type { Scenario } from '@/features/scenarios/types/scenario'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowLeftIcon, PrintIcon } from '@/components/ui/icons'
import styles from './ChatHeader.module.css'

type ChatHeaderProps = {
  scenario: Scenario
  turnsUsed: number
  onEndSession: () => void
}

export function ChatHeader({ scenario, turnsUsed, onEndSession }: ChatHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <Link to="/" className={styles.back} aria-label="Back to scenarios">
          <ArrowLeftIcon width={18} height={18} />
        </Link>
        <div>
          <h1>{scenario.title}</h1>
          <div className={styles.meta}>
            <Badge tone={scenario.accent}>{scenario.categoryLabel}</Badge>
            <span>{turnsUsed}/{scenario.turnCap} turns</span>
          </div>
        </div>
      </div>
      <div className={styles.actions}>
        <Button
          variant="icon"
          aria-label="Print conversation"
          title="Print conversation"
          onClick={() => window.print()}
        >
          <PrintIcon width={18} height={18} aria-hidden="true" />
        </Button>
        <Button variant="danger" onClick={onEndSession}>
          End Session
        </Button>
      </div>
    </header>
  )
}
