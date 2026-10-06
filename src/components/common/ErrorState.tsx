import type { ReactNode } from 'react'
import styles from './ErrorState.module.css'

type ErrorStateProps = {
  title?: string
  message: string
  action?: ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: ErrorStateProps) {
  return (
    <div className={styles.wrap} role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  )
}
