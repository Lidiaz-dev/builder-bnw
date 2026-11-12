import { SLOT_LABEL, skillById, type ExampleProfile, type UnitProfile } from '../data'

const MOVE: Record<string, string> = { S: '3"', M: '6"', L: '12"' }

/** Fiche de profil d'une unité, telle que dans les PDF « Profils ». */
export default function UnitCard({
  faction,
  profile,
  badge,
  compact,
}: {
  faction: { name: string }
  profile: UnitProfile | ExampleProfile
  badge?: string
  compact?: boolean
}) {
  const p = profile
  const hp = p.def.length
  return (
    <article className={`unit-card${compact ? ' compact' : ''}`}>
      <header>
        <div>
          <span className="unit-faction">{faction.name}</span>
          <h3>{p.slot ? SLOT_LABEL[p.slot] : p.title}</h3>
        </div>
        <div className="unit-tags">
          {badge && <span className="pill accent">{badge}</span>}
          <span className="pill">{p.size}</span>
          <span className="pill">{p.type === 'Air' ? 'Aérien' : 'Sol'}</span>
          <span className="pill" title="Nombre de socles maximum de l'unité">
            {p.models} socle{p.models > 1 ? 's' : ''}
          </span>
        </div>
      </header>

      <dl className="stat-line">
        <div>
          <dt>Mouv.</dt>
          <dd title={MOVE[p.move] ? `Réglette ${p.move} = ${MOVE[p.move]}` : undefined}>{p.move}</dd>
        </div>
        <div className="wide">
          <dt>Défense</dt>
          <dd title={`${hp} point${hp > 1 ? 's' : ''} de vie par socle`}>{p.def.join(' + ')}</dd>
        </div>
        <div>
          <dt>Bouclier</dt>
          <dd>{p.shield}</dd>
        </div>
        <div>
          <dt>ZAR</dt>
          <dd>{p.zar}</dd>
        </div>
        <div className="wide">
          <dt title="Puissance adaptative Armes / Moteurs / Boucliers">A/M/B</dt>
          <dd>
            {p.power.A}/{p.power.M}/{p.power.B}
          </dd>
        </div>
        <div>
          <dt title="Points de destruction">Destr.</dt>
          <dd>{p.destruction}</dd>
        </div>
      </dl>

      {p.weapons.length > 0 ? (
        <table className="weapons">
          <thead>
            <tr>
              <th>Arme</th>
              <th>Bonus</th>
              <th>Arc</th>
              <th className="num">Portée</th>
              <th className="num">Tirs</th>
            </tr>
          </thead>
          <tbody>
            {p.weapons.map((w, i) => {
              const skill = skillById(w.bonus)
              return (
                <tr key={i}>
                  <td>{w.name}</td>
                  <td>{w.bonusLabel ? <span className="skill" title={skill ? `${skill.name} : ${skill.text}` : undefined}>{skill?.name ?? w.bonusLabel}</span> : '–'}</td>
                  <td>{w.arc}</td>
                  <td className="num">{w.range}"</td>
                  <td className="num">{w.shots}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="muted small">Aucune arme de tir.</p>
      )}

      {p.rules.length > 0 && (
        <ul className="unit-rules">
          {p.rules.map((r) => (
            <li key={r.name}>
              <strong>{r.name} :</strong> {r.text}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/** Profil de l'infanterie de la faction (placée dans les terrains). */
export function InfantryCard({ faction }: { faction: { name: string; infantry: { def: number; shield: number; zar: number } } }) {
  const i = faction.infantry
  return (
    <article className="unit-card infantry">
      <header>
        <div>
          <span className="unit-faction">{faction.name}</span>
          <h3>Infanterie</h3>
        </div>
        <div className="unit-tags">
          <span className="pill">Dans les terrains</span>
        </div>
      </header>
      <dl className="stat-line">
        <div>
          <dt>DEF</dt>
          <dd>{i.def}</dd>
        </div>
        <div>
          <dt>Bouclier</dt>
          <dd>{i.shield}</dd>
        </div>
        <div>
          <dt>ZAR</dt>
          <dd>{i.zar}</dd>
        </div>
      </dl>
      <p className="muted small">Prise de position : 1 + 4D (nombre de réussites) dans un terrain à S.</p>
    </article>
  )
}
