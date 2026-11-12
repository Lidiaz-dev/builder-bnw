"""
Corrections appliquées au texte des PDF à chaque import (fautes, vocabulaire, décisions de règles).

Chaque entrée : (motif regex, remplacement, raison). Le script d'import signale les motifs qui ne
trouvent plus rien (texte corrigé à la source dans une nouvelle version des PDF) : on peut alors les retirer.
"""

import re

CORRECTIONS: list[tuple[str, str, str]] = [
    # --- Décisions de règles ---------------------------------------------------------------
    (r"\bbâtiment(s?)\b", r"terrain\1", "vocabulaire : « terrain » partout"),
    (r"1 dé pour chaque véhicule allié à M", "1 dé pour chaque socle allié à M", "combat de terrains : 1 dé par socle (4.5)"),
    (r"\bGatling\b", "Machinegun", "nom de la tourelle des drops"),
    (r"Avec les profils génériques, toutes les unités", "Toutes les unités", "plus de profils génériques"),
    # --- Accords et orthographe -------------------------------------------------------------
    (r"reçevoir", "recevoir", "orthographe"),
    (r"\bLes copros\b", "Les corpos", "faute de frappe"),
    (r"en contacte socle", "en contact socle", "orthographe"),
    (r"\buniqement\b", "uniquement", "faute de frappe"),
    (r"\bcontrolé(e?s?)\b", r"contrôlé\1", "accent"),
    (r"Une l'unité peut tirer", "Une unité peut tirer", "faute de frappe"),
    (r"Ses avants-gardes", "Ses avant-gardes", "orthographe"),
    (r"gamme de figurine dédiée", "gamme de figurines dédiée", "accord"),
    (r"A aucun moment une réussite peut être", "À aucun moment une réussite ne peut être", "négation"),
    (r"(boucliers(?:\*\*)?), donnes des", r"\1, donne des", "conjugaison"),
    (r"quand-même", "quand même", "orthographe"),
    (r"elle fait faire une", "elle peut faire une", "faute de frappe"),
    (r"pour les défenseur infanterie", "pour les défenseurs d'infanterie", "accord"),
    (r"-1 a la def de l'infanterie", "-1 à la DEF de l'infanterie", "accent"),
    (r"points de vie égale au nombre", "points de vie égal au nombre", "accord"),
    (r"(D(?:\*\*)?) supplémentaire sont ((?:\*\*)?)facultatif\b", r"\1 supplémentaires sont \2facultatifs", "accord"),
    (r"L'action majeur de mouvement", "L'action majeure de mouvement", "accord"),
    (r"deux type de rencontre", "deux types de rencontre", "accord"),
    (r"Il est possible de recruter une unité avancée que si", "Il n'est possible de recruter une unité avancée que si", "négation"),
    (r"Chaque drop peut être appelé qu'une fois", "Chaque drop ne peut être appelé qu'une fois", "négation"),
    (r"à plus de ((?:\*\*)?M(?:\*\*)?) tout autre objectif", r"à plus de \1 de tout autre objectif", "mot manquant"),
    (r"\b(une cible|adaptative|unités|mouvement) a ([SML])\b", r"\1 à \2", "accent"),
    (r"Quand une unité fini un mouvement", "Quand une unité finit un mouvement", "conjugaison"),
    (r"une unité allié qui a perdu un ou plusieurs socle\b", "une unité alliée qui a perdu un ou plusieurs socles", "accord"),
    (r"unités alliés d'infanterie", "unités alliées d'infanterie", "accord"),
    (r"Une infanterie allié\b", "Une infanterie alliée", "accord"),
    (r"Portes piégés", "Portes piégées", "accord"),
    (r"la DEF du défenseur est diminué de 1", "la DEF du défenseur est diminuée de 1", "accord"),
    (r"l'unité est toujours considéré comme", "l'unité est toujours considérée comme", "accord"),
    (r"Maître de la Solaryn\b", "Maître de la Solaryne", "orthographe"),
    (r"d'unités ennemi,", "d'unités ennemies,", "accord"),
    (r"pion face caché :", "pion face cachée :", "accord"),
    (r"Peut recevoir de l'énergie et de faire relais", "Peut recevoir de l'énergie et faire relais", "syntaxe"),
    (r"lignes de vues\b", "lignes de vue", "orthographe"),
    (r"être parallèle les uns aux autres", "être parallèles les uns aux autres", "accord"),
    (r"le nombre d'énergie maximale", "le nombre maximal d'énergie", "syntaxe"),
    (r"ou ((?:\*\*)?)l'effet commencé", r"ou \1effet commencé", "syntaxe"),
    (r"ils augmentent leurs chitines", "elles renforcent leur chitine", "accord"),
    (r"autant de pass token que", "autant de pass tokens que", "accord"),
    (r"du commandant, a le droit", "du commandant, elle a le droit", "sujet manquant"),
    (r"Tous les drop ont", "Tous les drops ont", "accord"),
    (r"un ou plusieurs drop dépensé", "un ou plusieurs drops dépensé", "accord"),
    (r"\bEradication\b", "Éradication", "accent"),
    (r"(^|[.:!?] )A (?=[a-zàâéèêl0-9])", r"\1À ", "accent sur la majuscule"),
]

_COMPILED = [(re.compile(p), r, why) for p, r, why in CORRECTIONS]

# Champs à ne jamais modifier (identifiants, chemins).
SKIP_KEYS = {"id", "src", "slot", "bonus", "type", "profiles", "list", "rules_file"}


class Corrector:
    def __init__(self):
        self.hits = [0] * len(_COMPILED)

    def text(self, s: str) -> str:
        for i, (rx, rep, _) in enumerate(_COMPILED):
            s, n = rx.subn(rep, s)
            self.hits[i] += n
        return s

    def walk(self, data, key=None):
        if isinstance(data, str):
            return data if key in SKIP_KEYS else self.text(data)
        if isinstance(data, list):
            return [self.walk(x, key) for x in data]
        if isinstance(data, dict):
            return {k: self.walk(v, k) for k, v in data.items()}
        return data

    def report(self):
        total = sum(self.hits)
        unused = [CORRECTIONS[i][0] for i, n in enumerate(self.hits) if n == 0]
        print(f"Corrections : {total} remplacements")
        for p in unused:
            print(f"  ! sans effet (déjà corrigé dans les PDF ?) : {p}")
