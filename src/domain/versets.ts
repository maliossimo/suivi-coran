/**
 * Calculs sur les versets, indépendants de la base de données.
 *
 * Chaque verset du Coran a un index global de 1 à 6236. Un passage
 * « sourate:verset → sourate:verset » devient un intervalle [début, fin]
 * de ces index, ce qui permet de compter les versets distincts travaillés
 * (sans doublon quand un même passage est révisé plusieurs fois).
 */

export const TOTAL_VERSETS = 6236;

export interface Sourate {
  numero: number;
  nomAr: string;
  nomLatin: string;
  nbVersets: number;
  premierVersetGlobal: number;
}

export interface Passage {
  sourateDebut: number;
  versetDebut: number;
  sourateFin: number;
  versetFin: number;
}

/** Intervalle fermé d'index globaux. */
export type Intervalle = readonly [debut: number, fin: number];

export type Referentiel = ReadonlyMap<number, Sourate>;

export function creerReferentiel(sourates: readonly Sourate[]): Referentiel {
  return new Map(sourates.map((s) => [s.numero, s]));
}

function sourateOuErreur(ref: Referentiel, numero: number): Sourate {
  const s = ref.get(numero);
  if (!s) throw new Error(`Sourate inconnue : ${numero}`);
  return s;
}

/** Index global (1..6236) d'un verset. */
export function indexGlobal(ref: Referentiel, sourate: number, verset: number): number {
  const s = sourateOuErreur(ref, sourate);
  if (!Number.isInteger(verset) || verset < 1 || verset > s.nbVersets) {
    throw new Error(`Verset ${verset} hors de la sourate ${s.nomLatin} (1-${s.nbVersets})`);
  }
  return s.premierVersetGlobal + verset - 1;
}

/** Valide un passage et le convertit en intervalle global. */
export function versIntervalle(ref: Referentiel, p: Passage): Intervalle {
  const debut = indexGlobal(ref, p.sourateDebut, p.versetDebut);
  const fin = indexGlobal(ref, p.sourateFin, p.versetFin);
  if (debut > fin) throw new Error("Le début du passage est après la fin");
  return [debut, fin];
}

/** Fusionne des intervalles qui se chevauchent ou se touchent. */
export function fusionner(intervalles: readonly Intervalle[]): Intervalle[] {
  const tries = [...intervalles].sort((a, b) => a[0] - b[0]);
  const resultat: [number, number][] = [];
  for (const [debut, fin] of tries) {
    const dernier = resultat[resultat.length - 1];
    if (dernier && debut <= dernier[1] + 1) {
      dernier[1] = Math.max(dernier[1], fin);
    } else {
      resultat.push([debut, fin]);
    }
  }
  return resultat;
}

/** Nombre de versets distincts couverts par des passages. */
export function nbVersetsDistincts(ref: Referentiel, passages: readonly Passage[]): number {
  return fusionner(passages.map((p) => versIntervalle(ref, p))).reduce(
    (total, [debut, fin]) => total + (fin - debut + 1),
    0,
  );
}

/** Part du Coran (en %, arrondie à 0,1) représentée par un nombre de versets. */
export function pourcentageDuCoran(nbVersets: number): number {
  return Math.round((nbVersets / TOTAL_VERSETS) * 1000) / 10;
}

/** Libellé lisible d'un passage, ex. « Al-Mulk الملك 1 → 15 ». */
export function libellePassage(ref: Referentiel, p: Passage): string {
  const d = sourateOuErreur(ref, p.sourateDebut);
  if (p.sourateDebut === p.sourateFin) {
    return `${d.nomLatin} ${d.nomAr} ${p.versetDebut} → ${p.versetFin}`;
  }
  const f = sourateOuErreur(ref, p.sourateFin);
  return `${d.nomLatin} ${d.nomAr} ${p.versetDebut} → ${f.nomLatin} ${f.nomAr} ${p.versetFin}`;
}
