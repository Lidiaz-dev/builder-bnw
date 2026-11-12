import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { FACTION_COLOR, SLOT_LABEL, factionById, factions, quickref, rules, skills, sources, type RuleBlock, type SlotId } from '../data'
import { RichText, RuleBlocks } from '../components/RuleText'
import UnitCard, { InfantryCard } from '../components/UnitCard'
import FactionRules from '../components/FactionRules'

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\*\*/g, '')
    .toLowerCase()

const blockText = (b: RuleBlock) => (b.type === 'table' ? b.rows.flat().join(' ') : b.type === 'img' ? '' : b.text)

/** Sections de premier niveau (chapitres) et leurs sous-sections, pour le sommaire. */
const chapterOf = (id: string) => id.split('.')[0]

const SLOT_ORDER: SlotId[] = ['commandant', 'leger', 'moyen', 'lourd', 'artillerie', 'speciale', 'volant-leger', 'volant-moyen', 'colosse']

export default function RulesPage() {
  const params = useParams()
  const path = (params['*'] ?? '').split('/').filter(Boolean)
  const tab = path[0] ?? 'livret'
  const [q, setQ] = useState('')

  return (
    <div className="rules-page">
      <div className="rules-head">
        <h1>Règles</h1>
        <input
          type="search"
          className="search"
          placeholder="Rechercher (ZAR, bouclier, drop…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher dans les règles"
        />
      </div>
      <nav className="tabs">
        <NavLink to="/regles/livret" className={() => (tab === 'livret' && !q ? 'active' : '')}>
          Livret
        </NavLink>
        <NavLink to="/regles/rapide" className={() => (tab === 'rapide' && !q ? 'active' : '')}>
          Référence rapide
        </NavLink>
        <NavLink to="/regles/factions" className={() => (tab === 'factions' && !q ? 'active' : '')}>
          Factions et profils
        </NavLink>
        <NavLink to="/regles/competences" className={() => (tab === 'competences' && !q ? 'active' : '')}>
          Compétences
        </NavLink>
      </nav>

      {q.trim().length >= 2 ? (
        <SearchResults q={q.trim()} onPick={() => setQ('')} />
      ) : tab === 'rapide' ? (
        <div className="quick-grid">
          {quickref.map((c) => (
            <div key={c.title} className="quick-card card">
              <h3>{c.title}</h3>
              <RuleBlocks blocks={c.blocks} />
            </div>
          ))}
          <p className="muted small">Source : {sources.quickref}</p>
        </div>
      ) : tab === 'factions' ? (
        <FactionsTab factionId={path[1]} />
      ) : tab === 'competences' ? (
        <SkillsTab />
      ) : (
        <Booklet sectionId={path[1]} />
      )}
    </div>
  )
}

