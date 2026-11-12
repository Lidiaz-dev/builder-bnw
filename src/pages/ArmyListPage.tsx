import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FACTION_COLOR, FORMATS, factionById, factions, type FormatId } from '../data'
import { budget, isValid, newArmy, spent, type Army } from '../lib/army'
import { deleteArmy, listArmies, localArmies, moveLocalArmiesToAccount, saveArmy } from '../lib/storage'

export default function ArmyListPage() {
  const navigate = useNavigate()
  const [armies, setArmies] = useState<Army[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [factionId, setFactionId] = useState(factions[0].id)
  const [format, setFormat] = useState<FormatId>('engagement')
  const [name, setName] = useState('')
  const [pendingLocal, setPendingLocal] = useState(() => localArmies().length)

  const reload = () =>
    listArmies()
      .then(setArmies)
      .catch((e: Error) => setError(e.message))

  useEffect(() => {
    reload()
  }, [])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    const f = factionById(factionId)!
    const army = await saveArmy(newArmy(factionId, format, name || `${f.name} – ${FORMATS[format].label}`))
    navigate(`/listes/${army.id}`)
  }

  const remove = async (a: Army) => {
    if (!confirm(`Supprimer la liste « ${a.name} » ? Cette action est définitive.`)) return
    await deleteArmy(a.id)
    reload()
  }

  const duplicate = async (a: Army) => {
    await saveArmy({ ...a, id: crypto.randomUUID(), name: `${a.name} (copie)` })
    reload()
  }

  return (
    <div className="stack-lg">
      <h1>Listes d'armée</h1>

      {pendingLocal > 0 && (
        <div className="notice row between wrap">
          <span>
            {pendingLocal} liste{pendingLocal > 1 ? 's' : ''} créée{pendingLocal > 1 ? 's' : ''} sur ce navigateur avant la
            connexion.
          </span>
          <button
            className="btn small"
            onClick={async () => {
              await moveLocalArmiesToAccount()
              setPendingLocal(0)
              reload()
            }}
          >
            Les ajouter à mon compte
          </button>
        </div>
      )}

      <form className="card new-army" onSubmit={create}>
        <h2>Nouvelle liste</h2>
        <div className="faction-pick">
          {factions.map((f) => (
            <label key={f.id} className={`faction-choice${factionId === f.id ? ' on' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[f.id] }}>
              <input type="radio" name="faction" value={f.id} checked={factionId === f.id} onChange={() => setFactionId(f.id)} />
              <strong>{f.name}</strong>
              <span className="small muted">{f.factionPower}</span>
            </label>
          ))}
        </div>
        <div className="row wrap align-end">
          <label>
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as FormatId)}>
              {(Object.keys(FORMATS) as FormatId[]).map((k) => (
                <option key={k} value={k}>
                  {FORMATS[k].label} — {FORMATS[k].points} points, {FORMATS[k].table}
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            Nom (facultatif)
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Convoi du désert, Ruche 7…" maxLength={60} />
          </label>
          <button className="btn primary">Créer</button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {armies === null ? (
        <p className="muted">Chargement…</p>
      ) : armies.length === 0 ? (
        <p className="muted">Aucune liste pour l'instant.</p>
      ) : (
        <ul className="army-list">
          {armies.map((a) => {
            const f = factionById(a.factionId)
            const ok = isValid(a)
            return (
              <li key={a.id} className="card army-row" style={{ ['--faction' as string]: FACTION_COLOR[a.factionId] }}>
                <Link to={`/listes/${a.id}`} className="army-main">
                  <strong>{a.name}</strong>
                  <span className="small muted">
                    {f?.name} · {FORMATS[a.format].label} · {spent(a)}/{budget(a)} points
                  </span>
                </Link>
                <span className={`pill ${ok && spent(a) === budget(a) ? 'ok' : ok ? '' : 'bad'}`}>
                  {!ok ? 'Invalide' : spent(a) === budget(a) ? 'Complète' : 'En cours'}
                </span>
                <div className="row">
                  <Link className="btn small ghost" to={`/listes/${a.id}/fiches`}>
                    Fiches
                  </Link>
                  <button className="btn small ghost" onClick={() => duplicate(a)}>
                    Dupliquer
                  </button>
                  <button className="btn small ghost danger" onClick={() => remove(a)}>
                    Supprimer
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
