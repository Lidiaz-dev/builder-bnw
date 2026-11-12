/**
 * Lexique affiché en infobulle dans les règles : un terme est souligné (première occurrence
 * de chaque paragraphe) et sa définition apparaît au survol ou au toucher.
 */
export const GLOSSARY: Record<string, string> = {
  ZAR: "Zone d'affrontement rapproché : à la fin d'un mouvement, toutes les unités à M s'attaquent en simultané. Pas de boucliers ni de modificateurs.",
  LOS: 'Ligne de vue (Line of sight) : ce que voit une unité. Les terrains et les unités de taille égale ou supérieure la bloquent.',
  DEF: 'Défense : chaque palier est un point de vie. Il faut égaler le palier en réussites pour retirer ce point de vie.',
  PV: 'Point de vie : un par palier de DEF.',
  Rapide: '-1 pour être touché pendant tout le round. Gagné avec une action majeure de mouvement.',
  'prise de position': "Envoyer de l'infanterie dans un terrain à S : 1 + le nombre de réussites sur 4D.",
  'pass token': "Permet de passer son tour pendant la phase d'activation, à la place d'activer une unité.",
  S: 'Réglette S = 3 pouces.',
  M: 'Réglette M = 6 pouces.',
  L: 'Réglette L = 12 pouces.',
}

/** Clé du lexique pour un mot trouvé dans le texte. */
export function glossaryKey(word: string): string | null {
  if (word in GLOSSARY) return word
  const low = word.toLowerCase()
  if (low.startsWith('prise de position')) return 'prise de position'
  if (low.startsWith('pass token')) return 'pass token'
  return null
}

/**
 * Renvois (« cf 5.2.1 », « voir section « 2.3.2.2 … »), puis termes du lexique.
 * Les réglettes S/M/L ne sont reconnues qu'après « à », « de », « en », « +1 »… pour ne pas
 * confondre avec A/M/B ou une lettre isolée.
 */
export const TOKEN =
  /(?<ref>(?:cf\.?|voir(?: section)?)\s*«?\s*)(?<id>\d+(?:\.\d+)+)|(?<term>\bZAR\b|\bLOS\b|\bDEF\b|\bPV\b|\bRapide\b(?! [23])|[Pp]rise de position|[Pp]ass tokens?|(?<=(?:^|[\s(])(?:à|de|en|plus de|\+1|1)\s?)[SML](?![\w/"']))/g
