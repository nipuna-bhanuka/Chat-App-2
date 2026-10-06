import { Link } from 'react-router-dom'
import type { Scenario } from '@/features/scenarios/types/scenario'
import { DifficultyDot, Tag } from '@/components/ui/Tag'

// export function ScenarioCard({ scenario }: ScenarioCardProps) {
//   const Icon = ACCENT_ICON[scenario.accent]

//   return (
//     <article className={styles.card}>
//       <div className={`${styles.icon} ${styles[scenario.accent]}`}>
//         <Icon width={20} height={20} />
//       </div>
//       <h3>{scenario.title}</h3>
//       <Badge tone={scenario.accent}>{scenario.categoryLabel}</Badge>
//       <p>{scenario.description}</p>
//       <div className={styles.meta}>
//         <span>
//           <BriefcaseIcon width={14} height={14} />
//           {scenario.skills[0]}
//         </span>
//         <span>
//           <WaveIcon width={14} height={14} />
//           {scenario.skills[1]}
//         </span>
//         <Link to={`/chat/${scenario.id}`} className={styles.cta} aria-label={`Start ${scenario.title}`}>
//           <ArrowRightIcon width={16} height={16} />
//         </Link>
//       </div>
//     </article>
//   )
// }


export function ScenarioCard({ scenario: s }: { scenario: Scenario }) {
  return (
    <Link
      to={`/scenarios/${s.id}`}
      className="group flex h-full flex-col gap-4 rounded-2xl border border-line bg-white p-[22px] text-inherit no-underline shadow-[0_1px_2px_rgba(16,24,40,.04)] transition duration-200 hover:-translate-y-1 hover:border-[#D5D9E4] hover:shadow-[0_14px_30px_-10px_rgba(16,24,40,.18)] focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="flex flex-wrap gap-1.5">
        <Tag>{s.type}</Tag>
      </div>
      <h3 className="m-0 text-[19px] leading-snug font-bold tracking-tight text-balance text-ink">{s.title}</h3>
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-ink">{s.character.name}</div>
          <div className="text-[13px] leading-snug text-muted">
            {s.character.title}
          </div>
        </div>
      </div>
      <p className="m-0 line-clamp-2 text-sm leading-relaxed text-[#475467]">{s.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-line-soft pt-3.5 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <DifficultyDot level={s.difficulty} />
          {s.difficulty}
        </span>
        <span>10 turns</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1">
          Start <strong className="text-bad">{s.persona.metrics.startScore}</strong> → Target <strong className="text-good-ink">≤{s.persona.metrics.targetBoundary}</strong>
        </span>
      </div>
    </Link>
  );
}