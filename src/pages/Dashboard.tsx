import { useAuth } from '@/hooks/useAuth'
import { useScenarios } from '@/features/scenarios/hooks/useScenarios'
import { ScenarioCard } from '@/features/scenarios/components/ScenarioCard'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const { data } = useScenarios()

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <h1>Welcome, {user.firstName}!</h1>
        <p>Choose a scenario to start your AI role play session.</p>
      </header>
      <div className={styles.grid}>
        {data.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </section>
  )
}
