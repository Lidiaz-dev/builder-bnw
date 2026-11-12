import type { ReactNode } from 'react'

/**
 * Encadrés « En bref » affichés au-dessus du texte des sections qu'on consulte en cours de partie.
 * Ils résument la règle sans la remplacer : le texte complet du livret reste en dessous.
 */

function Summary({ children }: { children: ReactNode }) {
  return (
    <div className="summary">
      <span className="summary-label">En bref</span>
      {children}
    </div>
  )
}

/** Étapes numérotées en frise. `dashed` : indices des étapes à afficher en pointillés. */
function Flow({ steps, dashed = [] }: { steps: [string, ReactNode][]; dashed?: number[] }) {
  return (
    <ol className="round-flow">
      {steps.map(([name, what], i) => (
        <li key={name} className={dashed.includes(i) ? 'skip-r1' : undefined}>
          <strong>{name}</strong>
          <span>{what}</span>
        </li>
      ))}
    </ol>
  )
}

function KeyTable({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <table className="rule-table compact-table">
      <thead>
        <tr>
          <th>{head[0]}</th>
          <th className="num">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i}>
            <td>{a}</td>
            <td className="num">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Petits blocs « titre + liste » côte à côte. */
function Cols({ cols }: { cols: [string, ReactNode[]][] }) {
  return (
    <div className="summary-cols">
      {cols.map(([title, items]) => (
        <div key={title}>
          <h5>{title}</h5>
          <ul>
            {items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

const SUMMARIES: Record<string, ReactNode> = {
  '2.3.1': (
    <Summary>
      <div className="row wrap summary-tables">
        <KeyTable
          head={['Angle touché', 'DEF']}
          rows={[
            ['Front', '—'],
            ['Flanc', '−1'],
            ['Arrière', '−2'],
          ]}
        />
        <ul className="summary-notes">
          <li>L'angle dépend de l'endroit où se trouve majoritairement l'attaquant (son leader).</li>
          <li>Le front est le petit côté du socle (le grand côté pour un colosse, qui n'a pas de malus de flanc).</li>
          <li>Pas d'angle pour une unité aérienne visée par une unité au sol.</li>
        </ul>
      </div>
    </Summary>
  ),

  '4.1': (
    <Summary>
      <Flow
        dashed={[0, 1, 2]}
        steps={[
          ['Début de round', 'Effets de début de round, pass tokens'],
          ["Phase d'énergie", "Distribuer l'énergie en alternance"],
          ["Phase d'ordres", 'Pions ordre face cachée'],
          ["Phase d'activation", 'Activer une unité ou passer, en alternance'],
          ['Combat de terrains', 'Jets en opposition dans les terrains contestés'],
          ['Phase de fin', 'Points des objectifs, transfert de la priorité'],
          ['Nettoyage', 'Ramasser ordres et énergie'],
        ]}
      />
      <p className="small muted">Les phases en pointillés n'ont pas lieu au premier round, qui commence directement à l'activation.</p>
    </Summary>
  ),

  '4.2': (
    <Summary>
      <Cols
        cols={[
          ["D'où vient l'énergie", ['5 par véhicule de commandement', '1 par terrain contrôlé']],
          [
            'Qui peut en recevoir',
            [
              'Une unité à L du commandant et en ligne de vue',
              "Toute l'énergie en une seule fois, une seule fois par phase",
              'Au maximum sa puissance A/M/B dans chaque système',
            ],
          ],
          [
            'Ce que ça donne (tout le round)',
            [
              <>
                <strong>Armes</strong> : +1 réussite auto. à chaque attaque
              </>,
              <>
                <strong>Moteurs</strong> : +1 S de mouvement en avant, obligatoire
              </>,
              <>
                <strong>Boucliers</strong> : +1 réussite auto. aux boucliers
              </>,
            ],
          ],
        ]}
      />
      <p className="small muted">L'énergie non distribuée est perdue.</p>
    </Summary>
  ),

  '5.1': (
    <Summary>
      <Flow
        steps={[
          ['Annoncer', 'Toutes les armes et toutes les cibles, avant de tirer'],
          ['Pool de dés', "Tirs de l'arme × socles en ligne de vue (armes de même nom jumelables)"],
          ['Jet', 'Réussite sur 4+, modificateurs, + réussites auto. (énergie Armes)'],
          ['Boucliers', 'Le défenseur lance son bouclier par socle menacé ; chaque réussite en annule une'],
          ['Dégâts', '1 PV perdu par palier de DEF atteint'],
          ['Moral', 'Test si au moins un socle a été retiré'],
        ]}
      />
      <div className="row wrap summary-tables">
        <KeyTable
          head={['Modificateur', 'Effet']}
          rows={[
            ['Cible à mi-portée', '+1 pour toucher'],
            ['Cible Rapide', '−1 pour toucher'],
            ['Cible aérienne (tir depuis le sol)', '−1 pour toucher'],
            ['Tireur endommagé', '−1 réussite par PV manquant'],
            ['Cible à couvert', '+1 à chaque palier de DEF'],
          ]}
        />
      </div>
    </Summary>
  ),

  '5.1.7': (
    <Summary>
      <Cols
        cols={[
          [
            'Quand',
            ["Un socle retiré pendant une attaque ou une ZAR", 'Une unité alliée détruite à M', "Une infanterie qui perd un effectif"],
          ],
          [
            'Le jet',
            [
              <>
                <strong>3D</strong>, il faut au moins <strong>1 réussite</strong>
              </>,
              '+1D si aucun ennemi à M (facultatif)',
              '+1D si à L du commandant allié (facultatif)',
              '−1 réussite par socle retiré (obligatoire)',
            ],
          ],
          [
            'En cas d’échec',
            [
              <>
                <strong>Véhicule</strong> : recule de S (1 PV perdu si bloqué)
              </>,
              <>
                <strong>Infanterie</strong> : subit une perte
              </>,
              <>
                <strong>Aérien</strong> : subit un dégât (jet sans bonus ni malus)
              </>,
            ],
          ],
        ]}
      />
    </Summary>
  ),

  '5.2.2': (
    <Summary>
      <p className="small">Dés d'éperonnage par socle = dés de taille + dés de vitesse.</p>
      <div className="row wrap summary-tables">
        <KeyTable
          head={['Taille', 'Dés']}
          rows={[
            ['Léger', 1],
            ['Moyen', 3],
            ['Lourd', 6],
          ]}
        />
        <KeyTable
          head={['Vitesse (réglette)', 'Dés']}
          rows={[
            ['S (3")', 2],
            ['M (6")', 3],
            ['L (12")', 5],
          ]}
        />
      </div>
      <p className="small muted">Exemple : un char lourd lancé sur une réglette L jette 6 + 5 = 11 dés.</p>
    </Summary>
  ),

  '5.2.3': (
    <Summary>
      <Cols
        cols={[
          ['Quand', ['À la fin de toute action de mouvement (après les prises de position)']],
          [
            'Qui',
            [
              "Toutes les unités à M de l'unité active, chacune choisit une cible",
              'Une unité ciblée choisit à son tour une cible à M',
              'Pas les unités aériennes, ni les infanteries en combat de terrains',
            ],
          ],
          [
            'Comment',
            [
              "Toutes les attaques sont simultanées, avec la valeur ZAR de l'unité",
              'Contre la DEF non modifiée',
              'Ni boucliers, ni modificateurs, ni énergie',
            ],
          ],
        ]}
      />
    </Summary>
  ),
}

/** Encadré « En bref » d'une section, s'il y en a un. */
export default function RuleSummary({ id }: { id: string }) {
  return <>{SUMMARIES[id] ?? null}</>
}
