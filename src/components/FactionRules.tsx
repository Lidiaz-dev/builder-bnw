import type { Faction } from '../data'

/** Pouvoir de faction, pouvoir de colosse, règles spéciales et tableaux (drops, contamination…). */
export default function FactionRules({ faction, compact }: { faction: Faction; compact?: boolean }) {
  return (
    <div className={`faction-rules${compact ? ' compact' : ''}`}>
      <div className="power-grid">
        <section className="power">
          <h4>Pouvoir de faction</h4>
          <p>{faction.factionPower}</p>
          <p className="muted small">Déclenché à chaque fois que le joueur gagne des points de scénario.</p>
        </section>
        <section className="power">
          <h4>Pouvoir de colosse</h4>
          <p>{faction.colossusPower}</p>
          <p className="muted small">Le colosse arrive à L du bord de table allié quand le premier objectif est scoré.</p>
        </section>
      </div>
      {(faction.specialIntro || faction.specialRules.length > 0) && <h4>Règles spéciales</h4>}
      {faction.specialIntro && <p>{faction.specialIntro}</p>}
      <dl className="special-rules">
        {faction.specialRules.map((r) => (
          <div key={r.name}>
            <dt>{r.name}</dt>
            <dd>
              {r.text.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {faction.tables.map((t, i) => (
        <div className="table-wrap" key={i}>
          <table className="rule-table">
            <thead>
              <tr>
                {t.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k} className={k === 0 ? 'num' : undefined}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
