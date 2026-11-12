import { SLOT_LABEL, TREE, type Faction, type TreeNode } from '../data'
import { nodeState, type Army } from '../lib/army'

/**
 * Arbre de recrutement en croix autour du QG, comme dans le livret :
 * nord = léger → spéciale, ouest = léger → moyen → char lourd,
 * est = léger → moyen → artillerie, sud = volant léger → volant moyen.
 */
const POS: Record<string, [col: number, row: number]> = {
  n1: [4, 2],
  n2: [4, 1],
  o1: [3, 3],
  o2: [2, 3],
  o3: [1, 3],
  e1: [5, 3],
  e2: [6, 3],
  e3: [7, 3],
  s1: [4, 4],
  s2: [4, 5],
}
const QG: [number, number] = [4, 3]

const HINT = {
  recruited: 'Recrutée — cliquer pour retirer (retire aussi la suite de la ligne)',
  available: 'Cliquer pour recruter (1 point)',
  locked: "Recruter d'abord l'unité précédente sur cette ligne",
  'no-points': 'Plus de points disponibles',
}

export default function RecruitTree({
  army,
  faction,
  onToggle,
  onInspect,
  selected,
}: {
  army: Army
  faction: Faction
  onToggle: (id: string) => void
  onInspect: (id: string) => void
  selected: string | null
}) {
  const center = (c: number, r: number) => [(c - 0.5) * (100 / 7), (r - 0.5) * (100 / 5)]
  const links = TREE.map((n) => {
    const from = n.prev ? POS[n.prev] : QG
    const to = POS[n.id]
    const [x1, y1] = center(...from)
    const [x2, y2] = center(...to)
    return { n, x1, y1, x2, y2, on: army.nodes.includes(n.id) }
  })

  const nodeButton = (n: TreeNode) => {
    const state = nodeState(army, n)
    const p = faction.units[n.slot]
    const [c, r] = POS[n.id]
    return (
      <button
        key={n.id}
        type="button"
        className={`tree-node ${state}${selected === n.id ? ' selected' : ''}`}
        style={{ gridColumn: c, gridRow: r }}
        onClick={() => (state === 'recruited' || state === 'available' ? onToggle(n.id) : onInspect(n.id))}
        onMouseEnter={() => onInspect(n.id)}
        onFocus={() => onInspect(n.id)}
        title={HINT[state]}
        aria-pressed={state === 'recruited'}
      >
        <span className="tree-name">{SLOT_LABEL[n.slot]}</span>
        <span className="tree-sub">
          {p.models} × {p.size.toLowerCase()}
          {p.type === 'Air' ? ' · air' : ''}
        </span>
        {state === 'recruited' && <span className="tree-check" aria-hidden>✓</span>}
      </button>
    )
  }

  return (
    <div className="tree">
      <svg className="tree-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {links.map((l) => (
          <line key={l.n.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={l.on ? 'on' : ''} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <button
        type="button"
        className={`tree-node qg${selected === 'qg' ? ' selected' : ''}`}
        style={{ gridColumn: QG[0], gridRow: QG[1] }}
        onClick={() => onInspect('qg')}
        onMouseEnter={() => onInspect('qg')}
        onFocus={() => onInspect('qg')}
        title="QG : commandant et colosse, fournis"
      >
        <span className="tree-name">QG</span>
        <span className="tree-sub">Commandant + Colosse</span>
      </button>
      {TREE.map(nodeButton)}
    </div>
  )
}
