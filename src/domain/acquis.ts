/**
 * « Ce que je connais déjà » : les parties du Coran que l'élève savait en arrivant,
 * les juz du mushaf, et le décompte en pages. Code pur, testé.
 */
import type { DateISO } from "./calendrier";
import type { Seance } from "./fiche";
import { fusionner, versIntervalle, type Intervalle, type Passage, type Referentiel } from "./versets";

export interface Acquis {
  id: string;
  eleveId: string;
  passage: Passage;
  /** L'élève veut que son Cheikh écoute cette partie. */
  aEcouter: boolean;
  ecoute: boolean;
  valide: boolean;
  creeLe: string;
}

/** Mushaf de Médine (604 pages) : pour chaque page, les tranches [sourate, premier verset, dernier verset]. */
export interface DecoupageMushaf {
  pages: (readonly [number, number, number])[][];
  /** Page de début de chaque juz (30). */
  juz: number[];
}

/** Les 30 juz, chacun comme un passage (de son premier à son dernier verset). */
export function passagesDesJuz(decoupage: DecoupageMushaf): Passage[] {
  return decoupage.juz.map((debut, i) => {
    const fin = (decoupage.juz[i + 1] ?? decoupage.pages.length + 1) - 1;
    const premiere = decoupage.pages[debut - 1]![0]!;
    const derniere = decoupage.pages[fin - 1]!.at(-1)!;
    return {
      sourateDebut: premiere[0],
      versetDebut: premiere[1],
      sourateFin: derniere[0],
      versetFin: derniere[2],
    };
  });
}

/** Une sourate entière, ou de la sourate `a` à la sourate `b`, comme passage. */
export function passageDeSourates(ref: Referentiel, a: number, b: number): Passage | null {
  const debut = ref.get(Math.min(a, b));
  const fin = ref.get(Math.max(a, b));
  if (!debut || !fin) return null;
  return { sourateDebut: debut.numero, versetDebut: 1, sourateFin: fin.numero, versetFin: fin.nbVersets };
}

function intervallesDe(ref: Referentiel, passages: readonly Passage[]): Intervalle[] {
  return passages.flatMap((p) => {
    try {
      return [versIntervalle(ref, p)];
    } catch {
      return [];
    }
  });
}

function couverture(fusion: readonly Intervalle[], a: number, b: number): number {
  let n = 0;
  for (const [x, y] of fusion) {
    if (y < a || x > b) continue;
    n += Math.min(y, b) - Math.max(x, a) + 1;
  }
  return n;
}

/** Juz entièrement couverts par des passages (numéros 1 à 30). */
export function juzCouverts(
  ref: Referentiel,
  decoupage: DecoupageMushaf,
  passages: readonly Passage[],
): number[] {
  const fusion = fusionner(intervallesDe(ref, passages));
  return passagesDesJuz(decoupage).flatMap((juz, i) => {
    try {
      const [a, b] = versIntervalle(ref, juz);
      return couverture(fusion, a, b) >= b - a + 1 ? [i + 1] : [];
    } catch {
      return [];
    }
  });
}

/**
 * Pages du mushaf apprises : une page commencée compte pour la part de ses versets appris
 * (ex. 3 versets sur 6 : une demi-page). Avec le nombre de juz complets.
 */
export function pagesApprises(
  ref: Referentiel,
  decoupage: DecoupageMushaf,
  intervalles: readonly Intervalle[],
): { pages: number; juzComplets: number } {
  const fusion = fusionner(intervalles);
  const parPage = decoupage.pages.map((tranches) => {
    let total = 0;
    let appris = 0;
    for (const [sourate, debut, fin] of tranches) {
      const s = ref.get(sourate);
      if (!s) continue;
      const a = s.premierVersetGlobal + debut - 1;
      const b = s.premierVersetGlobal + fin - 1;
      total += b - a + 1;
      appris += couverture(fusion, a, b);
    }
    return total ? appris / total : 0;
  });
  const pages = parPage.reduce((t, x) => t + x, 0);
  let juzComplets = 0;
  decoupage.juz.forEach((debut, i) => {
    const fin = (decoupage.juz[i + 1] ?? decoupage.pages.length + 1) - 1;
    if (parPage.slice(debut - 1, fin).every((x) => x >= 1)) juzComplets++;
  });
  return { pages, juzComplets };
}

/**
 * Les acquis vus comme des séances (sans durée), pour la progression et la carte du Coran :
 * une séance d'apprentissage et une de révision, au jour de la déclaration (la partie est connue
 * et « fraîche » ce jour-là). Une partie que l'élève ne fait pas écouter compte comme vue.
 */
export function seancesDesAcquis(
  acquis: readonly Acquis[],
  jourDe: (horodatage: string) => DateISO,
): Seance[] {
  return acquis.flatMap((a) => {
    const passage: Passage = {
      ...a.passage,
      corrige: a.ecoute || a.valide || !a.aEcouter,
      valide: a.valide,
    };
    const base = { date: jourDe(a.creeLe), dureeMin: 0, tajwid: null, noteLibre: null, corrigee: false };
    return [
      { ...base, id: `acquis-${a.id}`, type: "apprentissage" as const, passages: [passage] },
      { ...base, id: `acquis-revision-${a.id}`, type: "revision" as const, passages: [passage] },
    ];
  });
}

/** Libellé court d'un juz : « Juz 30 ». */
export const libelleJuz = (n: number): string => `Juz ${n}`;
