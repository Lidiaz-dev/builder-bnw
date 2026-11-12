import { FORMATS, factionById, type FormatId } from '../data'
import { armyUnits, type Army, type ArmyUnit } from './army'

/** Assistant de partie : état d'une partie en cours, enregistré dans le navigateur. */

export type ScenarioId = 'destruction' | 'ressources' | 'zones'

export const SCENARIOS: Record<ScenarioId, { label: string; summary: string }> = {
  destruction: {
    label: 'Recherche et destruction',
    summary: 'Chaque joueur place 3 objectifs (DEF 6+6+6) dans son territoire. Détruire un objectif ennemi : 30 points.',
  },
  ressources: {
    label: 'Récupération de ressources',
    summary: "3 objectifs chacun dans le territoire ennemi. Une unité terrestre finissant un mouvement à S d'un objectif le score : 30 points.",
  },
  zones: {
    label: 'Contrôle de zones',
    summary: "Fin de chaque round : 1 point par objectif contrôlé dans son territoire, 3 sur la ligne centrale, 5 dans le territoire ennemi.",
  },
}

export type PhaseId = 'debut' | 'energie' | 'ordres' | 'activation' | 'combat' | 'fin' | 'nettoyage'

export const PHASES: Record<PhaseId, { label: string; steps: string[] }> = {
  debut: {
    label: 'Début de round',
    steps: [
      'Résoudre les effets de début de round.',
      "Compter les activations : le joueur qui en a le moins gagne autant de pass tokens que la différence.",
    ],
  },
  energie: {
    label: "Phase d'énergie",
    steps: [
      'Chaque joueur rassemble son énergie : 5 par véhicule de commandement, 1 par terrain contrôlé.',
      'En alternance, en commençant par le joueur qui a la priorité : alimenter une unité (à L du commandant et en ligne de vue) ou passer.',
      "Une unité reçoit toute son énergie en une fois (dans la limite de sa puissance A/M/B). L'énergie non distribuée est perdue.",
    ],
  },
  ordres: {
    label: "Phase d'ordres",
    steps: ['Chaque joueur pose face cachée un pion ordre (Tir, Mouvement ou Spéciale) pour chacune de ses unités.'],
  },
  activation: {
    label: "Phase d'activation",
    steps: [
      "En alternance, en commençant par le joueur qui a la priorité : activer une unité (révéler son ordre, résoudre l'action majeure et éventuellement une mineure) ou dépenser un pass token.",
      "Au premier round, les unités entrent depuis le bord de table : l'ordre majeur est forcément un mouvement.",
    ],
  },
  combat: {
    label: 'Combat de terrains',
    steps: [
      'Dans chaque terrain contesté, jet en opposition : valeur de combat par infanterie présente + 1 dé par socle allié à M.',
      'Le plus de réussites gagne et inflige la différence en pertes. Pas de test de moral.',
    ],
  },
  fin: {
    label: 'Phase de fin',
    steps: ['Compter les points de victoire des objectifs.', "La priorité passe au joueur qui n'a pas eu la dernière activation."],
  },
  nettoyage: {
    label: 'Nettoyage',
    steps: ['Ramasser les pions ordres et les pions d’énergie.'],
  },
}

/** Le premier round commence directement à la phase d'activation (3.6 Déploiement). */
export const phasesOf = (round: number): PhaseId[] =>
  round === 1 ? ['activation', 'combat', 'fin', 'nettoyage'] : ['debut', 'energie', 'ordres', 'activation', 'combat', 'fin', 'nettoyage']

export const ROUNDS = 5

export interface PlayerState {
  name: string
  factionId: string
  /** Liste d'armée associée (copie au lancement de la partie). */
  army: Army | null
  /** Unités détruites par l'adversaire (clés d'ArmyUnit). */
  destroyed: string[]
  /** Points de destruction ajoutés à la main (sans liste associée). */
  manualDestruction: number
  scenarioPoints: number
  terrains: number
  commandAlive: boolean
  passTokens: number
  /** Activations comptées à la main (sans liste associée). */
  manualUnits: number
  dropTokens: number
  colossusArrived: boolean
}

export interface GameState {
  format: FormatId
  scenario: ScenarioId
  round: number
  phase: number
  /** Joueur qui a la priorité (0 ou 1). */
  priority: 0 | 1
  finished: boolean
  players: [PlayerState, PlayerState]
  log: { round: number; text: string }[]
}

export function newPlayer(name: string, factionId: string, army: Army | null): PlayerState {
  return {
    name,
    factionId,
    army,
    destroyed: [],
    manualDestruction: 0,
    scenarioPoints: 0,
    terrains: 0,
    commandAlive: true,
    passTokens: 0,
    manualUnits: army ? 0 : 6,
    dropTokens: 0,
    colossusArrived: false,
  }
}

