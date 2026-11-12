import { Link } from 'react-router-dom'
import { FACTION_COLOR, factions, rules, sources } from '../data'

export default function HomePage() {
  const lore = rules.find((r) => r.id === '1')
  return (
    <div className="home">
      <section className="hero">
        <div>
        <p className="eyebrow">Système Noctua · format epic 10-15 mm</p>
        <h1>Brave New World</h1>
        <p className="lead">
          Composez votre armée dans l'arbre de recrutement, imprimez vos fiches d'unités et suivez la partie round après
          round : énergie, ordres, objectifs et points de victoire.
        </p>
        <div className="row wrap">
          <Link to="/listes" className="btn primary">
            Créer une liste
          </Link>
          <Link to="/partie" className="btn">
            Assistant de partie
          </Link>
          <Link to="/regles" className="btn ghost">
            Consulter les règles
          </Link>
        </div>
        </div>
        <figure className="poster">
          <img src="./img/identite/affiche.jpg" alt="Affiche de Brave New World : une planète et un vaisseau dans l'espace" />
        </figure>
      </section>

      <section className="faction-grid">
        {factions.map((f) => (
          <Link key={f.id} to={`/regles/factions/${f.id}`} className="faction-tile" style={{ ['--faction' as string]: FACTION_COLOR[f.id] }}>
            <h2>{f.name}</h2>
            <p>{(f.background ?? f.lore ?? '').split('. ').slice(0, 2).join('. ')}.</p>
            <span className="small muted">Pouvoir : {f.factionPower}</span>
          </Link>
        ))}
      </section>

      {lore && (
        <section className="card lore">
          <h2>Noctua</h2>
          {lore.blocks.slice(0, 1).map((b, i) => (b.type === 'p' ? <p key={i}>{b.text.replace(/\*\*/g, '')}</p> : null))}
          <Link to="/regles/livret/1" className="small">
            Lire la suite →
          </Link>
        </section>
      )}

      <p className="muted small center">
        Règles : {sources.rules} · {sources.quickref}
      </p>
    </div>
  )
}
