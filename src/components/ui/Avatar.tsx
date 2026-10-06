import { getInitials } from '@/lib/utils/helpers'
import styles from './Avatar.module.css'

type AvatarProps = {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  return (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden={!src}>
      {src ? <img src={src} alt="" /> : getInitials(name)}
    </span>
  )
}
