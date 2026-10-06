import styles from './Dashboard.module.css'

export default function About() {
  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <h1>About Claritas</h1>
        <p>
          Practice high-stakes workplace conversations in a safe AI role play.
          Choose a scenario, speak or type, and get a realistic counterpart.
        </p>
      </header>
    </section>
  )
}
