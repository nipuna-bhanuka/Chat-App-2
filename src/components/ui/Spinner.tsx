import type { ReactNode } from 'react'
import styles from './Spinner.module.css'

type SpinnerProps = {
  label?: ReactNode
}

export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return (
    <div className={styles.wrap} role="status">
      <span className={styles.spinner} />
      <span>{label}</span>
    </div>
  )
}
