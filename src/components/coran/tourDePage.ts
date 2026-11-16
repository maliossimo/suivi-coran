/**
 * Mushaf : sens du dernier tour de page demandé (glissement ou flèches). La nouvelle page, qui
 * remplace l'ancienne, le lit en arrivant pour entrer du bon côté (la suivante arrive par la gauche,
 * comme dans un mushaf). Lu une seule fois.
 */
export type SensTour = "suivante" | "precedente";

let sens: SensTour | null = null;
let quand = 0;

export function annoncerTourDePage(s: SensTour): void {
  sens = s;
  quand = Date.now();
}

/** Le sens annoncé il y a moins de 5 s (sinon : arrivée sans animation), puis oublié. */
export function lireTourDePage(): SensTour | null {
  const s = Date.now() - quand < 5000 ? sens : null;
  sens = null;
  return s;
}