export function newGame(format: FormatId, scenario: ScenarioId, players: [PlayerState, PlayerState], priority: 0 | 1): GameState {
  const g: GameState = { format, scenario, round: 1, phase: 0, priority, finished: false, players, log: [] }
  return startOfRound(g)
}

const other = (i: 0 | 1) => (i === 0 ? 1 : 0) as 0 | 1

export const isCorpo = (p: PlayerState) => p.factionId === 'corpo'

/** Unités de la liste du joueur, colosse compris seulement une fois arrivé. */
export function unitsInPlay(p: PlayerState): ArmyUnit[] {
  if (!p.army) return []
  return armyUnits(p.army).filter((u) => !u.reserve || p.colossusArrived)
}

/** Nombre d'activations du joueur (unités encore en jeu). */
export function activations(p: PlayerState): number {
  if (!p.army) return p.manualUnits
  return unitsInPlay(p).filter((u) => !p.destroyed.includes(u.key)).length
}

/** Énergie disponible à la phase d'énergie. */
export const energy = (p: PlayerState) => (p.commandAlive ? 5 : 0) + p.terrains

/** Points de destruction marqués par le joueur i (unités ennemies détruites). */
export function destructionPoints(g: GameState, i: 0 | 1): number {
  const me = g.players[i]
  const foe = g.players[other(i)]
  const fromList = foe.army ? armyUnits(foe.army).filter((u) => foe.destroyed.includes(u.key)).reduce((s, u) => s + u.profile.destruction, 0) : 0
  return fromList + me.manualDestruction
}

export const victoryPoints = (g: GameState, i: 0 | 1) => destructionPoints(g, i) + g.players[i].scenarioPoints

export const currentPhase = (g: GameState): PhaseId => phasesOf(g.round)[g.phase]

function log(g: GameState, text: string): GameState {
  return { ...g, log: [{ round: g.round, text }, ...g.log].slice(0, 200) }
}

function updatePlayer(g: GameState, i: 0 | 1, patch: Partial<PlayerState>): GameState {
  const players = [...g.players] as [PlayerState, PlayerState]
  players[i] = { ...players[i], ...patch }
  return { ...g, players }
}

/** Début de round : drop-tokens des Corporations et pass tokens. */
function startOfRound(g: GameState): GameState {
  let next = g
  for (const i of [0, 1] as const) {
    const p = next.players[i]
    if (isCorpo(p) && p.commandAlive) {
      next = updatePlayer(next, i, { dropTokens: p.dropTokens + 10 })
      next = log(next, `${p.name} : +10 drop-tokens (Support demandé).`)
    }
  }
  const a = activations(next.players[0])
  const b = activations(next.players[1])
  next = updatePlayer(next, 0, { passTokens: a < b ? b - a : 0 })
  next = updatePlayer(next, 1, { passTokens: b < a ? a - b : 0 })
  if (a !== b) {
    const low = a < b ? 0 : 1
    next = log(next, `${next.players[low].name} reçoit ${Math.abs(a - b)} pass token${Math.abs(a - b) > 1 ? 's' : ''} (${a} contre ${b} activations).`)
  }
  return next
}

export function nextPhase(g: GameState): GameState {
  if (g.finished) return g
  const phases = phasesOf(g.round)
  if (g.phase < phases.length - 1) return { ...g, phase: g.phase + 1 }
  if (g.round >= ROUNDS) return log({ ...g, finished: true }, 'Fin de la partie.')
  return startOfRound(log({ ...g, round: g.round + 1, phase: 0 }, `Round ${g.round + 1}.`))
}

export function prevPhase(g: GameState): GameState {
  if (g.finished) return { ...g, finished: false }
  if (g.phase > 0) return { ...g, phase: g.phase - 1 }
  if (g.round > 1) return { ...g, round: g.round - 1, phase: phasesOf(g.round - 1).length - 1 }
  return g
}

export function setPriority(g: GameState, i: 0 | 1): GameState {
  if (g.priority === i) return g
  return log({ ...g, priority: i }, `Priorité à ${g.players[i].name}.`)
}

export function patchPlayer(g: GameState, i: 0 | 1, patch: Partial<PlayerState>): GameState {
  return updatePlayer(g, i, patch)
}

export interface ScoreResult {
  game: GameState
  /** Rappels à afficher : pouvoir de faction, arrivée du colosse. */
  reminders: string[]
}

