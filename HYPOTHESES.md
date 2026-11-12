# Hypothèses sur les règles

Choix faits là où les documents (Brave New World V1.8, Profils v1.5/v1.6, LA V1.4/V1.6, Ref Rapide V1.5) sont flous ou incomplets.
À valider avec l'auteur des règles ; chacune se corrige à un seul endroit.

## Création de liste

- **QG fourni** : le commandant (véhicule de commandement) et le colosse font partie de toute armée sans coûter de point.
  Les 5 ou 7 points se dépensent uniquement dans l'arbre. *(`src/lib/army.ts`, `armyUnits`)*
- **Taille des unités** : une unité est jouée à son nombre de socles maximum (« Unité » du profil). Le livret ne donne pas
  de coût par socle. *(`UnitCard`, `armyUnits`)*
- **Arbre commun** : l'arbre du livret (3.4) sert pour les quatre factions ; les PDF LA ne donnent pas d'arbre propre.
  La branche du haut va de « Véhicule léger » à « Spéciale ». *(`src/data/index.ts`, `TREE`)*
- **Retirer une unité** retire aussi celles qui la suivent sur sa ligne (sinon la liste violerait la règle Progression).

## Profils

- **Règles en bas de page des profils** (Perforation pour la Cabale, Balise mobile pour les Corporations, Relais mobile pour
  les Umbra, Protubérance frontale pour les Vespara) : rattachées à l'**unité spéciale**. Balise mobile dit « cette unité »
  et Perforation parle du canon court, arme de l'unité spéciale Cabale. *(`scripts/import_data.py`, `parse_profiles`)*
- **Relais (Umbra)** : ajouté aux unités de taille Moyen et Lourd, comme l'indique la règle « Relais d'énergie ».
- **Battle-Rig (Cabale)** : les règles Caravane alimentée et Véhicule de tête parlent du « Battle-Rig ». Il s'agit
  probablement du commandant Cabale, mais rien ne le confirme. Le texte est laissé tel quel.
- **Points de destruction** : toutes les unités valent 4 dans les profils, et le livret marque ce point « WIP ».
- **Compétences** : la section 6 est marquée « A COMPLETER ». Seules les compétences listées sont reprises
  (Anti-infanterie, Anti-aérien, Air uniquement, Sol uniquement, Rapide, Acquisition de cible).

## Assistant de partie

- **Arrivée des colosses** : au premier objectif scoré (par l'un ou l'autre joueur), les colosses **des deux joueurs** arrivent.
  Le livret dit « il arrive lorsque le premier objectif est scoré » sans préciser à qui. *(`src/lib/game.ts`, `colossusArrival`)*
- **Contrôle de zones** : le premier score de zone non nul déclenche aussi l'arrivée des colosses.
- **Drop-tokens** : +10 au début de chaque round, y compris le premier, tant que le véhicule de commandement est en jeu
  (« A chaque round »). Le pouvoir de faction ajoute 5.
- **Pass tokens** : recalculés à chaque début de round d'après les unités en jeu (colosse compris une fois arrivé).
  Les tokens non dépensés ne se cumulent pas d'un round à l'autre.
- **Énergie** : 5 par véhicule de commandement en jeu + 1 par terrain contrôlé. Après la destruction du commandant,
  le commandement passe à l'unité terrestre la plus proche mais l'assistant ne compte plus ses 5 énergies : le livret
  dit que « tous les autres bonus liés au commandement sont perdus ». La case « Véhicule de commandement en jeu » se
  recoche à la main si besoin.
