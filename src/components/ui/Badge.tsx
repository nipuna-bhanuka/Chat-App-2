import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeTone = 'blue' | 'orange' | 'green' | 'purple' | 'neutral'

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
