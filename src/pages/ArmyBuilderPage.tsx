import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FACTION_COLOR, FORMATS, SLOT_LABEL, factionById, nodeById, type FormatId } from '../data'
import { armyUnits, budget, destructionTotal, modelCount, remaining, spent, toggleNode, validate, type Army } from '../lib/army'
import { getArmy, saveArmy } from '../lib/storage'
import RecruitTree from '../components/RecruitTree'
import UnitCard, { InfantryCard } from '../components/UnitCard'
import FactionRules from '../components/FactionRules'

export default function ArmyBuilderPage() {
  const { id } = useParams()
  const [army, setArmy] = useState<Army | null | undefined>(undefined)
  const [inspect, setInspect] = useState<string | null>('qg')
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const first = useRef(true)

  useEffect(() => {
    getArmy(id!).then(setArmy)
  }, [id])

  // Enregistrement automatique, regroupé pour ne pas écrire à chaque frappe.
  useEffect(() => {
    if (!army) return
    if (first.current) {
      first.current = false
      return
    }
    setStatus('saving')
    const t = setTimeout(() => {
      saveArmy(army)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'))
    }, 400)
    return () => clearTimeout(t)
  }, [army])

  if (army === undefined) return <p className="muted">Chargement…</p>
  if (army === null)
    return (
      <p>
        Liste introuvable. <Link to="/listes">Retour aux listes</Link>
      </p>
    )

  const faction = factionById(army.factionId)!
  const issues = validate(army)
  const units = armyUnits(army)
  const node = inspect && inspect !== 'qg' ? nodeById(inspect) : null

  const changeFormat = (format: FormatId) => {
    // Passer de 7 à 5 points : on retire les dernières unités recrutées (et la suite de leur ligne).
    let next: Army = { ...army, format }
    while (next.nodes.length > FORMATS[format].points) next = toggleNode(next, next.nodes[next.nodes.length - 1])
    setArmy(next)
  }

  return (
    <div className="builder" style={{ ['--faction' as string]: FACTION_COLOR[faction.id] }}>
      <div className="builder-head">
        <div className="grow">
          <input className="title-input" value={army.name} onChange={(e) => setArmy({ ...army, name: e.target.value })} aria-label="Nom de la liste" />
          <p className="muted small">
            {faction.name} · {units.length} unités ({modelCount(army)} socles) · {destructionTotal(army)} points de destruction en jeu ·{' '}
            <span className={status === 'error' ? 'error' : undefined}>
              {status === 'saving' ? 'Enregistrement…' : status === 'error' ? "Échec de l'enregistrement" : 'Enregistrée'}
            </span>
          </p>
        </div>
        <label>
          Format
          <select value={army.format} onChange={(e) => changeFormat(e.target.value as FormatId)}>
            {(Object.keys(FORMATS) as FormatId[]).map((k) => (
              <option key={k} value={k}>
                {FORMATS[k].label} ({FORMATS[k].points} pts)
              </option>
            ))}
          </select>
        </label>
        <div className={`points ${remaining(army) < 0 ? 'bad' : remaining(army) === 0 ? 'ok' : ''}`}>
          <strong>{spent(army)}</strong>/{budget(army)}
          <span>points</span>
        </div>
        <Link to={`/listes/${army.id}/fiches`} className="btn primary">
          Fiches à imprimer
        </Link>
      </div>

      <div className="builder-grid">
        <section className="card">
          <h2>Arbre de recrutement</h2>
          <p className="muted small">
            Chaque unité coûte 1 point. Une ligne s'ouvre par l'unité reliée au QG ; une unité plus loin ne se recrute que
            si la précédente l'est déjà. Chaque emplacement ne se prend qu'une fois.
          </p>
          <RecruitTree
            army={army}
            faction={faction}
            selected={inspect}
            onInspect={setInspect}
            onToggle={(nid) => {
              setArmy(toggleNode(army, nid))
              setInspect(nid)
            }}
          />
          <ul className="issues">
            {issues.map((i, k) => (
              <li key={k} className={i.level}>
                {i.text}
              </li>
            ))}
            {issues.every((i) => i.level !== 'error') && remaining(army) === 0 && <li className="ok">Liste complète et valide.</li>}
          </ul>
        </section>

        <aside className="inspector">
          {inspect === 'qg' || !node ? (
            <>
              <UnitCard faction={faction} profile={faction.units.commandant} badge="Véhicule de commandement" compact />
              <UnitCard faction={faction} profile={faction.units.colosse} badge="Arrive en cours de partie" compact />
            </>
          ) : (
            <UnitCard
              faction={faction}
              profile={faction.units[node.slot]}
              badge={army.nodes.includes(node.id) ? 'Recrutée' : undefined}
              compact
            />
          )}
        </aside>
      </div>

      <section className="card">
        <h2>Composition</h2>
        <table className="compo">
          <thead>
            <tr>
              <th>Unité</th>
              <th>Socles</th>
              <th>Taille</th>
              <th>Type</th>
              <th>Destr.</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.key}>
                <td>
                  {SLOT_LABEL[u.slot]}
                  {u.reserve && <span className="muted small"> — en réserve</span>}
                </td>
                <td>{u.profile.models}</td>
                <td>{u.profile.size}</td>
                <td>{u.profile.type === 'Air' ? 'Aérien' : 'Sol'}</td>
                <td>{u.profile.destruction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Règles de la faction</h2>
        <FactionRules faction={faction} />
        <h4>Infanterie</h4>
        <div className="cards-1">
          <InfantryCard faction={faction} />
        </div>
      </section>

      <section className="card">
        <h2>Notes</h2>
        <textarea
          rows={3}
          value={army.notes}
          onChange={(e) => setArmy({ ...army, notes: e.target.value })}
          placeholder="Peinture, tactique, rappels…"
        />
      </section>
    </div>
  )
}
