import factionsJson from './factions.json'
import rulesJson from './rules.json'
import skillsJson from './skills.json'
import quickrefJson from './quickref.json'
import sourcesJson from './sources.json'

/** Données générées par scripts/import_data.py à partir des PDF de règles. */

export type SlotId =
  | 'commandant'
  | 'colosse'
  | 'leger'
  | 'moyen'
  | 'lourd'
  | 'artillerie'
  | 'speciale'
  | 'volant-leger'
  | 'volant-moyen'

export interface Weapon {
  name: string
  /** Identifiant de compétence (skills.json), null si l'arme n'a pas de bonus. */
  bonus: string | null
  bonusLabel: string | null
  arc: string
  range: number
  shots: number
}

export interface NamedRule {
  name: string
  text: string
}

export interface UnitProfile {
  slot: SlotId
  title: string
  move: 'S' | 'M' | 'L' | string
  /** Paliers de DEF : un point de vie par palier. */
  def: number[]
  shield: number
  zar: number
  size: 'Léger' | 'Moyen' | 'Lourd' | string
  /** Nombre de socles maximum de l'unité. */
  models: number
  type: 'Sol' | 'Air'
  power: { A: number; M: number; B: number }
  destruction: number
  weapons: Weapon[]
  rules: NamedRule[]
}

export interface FactionTable {
  columns: string[]
  rows: string[][]
}

export interface Faction {
  id: string
  name: string
  lore: string | null
  background: string | null
  factionPower: string
  colossusPower: string
  specialIntro: string | null
  specialRules: { name: string; text: string[] }[]
  tables: FactionTable[]
  infantry: { def: number; shield: number; zar: number }
  units: Record<SlotId, UnitProfile>
  sources: { profiles: string; list: string }
}

export type RuleBlock =
  | { type: 'p'; text: string }
  | { type: 'li'; text: string; level?: number }
  | { type: 'table'; rows: string[][] }
  | { type: 'img'; src: string }

export interface RuleSection {
  id: string
  title: string
  level: number
  blocks: RuleBlock[]
}

export interface Skill {
  id: string
  name: string
  text: string
}

export interface QuickCard {
  title: string
  blocks: RuleBlock[]
}

export const factions = factionsJson as unknown as Faction[]
export const rules = rulesJson as unknown as RuleSection[]
export const skills = skillsJson as Skill[]
export const quickref = quickrefJson as unknown as QuickCard[]
export const sources = sourcesJson as { rules: string; quickref: string }

export const factionById = (id: string) => factions.find((f) => f.id === id)
export const skillById = (id: string | null) => (id ? skills.find((s) => s.id === id) : undefined)

/** Nom court des emplacements, pour l'arbre et les listes. */
export const SLOT_LABEL: Record<SlotId, string> = {
  commandant: 'Commandant',
  colosse: 'Colosse',
  leger: 'Véhicule léger',
  moyen: 'Véhicule moyen',
  lourd: 'Char lourd',
  artillerie: 'Artillerie',
  speciale: 'Unité spéciale',
  'volant-leger': 'Volant léger',
  'volant-moyen': 'Volant moyen',
}

/** Couleur d'accent de chaque faction (variable CSS --faction). */
export const FACTION_COLOR: Record<string, string> = {
  cabale: '#e8913a',
  corpo: '#4f9df0',
  umbra: '#a77bf3',
  vespara: '#5fcf6b',
}

/* ------------------------------------------------------------------ formats et arbre de recrutement */

export type FormatId = 'engagement' | 'theatre'

export const FORMATS: Record<FormatId, { label: string; points: number; table: string; terrains: number }> = {
  engagement: { label: 'Engagement', points: 5, table: '120 × 120 cm', terrains: 10 },
  theatre: { label: "Théâtre d'opérations", points: 7, table: '120 × 180 cm', terrains: 15 },
}

export type Branch = 'nord' | 'ouest' | 'est' | 'sud'

export interface TreeNode {
  id: string
  slot: SlotId
  branch: Branch
  /** Rang depuis le QG (1 = directement connecté). */
  depth: number
  /** Unité à recruter avant celle-ci (null : connectée au QG). */
  prev: string | null
}

/**
 * Arbre de recrutement du livret (3.4 Les listes d'armée), commun aux quatre factions.
 * Chaque emplacement coûte 1 point ; le QG (commandant + colosse) est fourni.
 */
export const TREE: TreeNode[] = [
  { id: 'n1', slot: 'leger', branch: 'nord', depth: 1, prev: null },
  { id: 'n2', slot: 'speciale', branch: 'nord', depth: 2, prev: 'n1' },
  { id: 'o1', slot: 'leger', branch: 'ouest', depth: 1, prev: null },
  { id: 'o2', slot: 'moyen', branch: 'ouest', depth: 2, prev: 'o1' },
  { id: 'o3', slot: 'lourd', branch: 'ouest', depth: 3, prev: 'o2' },
  { id: 'e1', slot: 'leger', branch: 'est', depth: 1, prev: null },
  { id: 'e2', slot: 'moyen', branch: 'est', depth: 2, prev: 'e1' },
  { id: 'e3', slot: 'artillerie', branch: 'est', depth: 3, prev: 'e2' },
  { id: 's1', slot: 'volant-leger', branch: 'sud', depth: 1, prev: null },
  { id: 's2', slot: 'volant-moyen', branch: 'sud', depth: 2, prev: 's1' },
]

export const nodeById = (id: string) => TREE.find((n) => n.id === id)
