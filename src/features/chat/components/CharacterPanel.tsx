import type { ScenarioCharacter } from '@/features/scenarios/types/scenario'
import { Avatar } from '@/components/ui/Avatar'
import { BuildingIcon, PinIcon, WaveIcon } from '@/components/ui/icons'
import styles from './CharacterPanel.module.css'

type CharacterPanelProps = {
  character: ScenarioCharacter
}

export function CharacterPanel({ character }: CharacterPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.person}>
        <Avatar name={character.name} src={character.avatarUrl} size="lg" />
        <div>
          <h2>{character.name}</h2>
          <p>{character.role}</p>
          <span className={styles.online}>
            <i /> Online
          </span>
        </div>
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>
            <BuildingIcon width={14} height={14} />
            Organisation
          </dt>
          <dd>{character.organization}</dd>
        </div>
        <div>
          <dt>
            <PinIcon width={14} height={14} />
            Location
          </dt>
          <dd>{character.location}</dd>
        </div>
        <div>
          <dt>
            <WaveIcon width={14} height={14} />
            Tone
          </dt>
          <dd>{character.tone}</dd>
        </div>
      </dl>
    </aside>
  )
}