function Booklet({ sectionId }: { sectionId?: string }) {
  const { pathname } = useLocation()
  const chapter = chapterOf(sectionId ?? '1')
  const chapters = rules.filter((r) => r.level === 1)
  const shown = rules.filter((r) => chapterOf(r.id) === chapter)

  useEffect(() => {
    // Un effet React ne doit rien renvoyer d'autre qu'une fonction de nettoyage.
    if (sectionId) document.getElementById(`s-${sectionId}`)?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [sectionId, pathname])

  return (
    <div className="booklet">
      <nav className="toc">
        {chapters.map((c) => (
          <div key={c.id}>
            <Link to={`/regles/livret/${c.id}`} className={chapterOf(c.id) === chapter ? 'active' : ''}>
              {c.id}. {c.title}
            </Link>
            {chapterOf(c.id) === chapter && (
              <ul>
                {rules
                  .filter((r) => chapterOf(r.id) === chapter && r.level === 2)
                  .map((r) => (
                    <li key={r.id}>
                      <Link to={`/regles/livret/${r.id}`}>
                        {r.id} {r.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}
        <p className="muted small">Source : {sources.rules}</p>
      </nav>
      <article className="rule-body">
        {shown.map((s) => {
          const H = (`h${Math.min(s.level + 1, 5)}`) as 'h2'
          return (
            <section key={s.id} id={`s-${s.id}`} className={`rule-section lvl-${s.level}`}>
              <H>
                <span className="sec-num">{s.id}</span> {s.title}
              </H>
              {/A COMPLETER|WIP/.test(s.blocks.map(blockText).join(' ')) && <p className="warn small">Section marquée comme en cours d'écriture dans le livret.</p>}
              <RuleBlocks blocks={s.blocks} />
            </section>
          )
        })}
        <div className="row between chapter-nav">
          {Number(chapter) > 1 ? <Link to={`/regles/livret/${Number(chapter) - 1}`}>← Chapitre précédent</Link> : <span />}
          {chapters.some((c) => c.id === String(Number(chapter) + 1)) && <Link to={`/regles/livret/${Number(chapter) + 1}`}>Chapitre suivant →</Link>}
        </div>
      </article>
    </div>
  )
}

function FactionsTab({ factionId }: { factionId?: string }) {
  const faction = factionById(factionId ?? '') ?? factions[0]
  return (
    <div style={{ ['--faction' as string]: FACTION_COLOR[faction.id] }}>
      <nav className="faction-tabs">
        {factions.map((f) => (
          <NavLink
            key={f.id}
            to={`/regles/factions/${f.id}`}
            className={() => (f.id === faction.id ? 'active' : '')}
            style={{ ['--faction' as string]: FACTION_COLOR[f.id] }}
          >
            {f.name}
          </NavLink>
        ))}
      </nav>
      <section className="card">
        <h2>{faction.name}</h2>
        {faction.background && <p className="lore-text">{faction.background}</p>}
        {faction.lore && <p className="lore-text">{faction.lore}</p>}
        <FactionRules faction={faction} />
        <p className="muted small">
          Sources : {faction.sources.profiles}, {faction.sources.list}
        </p>
      </section>
      <div className="cards-2">
        {SLOT_ORDER.map((s) => (
          <UnitCard key={s} faction={faction} profile={faction.units[s]} badge={s === 'colosse' ? 'Arrive en cours de partie' : undefined} />
        ))}
        <InfantryCard faction={faction} />
      </div>
    </div>
  )
}

function SkillsTab() {
  const intro = rules.find((r) => r.id === '6')
  return (
    <section className="card">
      {intro && <p className="warn small">Le livret indique que cette section est encore à compléter.</p>}
      <dl className="special-rules">
        {skills.map((s) => (
          <div key={s.id}>
            <dt>{s.name}</dt>
            <dd>{s.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

interface Hit {
  key: string
  title: string
  to: string
  snippet: string
}

function SearchResults({ q, onPick }: { q: string; onPick: () => void }) {
  const hits = useMemo(() => {
    const n = norm(q)
    const out: Hit[] = []
    for (const s of rules) {
      const text = s.blocks.map(blockText).join(' ')
      if (norm(s.title).includes(n) || norm(text).includes(n)) {
        out.push({ key: `r${s.id}`, title: `${s.id} ${s.title}`, to: `/regles/livret/${s.id}`, snippet: around(text, n) })
      }
    }
    for (const c of quickref) {
      const text = c.blocks.map(blockText).join(' ')
      if (norm(c.title + ' ' + text).includes(n)) out.push({ key: `q${c.title}`, title: `Référence rapide · ${c.title}`, to: '/regles/rapide', snippet: around(text, n) })
    }
    for (const sk of skills) {
      if (norm(sk.name + ' ' + sk.text).includes(n)) out.push({ key: `k${sk.id}`, title: `Compétence · ${sk.name}`, to: '/regles/competences', snippet: sk.text })
    }
    for (const f of factions) {
      const parts: [string, string][] = [
        ['Pouvoir de faction', f.factionPower],
        ['Pouvoir de colosse', f.colossusPower],
        ...f.specialRules.map((r) => [r.name, r.text.join(' ')] as [string, string]),
        ...f.tables.flatMap((t) => t.rows.map((r) => [r[1] ?? '', r.join(' ')] as [string, string])),
        ...SLOT_ORDER.flatMap((s) => f.units[s].rules.map((r) => [`${SLOT_LABEL[s]} · ${r.name}`, r.text] as [string, string])),
      ]
      for (const [name, text] of parts) {
        if (norm(name + ' ' + text).includes(n)) out.push({ key: `f${f.id}${name}${text.slice(0, 20)}`, title: `${f.name} · ${name}`, to: `/regles/factions/${f.id}`, snippet: around(text, n) })
      }
    }
    return out
  }, [q])

  return (
    <div className="search-results">
      <p className="muted small">
        {hits.length} résultat{hits.length > 1 ? 's' : ''}
      </p>
      {hits.map((h) => (
        <Link key={h.key} to={h.to} className="card hit" onClick={onPick}>
          <strong>
            <RichText text={h.title} highlight={q} />
          </strong>
          <span className="small">
            <RichText text={h.snippet} highlight={q} />
          </span>
        </Link>
      ))}
    </div>
  )
}

/** Extrait d'environ 200 caractères autour de la première occurrence. */
function around(text: string, n: string) {
  const clean = text.replace(/\*\*/g, '')
  const at = norm(clean).indexOf(n)
  if (at < 0) return clean.slice(0, 200) + (clean.length > 200 ? '…' : '')
  const start = Math.max(0, at - 80)
  return (start ? '…' : '') + clean.slice(start, start + 220) + (start + 220 < clean.length ? '…' : '')
}
