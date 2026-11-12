# Builder Brave New World

Site pour créer ses listes d'armée et jouer à **Brave New World**, jeu de figurines au format epic (10-15 mm).

- **Créateur de liste** : arbre de recrutement autour du QG Colosse, en Engagement (5 points) ou Théâtre d'opérations (7 points).
  Les règles Départ, Progression et Doublon sont vérifiées en direct ; retirer une unité retire la suite de sa ligne.
- **Fiches imprimables** (ou PDF via le navigateur) : profils des unités de la liste, infanterie, règles de faction et référence rapide.
- **Règles consultables** : livret, référence rapide, factions et profils, compétences, avec une recherche sans accents.
- **Assistant de partie** : 5 rounds et leurs phases (le premier commence à l'activation), priorité, énergie, pass tokens,
  points de destruction et de scénario pour les trois scénarios, rappels du pouvoir de faction et de l'arrivée des colosses,
  drop-tokens des Corporations, lanceur de dés explosifs. La partie en cours reste dans le navigateur.

Stack : React + TypeScript (Vite), hébergé sur GitHub Pages, comptes via Firebase (optionnel).
Sans Firebase configuré, le site fonctionne en **mode local** : les listes sont stockées dans le navigateur.

## Lancer en local

```bash
npm install
npm run dev
```

## Données du jeu

Tout est dans `src/data/`, généré à partir des PDF de règles :

| Fichier | Contenu | Source |
|---|---|---|
| `factions.json` | Factions : profils des 9 unités, infanterie, pouvoirs, règles spéciales, tableaux (drops, contamination) | `Profils <Faction> v*.pdf` + `LA <Faction> V*.pdf` |
| `rules.json` | Livret découpé en sections (paragraphes, listes, tableaux, schémas) | `Brave New World V*.pdf` |
| `skills.json` | Compétences des armes et des unités | section 6 du livret |
| `quickref.json` | Référence rapide | `Ref Rapide V*.pdf` |
| `sources.json` | Versions des documents importés | |

L'arbre de recrutement (commun aux quatre factions) est défini dans `src/data/index.ts` (`TREE`).

Pour régénérer les données après une nouvelle version des règles (le script prend la version la plus récente de chaque document) :

```bash
pip install pymupdf
python scripts/import_data.py "B:/WARHAMMER/Brave new world/Règles"
```

Les corrections du texte (fautes, « bâtiment » → « terrain », 1 dé par socle au combat de terrains, Machinegun…)
sont dans `scripts/corrections.py` et réappliquées à chaque import. Le script signale celles qui ne trouvent plus rien,
par exemple quand une faute a été corrigée directement dans les PDF.

Les choix faits sur les données floues sont listés dans [HYPOTHESES.md](HYPOTHESES.md).

## Brancher Firebase (comptes)

1. Créer un projet sur [console.firebase.google.com](https://console.firebase.google.com) (gratuit, sans Google Analytics).
2. **Authentication > Commencer**, puis activer **Adresse e-mail/Mot de passe** et **Google**.
3. **Authentication > Settings > Authorized domains** : ajouter `<utilisateur>.github.io`.
4. **Firestore Database > Créer une base de données** (mode production, région Europe), puis dans **Règles** coller `firestore.rules` et publier.
5. **Paramètres du projet > Vos applications > Web** : récupérer `apiKey`, `authDomain`, `projectId`, `appId` :
   - en local : copier `.env.example` en `.env.local` et les renseigner ;
   - pour GitHub : **Settings > Secrets and variables > Actions > Variables**, créer `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` et `VITE_FIREBASE_APP_ID`.

Une fois connecté, les listes créées en mode local peuvent être ajoutées au compte depuis la page Listes.

## Déployer sur GitHub Pages

1. Créer le dépôt sur GitHub et y pousser la branche `main`.
2. **Settings > Pages > Source : GitHub Actions**.
3. Chaque push sur `main` déploie le site (`.github/workflows/deploy.yml`).
