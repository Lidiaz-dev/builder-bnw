import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FACTION_COLOR, FORMATS, factionById, quickref } from '../data'
import { armyUnits, budget, destructionTotal, isValid, spent, type Army } from '../lib/army'
import { getArmy } from '../lib/storage'
import UnitCard, { InfantryCard } from '../components/UnitCard'
import FactionRules from '../components/FactionRules'
import { RuleBlocks } from '../components/RuleText'

export default function ArmySheetsPage() {
  const { id } = useParams()
  const [army, setArmy] = useState<Army | null | undefined>(undefined)
  const [withRules, setWithRules] = useState(true)
  const [withQuick, setWithQuick] = useState(true)

  useEffect(() => {
    getArmy(id!).then(setArmy)
  }, [id])

  if (army === undefined) return <p className="muted">Chargement…</p>
  if (!army) return <p>Liste introuvable.</p>
  const faction = factionById(army.factionId)!
  const units = armyUnits(army)

  return (
    <div className="sheets" style={{ ['--faction' as string]: FACTION_COLOR[faction.id] }}>
      <div className="row between wrap no-print sheets-bar">
        <Link to={`/listes/${army.id}`}>← Retour à la liste</Link>
        <label className="check">
          <input type="checkbox" checked={withRules} onChange={(e) => setWithRules(e.target.checked)} /> Règles de faction
        </label>
        <label className="check">
          <input type="checkbox" checked={withQuick} onChange={(e) => setWithQuick(e.target.checked)} /> Référence rapide
        </label>
        <button className="btn primary" onClick={() => window.print()}>
          Imprimer / PDF
        </button>
      </div>
      {!isValid(army) && <p className="error no-print">Attention : cette liste ne respecte pas les règles de recrutement.</p>}

      <header className="sheet-title">
        <h1>{army.name}</h1>
        <p>
          {faction.name} · {FORMATS[army.format].label} ({spent(army)}/{budget(army)} points, table {FORMATS[army.format].table}) ·{' '}
          {destructionTotal(army)} points de destruction en jeu
        </p>
      </header>

      <div className="sheet-cards">
        {units.map((u) => (
          <UnitCard
            key={u.key}
            faction={faction}
            profile={u.profile}
            badge={u.slot === 'commandant' ? 'Commandement' : u.reserve ? 'Réserve' : undefined}
          />
        ))}
        <InfantryCard faction={faction} />
      </div>

      {withRules && (
        <section className="sheet-section">
          <h2>Règles {faction.name}</h2>
          <FactionRules faction={faction} compact />
        </section>
      )}

      {withQuick && (
        <section className="sheet-section">
          <h2>Référence rapide</h2>
          <div className="quick-grid">
            {quickref.map((c) => (
              <div key={c.title} className="quick-card">
                <h4>{c.title}</h4>
                <RuleBlocks blocks={c.blocks} />
              </div>
            ))}
          </div>
        </section>
      )}

      {army.notes && (
        <section className="sheet-section">
          <h2>Notes</h2>
          <p className="pre">{army.notes}</p>
        </section>
      )}
    </div>
  )
}
