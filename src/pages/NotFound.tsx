import { Link } from 'react-router-dom'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <section className={styles.page}>
      <p>404</p>
      <h1>This page does not exist</h1>
      <Link to="/">Return to scenarios</Link>
    </section>
  )
}
