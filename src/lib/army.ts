import { FORMATS, TREE, factionById, nodeById, type FormatId, type SlotId, type TreeNode, type UnitProfile } from '../data'

export interface Army {
  id: string
  name: string
  factionId: string
  format: FormatId
  /** Emplacements recrutés dans l'arbre (identifiants de TreeNode). */
  nodes: string[]
  notes: string
  updatedAt: string
}

export function newArmy(factionId: string, format: FormatId, name: string): Army {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || 'Nouvelle armée',
    factionId,
    format,
    nodes: [],
    notes: '',
    updatedAt: new Date().toISOString(),
  }
}

export const budget = (army: Army) => FORMATS[army.format].points
export const spent = (army: Army) => army.nodes.length
export const remaining = (army: Army) => budget(army) - spent(army)

export type NodeState = 'recruited' | 'available' | 'locked' | 'no-points'

/** État d'un emplacement : recruté, recrutable, bloqué par la progression, ou faute de points. */
export function nodeState(army: Army, node: TreeNode): NodeState {
  if (army.nodes.includes(node.id)) return 'recruited'
  if (node.prev && !army.nodes.includes(node.prev)) return 'locked'
  if (remaining(army) <= 0) return 'no-points'
  return 'available'
}

/** Emplacements qui dépendent de celui-ci, plus loin sur la même ligne. */
export function descendants(nodeId: string): string[] {
  const out: string[] = []
  let cur = TREE.find((n) => n.prev === nodeId)
  while (cur) {
    out.push(cur.id)
    const id: string = cur.id
    cur = TREE.find((n) => n.prev === id)
  }
  return out
}

/** Recrute ou retire un emplacement. Retirer une unité retire aussi la suite de sa ligne. */
export function toggleNode(army: Army, nodeId: string): Army {
  if (army.nodes.includes(nodeId)) {
    const drop = new Set([nodeId, ...descendants(nodeId)])
    return { ...army, nodes: army.nodes.filter((n) => !drop.has(n)) }
  }
  const node = nodeById(nodeId)
  if (!node || nodeState(army, node) !== 'available') return army
  return { ...army, nodes: [...army.nodes, nodeId] }
}

export interface ArmyIssue {
  level: 'error' | 'info'
  text: string
}

/** Vérifie les règles de recrutement : Départ, Progression, Doublon et budget. */
export function validate(army: Army): ArmyIssue[] {
  const issues: ArmyIssue[] = []
  if (!factionById(army.factionId)) issues.push({ level: 'error', text: 'Faction inconnue.' })
  const seen = new Set<string>()
  for (const id of army.nodes) {
    const n = nodeById(id)
    if (!n) {
      issues.push({ level: 'error', text: `Emplacement inconnu (${id}).` })
      continue
    }
    if (seen.has(id)) issues.push({ level: 'error', text: 'Doublon : le même emplacement est recruté deux fois.' })
    seen.add(id)
    if (n.prev && !army.nodes.includes(n.prev)) {
      issues.push({ level: 'error', text: 'Progression : une unité avancée est recrutée sans celle qui la précède sur sa ligne.' })
    }
  }
  if (spent(army) > budget(army)) {
    issues.push({ level: 'error', text: `Budget dépassé : ${spent(army)} points pour ${budget(army)} autorisés.` })
  } else if (remaining(army) > 0) {
    issues.push({ level: 'info', text: `${remaining(army)} point${remaining(army) > 1 ? 's' : ''} encore à dépenser.` })
  }
  return issues
}

export const isValid = (army: Army) => validate(army).every((i) => i.level !== 'error')

export interface ArmyUnit {
  /** Identifiant d'emplacement ('qg-commandant', 'qg-colosse' ou celui de l'arbre). */
  key: string
  slot: SlotId
  profile: UnitProfile
  /** Le colosse n'est pas déployé au début : il arrive au premier objectif scoré. */
  reserve?: boolean
}

/** Unités de l'armée, dans l'ordre : QG puis arbre (ordre de l'arbre). */
export function armyUnits(army: Army): ArmyUnit[] {
  const f = factionById(army.factionId)
  if (!f) return []
  const list: ArmyUnit[] = [{ key: 'qg-commandant', slot: 'commandant', profile: f.units.commandant }]
  for (const n of TREE) {
    if (army.nodes.includes(n.id)) list.push({ key: n.id, slot: n.slot, profile: f.units[n.slot] })
  }
  list.push({ key: 'qg-colosse', slot: 'colosse', profile: f.units.colosse, reserve: true })
  return list
}

/** Total des points de destruction que l'adversaire peut marquer (hors colosse en réserve compris). */
export const destructionTotal = (army: Army) => armyUnits(army).reduce((s, u) => s + u.profile.destruction, 0)

export const modelCount = (army: Army) => armyUnits(army).reduce((s, u) => s + u.profile.models, 0)
