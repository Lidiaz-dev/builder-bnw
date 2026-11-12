import { Fragment } from 'react'
import type { RuleBlock } from '../data'
import UnitCard from './UnitCard'

/** Texte avec le gras du livret (**…**) et, en option, des mots surlignés par la recherche. */
export function RichText({ text, highlight }: { text: string; highlight?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <strong key={i}>
            <Mark text={p} q={highlight} />
          </strong>
        ) : (
          <Fragment key={i}>
            <Mark text={p} q={highlight} />
          </Fragment>
        ),
      )}
    </>
  )
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