/** Ajoute des points de scénario ; rappelle le pouvoir de faction et l'arrivée du colosse. */
export function scoreScenario(g: GameState, i: 0 | 1, points: number, label: string, factionPower = true): ScoreResult {
  const p = g.players[i]
  let next = updatePlayer(g, i, { scenarioPoints: Math.max(0, p.scenarioPoints + points) })
  next = log(next, `${p.name} : ${points > 0 ? '+' : ''}${points} points de scénario (${label}).`)
  const reminders: string[] = []
  if (points > 0 && factionPower) {
    const f = factionById(p.factionId)
    if (f) reminders.push(`${p.name} peut déclencher son pouvoir de faction : ${f.factionPower}`)
    if (isCorpo(p)) {
      next = updatePlayer(next, i, { dropTokens: next.players[i].dropTokens + 5 })
      next = log(next, `${p.name} : +5 drop-tokens (pouvoir de faction).`)
    }
    // Le colosse arrive quand le premier objectif est scoré, après le pouvoir de faction.
  }
  if (points > 0) {
    const arrival = colossusArrival(next)
    next = arrival.game
    reminders.push(...arrival.reminders)
  }
  return { game: next, reminders }
}

/** Premier objectif scoré : les colosses des deux joueurs arrivent (cf. HYPOTHESES.md). */
function colossusArrival(g: GameState): ScoreResult {
  if (g.players.some((x) => x.colossusArrived)) return { game: g, reminders: [] }
  let next = g
  const reminders: string[] = []
  for (const j of [0, 1] as const) {
    const pj = next.players[j]
    const fj = factionById(pj.factionId)
    reminders.push(`Colosse de ${pj.name} : il arrive à L du bord de table allié, alimenté, avec une action mineure. ${fj ? fj.colossusPower : ''}`)
    next = updatePlayer(next, j, { colossusArrived: true })
  }
  return { game: log(next, 'Premier objectif scoré : les colosses arrivent.'), reminders }
}

/**
 * Contrôle de zones, fin de round : chaque joueur marque ses objectifs contrôlés
 * (1 dans son territoire, 3 sur la ligne centrale, 5 dans le territoire ennemi) ;
 * seul celui qui marque le plus déclenche son pouvoir de faction.
 */
export function scoreZones(g: GameState, pts: [number, number]): ScoreResult {
  const best = pts[0] === pts[1] ? null : pts[0] > pts[1] ? 0 : 1
  let next = g
  const reminders: string[] = []
  for (const i of [0, 1] as const) {
    if (pts[i] <= 0) continue
    const r = scoreScenario(next, i, pts[i], `contrôle de zones, round ${g.round}`, best === i)
    next = r.game
    for (const m of r.reminders) if (!reminders.includes(m)) reminders.push(m)
  }
  if (best === null && pts[0] > 0) reminders.unshift('Égalité de points de scénario : aucun pouvoir de faction ce round.')
  return { game: next, reminders }
}

export function toggleDestroyed(g: GameState, owner: 0 | 1, key: string): GameState {
  const p = g.players[owner]
  const destroyed = p.destroyed.includes(key) ? p.destroyed.filter((k) => k !== key) : [...p.destroyed, key]
  let next = updatePlayer(g, owner, { destroyed })
  if (key === 'qg-commandant') next = updatePlayer(next, owner, { commandAlive: !destroyed.includes(key) })
  const u = p.army ? armyUnits(p.army).find((x) => x.key === key) : null
  if (u && destroyed.includes(key)) {
    next = log(next, `${p.name} perd : ${u.profile.title} (${u.profile.destruction} points pour ${g.players[other(owner)].name}).`)
  }
  return next
}

export function spendDrops(g: GameState, i: 0 | 1, cost: number, name: string): GameState {
  const p = g.players[i]
  if (p.dropTokens < cost) return g
  return log(updatePlayer(g, i, { dropTokens: p.dropTokens - cost }), `${p.name} appelle un drop : ${name} (${cost}).`)
}

export const formatLabel = (g: GameState) => `${FORMATS[g.format].label} · ${SCENARIOS[g.scenario].label}`

/* ------------------------------------------------------------------ dés */

export interface Roll {
  dice: number[]
  /** Dés supplémentaires lancés grâce aux 6 (dés explosifs). */
  explosions: number
  target: number
  successes: number
  auto: number
  total: number
}

/** Lance n dés : réussite sur 4+ modifiée (bornée entre 3+ et 5+), chaque 6 naturel relance un dé. */
export function rollDice(n: number, modifier: number, auto = 0, rand: () => number = Math.random): Roll {
  const target = Math.min(5, Math.max(3, 4 - modifier))
  const dice: number[] = []
  let toRoll = Math.max(0, n)
  let explosions = 0
  while (toRoll > 0 && dice.length < 500) {
    const d = 1 + Math.floor(rand() * 6)
    dice.push(d)
    toRoll--
    if (d === 6) {
      toRoll++
      explosions++
    }
  }
  const successes = dice.filter((d) => d >= target).length
  return { dice, explosions, target, successes, auto, total: successes + auto }
}

const KEY = 'bnw.game'

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch {
    return null
  }
}

export function storeGame(g: GameState | null) {
  try {
    if (g) localStorage.setItem(KEY, JSON.stringify(g))
    else localStorage.removeItem(KEY)
  } catch {
    /* navigateur sans stockage : la partie reste en mémoire */
  }
}
