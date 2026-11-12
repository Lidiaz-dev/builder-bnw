import type { ReactNode } from 'react'

/**
 * Schémas du livret redessinés en SVG, dans l'identité visuelle de la maquette
 * (néon cyan sur fond spatial, libellés en capitales). Ils remplacent les images
 * importées des PDF dans la section indiquée par DIAGRAMS.
 */

const CYAN = '#22c3e6'
const GOLD = '#f2b33d'
const RED = '#ff6b6b'
const GREEN = '#4fd18b'

function Frame({ id, viewBox, label, caption, children }: { id: string; viewBox: string; label: string; caption: ReactNode; children: ReactNode }) {
  return (
    <figure className="diagram">
      <svg viewBox={viewBox} role="img" aria-label={label}>
        <defs>
          <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {(
            [
              ['arrow', CYAN],
              ['arrow-gold', GOLD],
              ['arrow-red', RED],
            ] as const
          ).map(([name, color]) => (
            <marker key={name} id={`${id}-${name}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={color} />
            </marker>
          ))}
        </defs>
        {children}
      </svg>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/** Petites étoiles fixes (pseudo-aléatoires) pour le fond. */
function Stars({ w, h, n = 40, seed = 7 }: { w: number; h: number; n?: number; seed?: number }) {
  let x = seed
  const rnd = () => {
    x = (x * 9301 + 49297) % 233280
    return x / 233280
  }
  return (
    <g className="stars">
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={rnd() * w} cy={rnd() * h} r={rnd() < 0.85 ? 0.7 : 1.3} />
      ))}
    </g>
  )
}

function Label({ x, y, title, sub, color = CYAN, anchor = 'middle' }: { x: number; y: number; title: string; sub?: string; color?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="d-label">
      <tspan fill={color} className="d-title">
        {title}
      </tspan>
      {sub && (
        <tspan x={x} dy="1.25em" className="d-sub">
          {sub}
        </tspan>
      )}
    </text>
  )
}

/** Zones Front / Flanc / Arrière autour d'un socle (diagonales prolongées). */
function Zones({ cx, cy, w, h, W, H, opacity = 1 }: { cx: number; cy: number; w: number; h: number; W: number; H: number; opacity?: number }) {
  // Point d'une diagonale prolongée jusqu'au bord haut (sy = -1) ou bas (sy = 1) du cadre.
  const edge = (sx: number, sy: number): [number, number] => {
    const dy = sy < 0 ? -cy : H - cy
    return [cx + (sx * w * dy) / (sy * h), sy < 0 ? 0 : H]
  }
  const tl = edge(-1, -1)
  const tr = edge(1, -1)
  const bl = edge(-1, 1)
  const br = edge(1, 1)
  const pts = (p: [number, number][]) => p.map((q) => q.join(',')).join(' ')
  return (
    <g opacity={opacity}>
      <polygon points={pts([[cx, cy], tl, tr])} fill={CYAN} fillOpacity={0.14} />
      <polygon points={pts([[cx, cy], tl, [0, 0], [0, H], bl])} fill={GOLD} fillOpacity={0.1} />
      <polygon points={pts([[cx, cy], tr, [W, 0], [W, H], br])} fill={GOLD} fillOpacity={0.1} />
      <polygon points={pts([[cx, cy], bl, br])} fill={RED} fillOpacity={0.12} />
      {[tl, tr, bl, br].map(([x, y], i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={CYAN} strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="5 4" />
      ))}
    </g>
  )
}

/** Socle de véhicule vu de dessus, front vers le haut (petit côté). */
function Base({ cx, cy, w, h, rotate = 0, color = CYAN, fill = '#0d1830', glow }: { cx: number; cy: number; w: number; h: number; rotate?: number; color?: string; fill?: string; glow?: string }) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={4} fill={fill} stroke={color} strokeWidth={2} />
      <line x1={cx - w / 2 + 3} y1={cy - h / 2} x2={cx + w / 2 - 3} y2={cy - h / 2} stroke={color} strokeWidth={5} strokeLinecap="round" filter={glow} />
    </g>
  )
}

/* ------------------------------------------------------------------ 2.3 Angles d'un véhicule */

function AnglesDiagram() {
  const W = 420
  const H = 300
  const cx = 210
  const cy = 150
  return (
    <Frame
      id="angles"
      viewBox={`0 0 ${W} ${H}`}
      label="Zones Front, Flanc et Arrière autour d'un véhicule"
      caption="Les diagonales du socle, prolongées, découpent les angles. Le front est toujours le petit côté du rectangle."
    >
      <Stars w={W} h={H} />
      <Zones cx={cx} cy={cy} w={70} h={104} W={W} H={H} />
      <Base cx={cx} cy={cy} w={70} h={104} glow="url(#angles-glow)" />
      <Label x={cx} y={36} title="FRONT" sub="DEF normale" />
      <Label x={58} y={146} title="FLANC" sub="−1 DEF" color={GOLD} />
      <Label x={W - 58} y={146} title="FLANC" sub="−1 DEF" color={GOLD} />
      <Label x={cx} y={H - 42} title="ARRIÈRE" sub="−2 DEF" color={RED} />
    </Frame>
  )
}

/* ------------------------------------------------------------------ 2.5 Angle d'un tir */

function FireAngleDiagram() {
  const W = 440
  const H = 300
  const cx = 300
  const cy = 190
  return (
    <Frame
      id="tir"
      viewBox={`0 0 ${W} ${H}`}
      label="Un attaquant situé dans la zone de flanc du défenseur"
      caption="On regarde où se trouve majoritairement l'attaquant (son leader) par rapport au défenseur : ici dans la zone de flanc, le tir touche le flanc."
    >
      <Stars w={W} h={H} seed={11} />
      {/* Attaquant à cheval sur la limite Front/Flanc, majoritairement dans le flanc (environ 2/3).
          Dessiné sous les zones pour que la limite reste visible par-dessus. */}
      <Base cx={193} cy={58} w={56} h={84} rotate={137} color={GREEN} fill="#0f2a1e" />
      <Zones cx={cx} cy={cy} w={64} h={92} W={W} H={H} opacity={0.9} />
      <Base cx={cx} cy={cy} w={64} h={92} color="#c9d3e2" fill="#1b2436" />
      <line x1={224} y1={95} x2={263} y2={166} stroke={RED} strokeWidth={4} markerEnd="url(#tir-arrow-red)" filter="url(#tir-glow)" />
      <Label x={95} y={124} title="ATTAQUANT" color={GREEN} />
      <Label x={cx} y={cy + 72} title="DÉFENSEUR" color="#c9d3e2" />
      <Label x={cx} y={30} title="FRONT" />
      <Label x={180} y={205} title="FLANC" color={GOLD} />
      <g transform="translate(18 252)">
        <rect width={150} height={30} rx={15} fill="#0b1424" stroke={GOLD} />
        <text x={75} y={20} textAnchor="middle" className="d-chip" fill={GOLD}>
          Tir de flanc : −1 DEF
        </text>
      </g>
    </Frame>
  )
}

/* ------------------------------------------------------------------ 3.4 Arbre de recrutement */

const TREE_NODES: { id: string; col: number; row: number; lines: string[]; prev?: string }[] = [
  { id: 'qg', col: 4, row: 3, lines: ['QG', 'Colosse'] },
  { id: 'n1', col: 4, row: 2, lines: ['Véhicule', 'léger'], prev: 'qg' },
  { id: 'n2', col: 4, row: 1, lines: ['Spéciale'], prev: 'n1' },
  { id: 'o1', col: 3, row: 3, lines: ['Véhicule', 'léger'], prev: 'qg' },
  { id: 'o2', col: 2, row: 3, lines: ['Véhicule', 'moyen'], prev: 'o1' },
  { id: 'o3', col: 1, row: 3, lines: ['Char', 'lourd'], prev: 'o2' },
  { id: 'e1', col: 5, row: 3, lines: ['Véhicule', 'léger'], prev: 'qg' },
  { id: 'e2', col: 6, row: 3, lines: ['Véhicule', 'moyen'], prev: 'e1' },
  { id: 'e3', col: 7, row: 3, lines: ['Artillerie'], prev: 'e2' },
  { id: 's1', col: 4, row: 4, lines: ['Volant', 'léger'], prev: 'qg' },
  { id: 's2', col: 4, row: 5, lines: ['Volant', 'moyen'], prev: 's1' },
]

function TreeDiagram() {
  const W = 720
  const H = 440
  const pos = (col: number, row: number): [number, number] => [col * 100 - 40, row * 84 - 32]
  const byId = Object.fromEntries(TREE_NODES.map((n) => [n.id, n]))
  return (
    <Frame
      id="arbre"
      viewBox={`0 0 ${W} ${H}`}
      label="Arbre de recrutement autour du QG Colosse"
      caption="Chaque unité coûte 1 point. Une ligne s'ouvre par l'unité reliée au QG, puis se recrute de proche en proche vers l'extérieur."
    >
      <Stars w={W} h={H} n={90} seed={3} />
      {TREE_NODES.filter((n) => n.prev).map((n) => {
        const p = byId[n.prev!]
        const [x1, y1] = pos(p.col, p.row)
        const [x2, y2] = pos(n.col, n.row)
        const len = Math.hypot(x2 - x1, y2 - y1)
        const r = p.id === 'qg' ? 44 : 36
        const ux = (x2 - x1) / len
        const uy = (y2 - y1) / len
        return (
          <line
            key={n.id}
            x1={x1 + ux * r}
            y1={y1 + uy * r}
            x2={x2 - ux * 40}
            y2={y2 - uy * 40}
            stroke={CYAN}
            strokeWidth={3}
            markerEnd="url(#arbre-arrow)"
          />
        )
      })}
      {TREE_NODES.map((n) => {
        const [x, y] = pos(n.col, n.row)
        const qg = n.id === 'qg'
        const r = qg ? 44 : 36
        return (
          <g key={n.id}>
            <circle cx={x} cy={y} r={r} fill="#161c2b" stroke={qg ? GOLD : CYAN} strokeWidth={qg ? 4 : 3} filter="url(#arbre-glow)" />
            <text x={x} y={y + (n.lines.length > 1 ? -2 : 4)} textAnchor="middle" className={`d-node${qg ? ' qg' : ''}`}>
              {n.lines.map((l, i) => (
                <tspan key={i} x={x} dy={i ? '1.15em' : 0}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}
    </Frame>
  )
}

/* ------------------------------------------------------------------ 5.2 Réglettes */

/** Réglette vue de dessus, de (x, y0) vers le haut jusqu'à y1, avec sa lettre. */
function Ruler({ x, y0, y1, letter, w = 26, rotate = 0, ox = x, oy = y0 }: { x: number; y0: number; y1: number; letter: string; w?: number; rotate?: number; ox?: number; oy?: number }) {
  const holes = []
  for (let y = y1 + 10; y < y0 - 22; y += 9) holes.push(y)
  return (
    <g transform={`rotate(${rotate} ${ox} ${oy})`}>
      <rect x={x - w / 2} y={y1} width={w} height={y0 - y1} rx={3} fill="#2a3346" stroke="#8d9ab0" strokeWidth={1.2} />
      {holes.map((y) => (
        <line key={y} x1={x - w / 2 + 6} y1={y} x2={x + w / 2 - 6} y2={y} stroke="#4a5670" strokeWidth={3} strokeLinecap="round" />
      ))}
      <text x={x} y={y0 - 7} textAnchor="middle" className="d-ruler">
        {letter}
      </text>
    </g>
  )
}

function MoveDiagram() {
  const W = 660
  const H = 300
  // Partie gauche : socle posé tout droit ou à 45° au bout de la réglette.
  const rx = 200
  const top = 120
  return (
    <Frame
      id="mouv"
      viewBox={`0 0 ${W} ${H}`}
      label="Placement d'un socle au bout de la réglette, et virage avec deux réglettes"
      caption={
        <>
          À gauche : le socle se pose au bout de la réglette, tout droit ou tourné de 45° au maximum. À droite : en action majeure, une réglette
          peut être remplacée par deux réglettes de la taille inférieure (L devient M + M), la seconde à 45° au maximum.
        </>
      }
    >
      <Stars w={W} h={H} n={60} seed={5} />
      <Ruler x={rx} y0={285} y1={top} letter="M" />
      {/* Tout droit */}
      <rect x={rx - 30} y={top - 82} width={60} height={82} rx={4} fill="none" stroke="#c9d3e2" strokeWidth={1.6} strokeDasharray="6 4" />
      {/* Tourné à 45° autour du coin avant gauche de la réglette */}
      <g transform={`rotate(45 ${rx - 13} ${top})`}>
        <rect x={rx - 13} y={top - 82} width={60} height={82} rx={4} fill={CYAN} fillOpacity={0.16} stroke={CYAN} strokeWidth={2} />
        <line x1={rx - 10} y1={top - 82} x2={rx + 44} y2={top - 82} stroke={CYAN} strokeWidth={5} strokeLinecap="round" filter="url(#mouv-glow)" />
      </g>
      <path d={`M ${rx} ${top - 92} A 70 70 0 0 1 ${rx + 52} ${top - 70}`} fill="none" stroke={GOLD} strokeWidth={2} markerEnd="url(#mouv-arrow-gold)" />
      <Label x={rx - 42} y={top - 40} title="TOUT DROIT" color="#c9d3e2" anchor="end" />
      <Label x={rx + 92} y={top - 82} title="45° MAX" color={GOLD} anchor="start" />

      <line x1={378} y1={30} x2={378} y2={270} stroke="#24324b" strokeWidth={1.5} />

      {/* Partie droite : virage, L devient M + M */}
      <Ruler x={480} y0={285} y1={165} letter="M" />
      <Ruler x={480} y0={165} y1={45} letter="M" rotate={35} ox={480} oy={165} />
      <path d="M 480 120 A 45 45 0 0 1 505 128" fill="none" stroke={GOLD} strokeWidth={2} />
      <Label x={530} y={120} title="≤ 45°" color={GOLD} anchor="start" />
      <Label x={600} y={240} title="VIRAGE" sub="L = M + M" anchor="middle" />
    </Frame>
  )
}

/** Schéma qui remplace l'image du livret, par section. */
const DIAGRAMS: Record<string, () => ReactNode> = {
  '2.3': AnglesDiagram,
  '2.5': FireAngleDiagram,
  '3.4': TreeDiagram,
  '5.2': MoveDiagram,
}

/** Schéma redessiné de la section, ou l'image d'origine du livret (fallback) s'il n'y en a pas. */
export default function SectionDiagram({ sectionId, fallback }: { sectionId?: string; fallback: ReactNode }) {
  const D = sectionId ? DIAGRAMS[sectionId] : undefined
  return <>{D ? <D /> : fallback}</>
}
