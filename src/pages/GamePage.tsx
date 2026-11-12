import { useEffect, useState } from 'react'
import { FACTION_COLOR, FORMATS, SLOT_LABEL, factionById, factions, type FormatId } from '../data'
import type { Army } from '../lib/army'
import { listArmies } from '../lib/storage'
import {
  PHASES,
  ROUNDS,
  SCENARIOS,
  activations,
  currentPhase,
  destructionPoints,
  energy,
  formatLabel,
  isCorpo,
  loadGame,
  newGame,
  newPlayer,
  nextPhase,
  patchPlayer,
  phasesOf,
  prevPhase,
  rollDice,
  scoreScenario,
  scoreZones,
  setPriority,
  spendDrops,
  storeGame,
  toggleDestroyed,
  unitsInPlay,
  victoryPoints,
  type GameState,
  type Roll,
  type ScenarioId,
} from '../lib/game'
import { armyUnits } from '../lib/army'

export default function GamePage() {
  const [game, setGame] = useState<GameState | null>(() => loadGame())
  const [reminders, setReminders] = useState<string[]>([])

  useEffect(() => storeGame(game), [game])

  if (!game) return <Setup onStart={setGame} />

  const apply = (r: { game: GameState; reminders: string[] }) => {
    setGame(r.game)
    if (r.reminders.length) setReminders(r.reminders)
  }

  return (
    <div className="game">
      <div className="row between wrap game-top">
        <div>
          <h1>
            Round {Math.min(game.round, ROUNDS)}
            <span className="muted"> / {ROUNDS}</span>
          </h1>
          <p className="muted small">{formatLabel(game)}</p>
        </div>
        <button
          className="btn ghost small danger"
          onClick={() => {
            if (confirm('Terminer et effacer cette partie ?')) setGame(null)
          }}
        >
          Nouvelle partie
        </button>
      </div>

      {reminders.length > 0 && (
        <div className="notice reminders">
          <ul>
            {reminders.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <button className="btn small" onClick={() => setReminders([])}>
            Compris
          </button>
        </div>
      )}

      <Scoreboard game={game} />
      <PhaseTracker game={game} setGame={setGame} onZones={(pts) => apply(scoreZones(game, pts))} />

      <div className="cards-2">
        {([0, 1] as const).map((i) => (
          <PlayerPanel key={i} game={game} i={i} setGame={setGame} onScore={(pts, label) => apply(scoreScenario(game, i, pts, label))} />
        ))}
      </div>

      <DiceRoller />

      <section className="card">
        <h2>Journal</h2>
        {game.log.length === 0 ? (
          <p className="muted small">Rien pour l'instant.</p>
        ) : (
          <ul className="log">
            {game.log.map((l, i) => (
              <li key={i}>
                <span className="muted">R{l.round}</span> {l.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ mise en place */

function Setup({ onStart }: { onStart: (g: GameState) => void }) {
  const [armies, setArmies] = useState<Army[]>([])
  const [format, setFormat] = useState<FormatId>('engagement')
  const [scenario, setScenario] = useState<ScenarioId>('destruction')
  const [priority, setPrio] = useState<0 | 1>(0)
  const [players, setPlayers] = useState([
    { name: 'Joueur 1', factionId: factions[0].id, armyId: '' },
    { name: 'Joueur 2', factionId: factions[1].id, armyId: '' },
  ])
  const [prioRoll, setPrioRoll] = useState<[Roll, Roll] | null>(null)

  useEffect(() => {
    // Sans connexion (comptes branchés), pas de listes : on joue avec la faction seule.
    listArmies()
      .then(setArmies)
      .catch(() => setArmies([]))
  }, [])

  const set = (i: number, patch: Partial<(typeof players)[number]>) => setPlayers(players.map((p, k) => (k === i ? { ...p, ...patch } : p)))

  const rollPriority = () => {
    // 5 dés chacun, le plus de réussites a la priorité ; relance en cas d'égalité.
    let a: Roll, b: Roll
    do {
      a = rollDice(5, 0)
      b = rollDice(5, 0)
    } while (a.successes === b.successes)
    setPrioRoll([a, b])
    setPrio(a.successes > b.successes ? 0 : 1)
  }

  const start = () => {
    const ps = players.map((p) => {
      const army = armies.find((a) => a.id === p.armyId) ?? null
      return newPlayer(p.name.trim() || 'Joueur', army?.factionId ?? p.factionId, army)
    }) as [ReturnType<typeof newPlayer>, ReturnType<typeof newPlayer>]
    onStart(newGame(format, scenario, ps, priority))
  }

  return (
    <div className="stack-lg">
      <h1>Nouvelle partie</h1>
      <div className="cards-2">
        {players.map((p, i) => {
          const army = armies.find((a) => a.id === p.armyId)
          const fid = army?.factionId ?? p.factionId
          return (
            <section key={i} className="card stack" style={{ ['--faction' as string]: FACTION_COLOR[fid] }}>
              <input className="title-input" value={p.name} onChange={(e) => set(i, { name: e.target.value })} aria-label={`Nom du joueur ${i + 1}`} />
              <label>
                Liste d'armée
                <select value={p.armyId} onChange={(e) => set(i, { armyId: e.target.value })}>
                  <option value="">Aucune (faction seule)</option>
                  {armies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {factionById(a.factionId)?.name}
                    </option>
                  ))}
                </select>
              </label>
              {!army && (
                <label>
                  Faction
                  <select value={p.factionId} onChange={(e) => set(i, { factionId: e.target.value })}>
                    {factions.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="small muted">
                {army ? `${armyUnits(army).length - 1} unités au déploiement (+ colosse en réserve). Les destructions se cochent unité par unité.` : 'Sans liste : activations et points de destruction se comptent à la main.'}
              </p>
            </section>
          )
        })}
      </div>

      <section className="card stack">
        <div className="row wrap">
          <label>
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as FormatId)}>
              {(Object.keys(FORMATS) as FormatId[]).map((k) => (
                <option key={k} value={k}>
                  {FORMATS[k].label} — {FORMATS[k].table}, {FORMATS[k].terrains} terrains
                </option>
              ))}
            </select>
          </label>
          <label className="grow">
            Scénario
            <select value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioId)}>
              {(Object.keys(SCENARIOS) as ScenarioId[]).map((k) => (
                <option key={k} value={k}>
                  {SCENARIOS[k].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="small">{SCENARIOS[scenario].summary}</p>
        <div className="row wrap align-center">
          <span>Priorité :</span>
          {players.map((p, i) => (
            <label key={i} className="check">
              <input type="radio" checked={priority === i} onChange={() => setPrio(i as 0 | 1)} /> {p.name}
            </label>
          ))}
          <button className="btn small" onClick={rollPriority}>
            Lancer 5 dés chacun
          </button>
        </div>
        {prioRoll && (
          <p className="small">
            {players[0].name} : <Dice roll={prioRoll[0]} /> {prioRoll[0].successes} réussites · {players[1].name} : <Dice roll={prioRoll[1]} />{' '}
            {prioRoll[1].successes} réussites → priorité à <strong>{players[priority].name}</strong>
          </p>
        )}
        <button className="btn primary" onClick={start}>
          Commencer la partie
        </button>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ tableau des scores */

function Scoreboard({ game }: { game: GameState }) {
  const vp = [victoryPoints(game, 0), victoryPoints(game, 1)]
  return (
    <div className="scoreboard">
      {([0, 1] as const).map((i) => {
        const p = game.players[i]
        const lead = game.finished && vp[i] > vp[1 - i]
        return (
          <div key={i} className={`score${lead ? ' winner' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[p.factionId] }}>
            <span className="score-name">
              {p.name} {game.priority === i && <span className="pill accent" title="A la priorité">Priorité</span>}
            </span>
            <strong className="score-vp">{vp[i]}</strong>
            <span className="small muted">
              {destructionPoints(game, i)} destruction · {p.scenarioPoints} scénario
            </span>
            {lead && <span className="pill ok">Victoire</span>}
          </div>
        )
      })}
      {game.finished && vp[0] === vp[1] && <p className="center">Égalité.</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ phases */

function PhaseTracker({ game, setGame, onZones }: { game: GameState; setGame: (g: GameState) => void; onZones: (pts: [number, number]) => void }) {
  const phases = phasesOf(game.round)
  const phase = currentPhase(game)
  const [zone, setZone] = useState<[number, number]>([0, 0])
  const [zonesDone, setZonesDone] = useState<number | null>(null)

  return (
    <section className="card phase-card">
      <ol className="phase-strip">
        {phases.map((ph, k) => (
          <li key={ph} className={k === game.phase && !game.finished ? 'on' : k < game.phase || game.finished ? 'done' : ''}>
            {PHASES[ph].label}
          </li>
        ))}
      </ol>
      {game.finished ? (
        <p>La partie est terminée après {ROUNDS} rounds.</p>
      ) : (
        <>
          <h2>{PHASES[phase].label}</h2>
          <ul className="rule-list">
            {PHASES[phase].steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {game.round === 1 && phase === 'activation' && <li>Pas de phase d'énergie ni d'ordres au premier round.</li>}
          </ul>

          {phase === 'energie' && (
            <p className="small">
              Énergie : {game.players.map((p) => `${p.name} ${energy(p)}`).join(' · ')}
              {game.players.some((p) => p.factionId === 'umbra') && ' — Umbra : chaque point dépensé en vaut 2.'}
            </p>
          )}

          {(phase === 'activation' || phase === 'debut') && (
            <p className="small">
              Activations : {game.players.map((p) => `${p.name} ${activations(p)}`).join(' · ')}
              {game.players.some((p) => p.passTokens > 0) && ` — pass tokens : ${game.players.map((p) => `${p.name} ${p.passTokens}`).join(', ')}`}
            </p>
          )}

          {phase === 'fin' && (
            <div className="stack">
              {game.scenario === 'zones' && zonesDone !== game.round && (
                <div className="row wrap align-end">
                  {game.players.map((p, i) => (
                    <label key={i}>
                      Points de zone de {p.name}
                      <input type="number" min={0} max={30} value={zone[i]} onChange={(e) => setZone(i === 0 ? [Number(e.target.value), zone[1]] : [zone[0], Number(e.target.value)])} />
                    </label>
                  ))}
                  <button
                    className="btn"
                    onClick={() => {
                      onZones(zone)
                      setZonesDone(game.round)
                      setZone([0, 0])
                    }}
                  >
                    Marquer
                  </button>
                </div>
              )}
              <div className="row wrap align-center">
                <span className="small">Dernière activation du round :</span>
                {game.players.map((p, i) => (
                  <button key={i} className="btn small" onClick={() => setGame(setPriority(game, i === 0 ? 1 : 0))}>
                    {p.name}
                  </button>
                ))}
                <span className="small muted">→ la priorité passe à l'autre joueur.</span>
              </div>
            </div>
          )}
        </>
      )}
      <div className="row between">
        <button className="btn ghost" onClick={() => setGame(prevPhase(game))} disabled={game.round === 1 && game.phase === 0}>
          ← Précédent
        </button>
        {!game.finished && (
          <button className="btn primary" onClick={() => setGame(nextPhase(game))}>
            {game.phase === phases.length - 1 ? (game.round >= ROUNDS ? 'Terminer la partie' : `Round ${game.round + 1} →`) : 'Phase suivante →'}
          </button>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ joueurs */

function PlayerPanel({
  game,
  i,
  setGame,
  onScore,
}: {
  game: GameState
  i: 0 | 1
  setGame: (g: GameState) => void
  onScore: (pts: number, label: string) => void
}) {
  const p = game.players[i]
  const f = factionById(p.factionId)!
  const patch = (x: Parameters<typeof patchPlayer>[2]) => setGame(patchPlayer(game, i, x))
  const drops = isCorpo(p) ? f.tables[0] : null
  const units = p.army ? armyUnits(p.army) : []
  const inPlay = new Set(unitsInPlay(p).map((u) => u.key))

  return (
    <section className="card stack player" style={{ ['--faction' as string]: FACTION_COLOR[p.factionId] }}>
      <header className="row between">
        <div>
          <h2>{p.name}</h2>
          <span className="small muted">
            {f.name}
            {p.army ? ` · ${p.army.name}` : ''}
          </span>
        </div>
        <div className="energy" title="Énergie disponible à la phase d'énergie">
          <strong>{energy(p)}</strong>
          <span>énergie</span>
        </div>
      </header>

      <div className="counters">
        <Counter label="Terrains contrôlés" value={p.terrains} onChange={(v) => patch({ terrains: v })} />
        <Counter label="Pass tokens" value={p.passTokens} onChange={(v) => patch({ passTokens: v })} />
        {!p.army && <Counter label="Unités en jeu" value={p.manualUnits} onChange={(v) => patch({ manualUnits: v })} />}
        {!p.army && <Counter label="Destruction marquée" value={p.manualDestruction} step={4} onChange={(v) => patch({ manualDestruction: v })} />}
      </div>
      <div className="row wrap">
        <label className="check">
          <input type="checkbox" checked={p.commandAlive} onChange={(e) => patch({ commandAlive: e.target.checked })} /> Véhicule de commandement en jeu
        </label>
        <label className="check">
          <input type="checkbox" checked={p.colossusArrived} onChange={(e) => patch({ colossusArrived: e.target.checked })} /> Colosse arrivé
        </label>
      </div>

      <div className="stack">
        <h3>Points de scénario : {p.scenarioPoints}</h3>
        {game.scenario !== 'zones' ? (
          <div className="row wrap">
            <button className="btn" onClick={() => onScore(30, game.scenario === 'destruction' ? 'objectif ennemi détruit' : 'ressource récupérée')}>
              {game.scenario === 'destruction' ? 'Objectif ennemi détruit' : 'Objectif scoré'} (+30)
            </button>
            <button className="btn ghost small" onClick={() => onScore(-30, 'correction')} disabled={p.scenarioPoints < 30}>
              −30
            </button>
          </div>
        ) : (
          <p className="small muted">Les zones se marquent en phase de fin.</p>
        )}
      </div>

      {p.army && (
        <div className="stack">
          <h3>Unités ({activations(p)} en jeu)</h3>
          <ul className="unit-checks">
            {units.map((u) => {
              const dead = p.destroyed.includes(u.key)
              const waiting = !inPlay.has(u.key)
              return (
                <li key={u.key} className={dead ? 'dead' : waiting ? 'waiting' : ''}>
                  <label className="check">
                    <input type="checkbox" checked={dead} onChange={() => setGame(toggleDestroyed(game, i, u.key))} disabled={waiting} />
                    {SLOT_LABEL[u.slot]}
                    <span className="muted small">
                      {' '}
                      · {u.profile.models} socle{u.profile.models > 1 ? 's' : ''} · DEF {u.profile.def.join('+')} · {u.profile.destruction} pts
                      {waiting ? ' · en réserve' : ''}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="small muted">Cocher une unité quand elle est détruite : ses points de destruction vont à l'adversaire.</p>
        </div>
      )}

      {drops && (
        <div className="stack">
          <h3>Drop-tokens : {p.dropTokens}</h3>
          <div className="drop-grid">
            {drops.rows.map((r) => {
              const cost = Number(r[0])
              return (
                <button key={r[1]} className="btn small" disabled={p.dropTokens < cost} onClick={() => setGame(spendDrops(game, i, cost, r[1]))} title={r[2]}>
                  {r[1]} <span className="muted">({cost})</span>
                </button>
              )
            })}
          </div>
          <Counter label="Ajuster la réserve" value={p.dropTokens} onChange={(v) => patch({ dropTokens: v })} />
        </div>
      )}

      <details>
        <summary>Rappel des règles de la faction</summary>
        <p>
          <strong>Pouvoir de faction :</strong> {f.factionPower}
        </p>
        <p>
          <strong>Pouvoir de colosse :</strong> {f.colossusPower}
        </p>
        {f.specialRules.map((r) => (
          <p key={r.name}>
            <strong>{r.name} :</strong> {r.text.join(' ')}
          </p>
        ))}
      </details>
    </section>
  )
}

function Counter({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="counter">
      <span className="small">{label}</span>
      <div className="row">
        <button className="btn small ghost" onClick={() => onChange(Math.max(0, value - step))} aria-label={`${label} moins ${step}`}>
          −
        </button>
        <strong>{value}</strong>
        <button className="btn small ghost" onClick={() => onChange(value + step)} aria-label={`${label} plus ${step}`}>
          +
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ dés */

function Dice({ roll }: { roll: Roll }) {
  return (
    <span className="dice">
      {roll.dice.map((d, k) => (
        <span key={k} className={`die${d >= roll.target ? ' hit' : ''}${d === 6 ? ' six' : ''}`}>
          {d}
        </span>
      ))}
    </span>
  )
}

function DiceRoller() {
  const [n, setN] = useState(4)
  const [mod, setMod] = useState(0)
  const [auto, setAuto] = useState(0)
  const [roll, setRoll] = useState<Roll | null>(null)
  const presets: [string, number][] = [
    ['Moral (3D)', 3],
    ['Prise de position (4D)', 4],
    ['Réparation (4D)', 4],
    ['Priorité (5D)', 5],
  ]
  return (
    <section className="card stack">
      <h2>Lancer de dés</h2>
      <p className="small muted">Réussite sur 4+ ; +1 donne 3+, −1 donne 5+ (jamais mieux que 3+ ni pire que 5+). Chaque 6 naturel relance un dé (dé explosif).</p>
      <div className="row wrap align-end">
        <label>
          Dés
          <input type="number" min={1} max={60} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </label>
        <label>
          Modificateur
          <select value={mod} onChange={(e) => setMod(Number(e.target.value))}>
            <option value={1}>+1 (3+)</option>
            <option value={0}>Aucun (4+)</option>
            <option value={-1}>−1 (5+)</option>
          </select>
        </label>
        <label title="Réussites automatiques apportées par l'énergie (armes ou boucliers)">
          Réussites auto.
          <input type="number" min={0} max={20} value={auto} onChange={(e) => setAuto(Number(e.target.value))} />
        </label>
        <button className="btn primary" onClick={() => setRoll(rollDice(n, mod, auto))}>
          Lancer
        </button>
      </div>
      <div className="row wrap">
        {presets.map(([label, k]) => (
          <button
            key={label}
            className="btn small ghost"
            onClick={() => {
              setN(k)
              setMod(0)
              setAuto(0)
              setRoll(rollDice(k, 0, 0))
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {roll && (
        <div className="roll">
          <Dice roll={roll} />
          <p>
            <strong className="big">{roll.total}</strong> réussite{roll.total > 1 ? 's' : ''}
            <span className="muted small">
              {' '}
              ({roll.successes} aux dés sur {roll.target}+{roll.auto ? ` + ${roll.auto} auto.` : ''}
              {roll.explosions ? `, ${roll.explosions} dé${roll.explosions > 1 ? 's' : ''} explosif${roll.explosions > 1 ? 's' : ''}` : ''})
            </span>
          </p>
        </div>
      )}
    </section>
  )
}
