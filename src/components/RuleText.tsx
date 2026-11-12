import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { rules, type RuleBlock } from '../data'
import { GLOSSARY, TOKEN, glossaryKey } from '../lib/glossary'
import UnitCard from './UnitCard'

const SECTION_IDS = new Set(rules.map((r) => r.id))
const EXAMPLE_START = /^(?:\*\*)?Exemple(?:\*\*)?\s*:\s*/
const EXAMPLE_NEXT = /^(?:\*\*)?(?:Cas n°|Dans des tirs)/

/**
 * Texte avec le gras du livret (**…**), les renvois « cf 5.2.1 » en liens, les termes du lexique
 * en infobulle (première occurrence du paragraphe) et, en option, les mots cherchés surlignés.
 */
export function RichText({ text, highlight, plain }: { text: string; highlight?: string; plain?: boolean }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  const seen = new Set<string>()
  return (
    <>
      {parts.map((p, i) => {
        const inner = plain ? <Mark text={p} q={highlight} /> : decorate(p, highlight, seen)
        return i % 2 ? <strong key={i}>{inner}</strong> : <Fragment key={i}>{inner}</Fragment>
      })}
    </>
  )
}

function decorate(text: string, q: string | undefined, seen: Set<string>): ReactNode {
  const out: ReactNode[] = []
  let from = 0
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0
    const g = m.groups ?? {}
    if (g.id) {
      if (!SECTION_IDS.has(g.id)) continue
      const start = at + g.ref.length
      out.push(<Mark key={`t${from}`} text={text.slice(from, start)} q={q} />)
      out.push(
        <Link key={`r${at}`} to={`/regles/livret/${g.id}`} className="xref" title={`Aller à la section ${g.id}`}>
          {g.id}
        </Link>,
      )
      from = start + g.id.length
    } else if (g.term) {
      const key = glossaryKey(g.term)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(<Mark key={`t${from}`} text={text.slice(from, at)} q={q} />)
      out.push(
        <span key={`g${at}`} className="term" tabIndex={0} data-tip={GLOSSARY[key]}>
          <Mark text={g.term} q={q} />
        </span>,
      )
      from = at + g.term.length
    }
  }
  out.push(<Mark key={`t${from}`} text={text.slice(from)} q={q} />)
  return out
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Mark({ text, q }: { text: string; q?: string }) {
  if (!q || q.length < 2) return <>{text}</>
  const hay = norm(text)
  const needle = norm(q)
  const out = []
  let from = 0
  let at = hay.indexOf(needle)
  while (at >= 0) {
    out.push(text.slice(from, at))
    out.push(<mark key={at}>{text.slice(at, at + needle.length)}</mark>)
    from = at + needle.length
    at = hay.indexOf(needle, from)
  }
  out.push(text.slice(from))
  return <>{out}</>
}

/** Blocs d'une section de règles : paragraphes, listes (avec niveaux), tableaux et schémas. */
export function RuleBlocks({ blocks, highlight }: { blocks: RuleBlock[]; highlight?: string }) {
  const out = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.type === 'li') {
      const items = []
      while (i < blocks.length && blocks[i].type === 'li') {
        const li = blocks[i] as Extract<RuleBlock, { type: 'li' }>
        items.push(
          <li key={i} className={`lvl-${li.level ?? 0}${/^(\d+|[a-h]|[ivx]+)\.\s/.test(li.text) ? ' ord' : ''}`}>
            <RichText text={li.text} highlight={highlight} />
          </li>,
        )
        i++
      }
      i--
      out.push(
        <ul key={`ul${i}`} className="rule-list">
          {items}
        </ul>,
      )
    } else if (b.type === 'p' && EXAMPLE_START.test(b.text)) {
      // Un exemple et ses « Cas n°… » qui suivent : encadré à part, pour le distinguer de la règle.
      const lines: string[] = [b.text.replace(EXAMPLE_START, '')]
      while (i + 1 < blocks.length && blocks[i + 1].type === 'p' && EXAMPLE_NEXT.test((blocks[i + 1] as { text: string }).text)) {
        i++
        lines.push((blocks[i] as { text: string }).text)
      }
      const split = lines.flatMap((l) => l.split(/\s(?=(?:\*\*)?Cas n°\s?\d)/))
      out.push(
        <div key={i} className="example">
          <span className="example-label">Exemple</span>
          {split.map((l, k) => (
            <p key={k}>
              <RichText text={l} highlight={highlight} />
            </p>
          ))}
        </div>,
      )
    } else if (b.type === 'p') {
      out.push(
        <p key={i}>
          <RichText text={b.text} highlight={highlight} />
        </p>,
      )
    } else if (b.type === 'table') {
      const width = Math.max(...b.rows.map((r) => r.length))
      out.push(
        <div key={i} className="table-wrap">
          <table className="rule-table">
            <tbody>
              {b.rows.map((r, j) => (
                <tr key={j}>
                  {r.map((c, k) => (
                    <td key={k} colSpan={k === r.length - 1 ? width - r.length + 1 : 1}>
                      <RichText text={c} highlight={highlight} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else if (b.type === 'profile') {
      out.push(
        <div key={i} className="rule-profile">
          <UnitCard faction={{ name: b.profile.faction }} profile={b.profile} />
        </div>,
      )
    } else {
      out.push(
        <figure key={i} className="rule-img">
          <img src={`./${b.src}`} alt="Schéma du livret de règles" loading="lazy" />
        </figure>,
      )
    }
  }
  return <>{out}</>
}
