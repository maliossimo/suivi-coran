/**
 * Carte du Coran : l'état de chacune des 114 sourates pour un élève,
 * et les sourates à réviser en priorité. Code pur, testé.
 */
import type { DateISO } from "./calendrier";
import { joursEntre } from "./classe";
import type { Seance } from "./fiche";
import { fusionner, versIntervalle, type Intervalle, type Referentiel, type Sourate } from "./versets";

/**
 * - `maitrisee` : sourate connue en entier et travaillée récemment ;
 * - `a_reviser` : connue en entier mais pas travaillée depuis longtemps ;
 * - `en_cours`  : une partie seulement est connue ;
 * - `vide`      : pas encore commencée.
 */
export type EtatSourate = "maitrisee" | "a_reviser" | "en_cours" | "vide";

export const LIBELLE_ETAT: Record<EtatSourate, string> = {
  maitrisee: "Maîtrisée",
  a_reviser: "À réviser",
  en_cours: "En cours",
  vide: "Pas commencée",
};

export interface CaseCarte {
  sourate: Sourate;
  etat: EtatSourate;
  /** Part de la sourate couverte par l'apprentissage ou la révision (0 à 100). */
  pourcentage: number;
  /** Dernier jour où la sourate a été apprise ou révisée. */
  derniereActivite: DateISO | null;
}

export interface CarteDuCoran {
  cases: CaseCarte[];
  compte: Record<EtatSourate, number>;
  /** Les sourates connues travaillées il y a le plus longtemps (3 au plus). */
  aReviserAujourdhui: CaseCarte[];
}

/** Au-delà de ce nombre de jours sans travail, une sourate connue est « à réviser ». */
export const SEUIL_REVISION_JOURS = 30;

function couverture(intervalles: readonly Intervalle[], debut: number, fin: number): number {
  const coupes = intervalles
    .filter(([a, b]) => b >= debut && a <= fin)
    .map(([a, b]) => [Math.max(a, debut), Math.min(b, fin)] as const);
  return fusionner(coupes).reduce((t, [a, b]) => t + (b - a + 1), 0);
}

export function carteDuCoran(
  ref: Referentiel,
  seances: readonly Seance[],
  aujourdhui: DateISO,
  seuilJours = SEUIL_REVISION_JOURS,
): CarteDuCoran {
  // Chaque séance passée réduite à ses intervalles de versets (passages incohérents ignorés).
  const travaux = seances
    .filter((s) => s.date <= aujourdhui)
    .map((s) => ({
      date: s.date,
      intervalles: s.passages.flatMap((p) => {
        try {
          return [versIntervalle(ref, p)];
        } catch {
          return [];
        }
      }),
    }));
  const tous = travaux.flatMap((t) => t.intervalles);

  const cases: CaseCarte[] = [...ref.values()]
    .sort((a, b) => a.numero - b.numero)
    .map((sourate) => {
      const debut = sourate.premierVersetGlobal;
      const fin = debut + sourate.nbVersets - 1;
      const connus = couverture(tous, debut, fin);
      const pourcentage = Math.round((connus / sourate.nbVersets) * 100);
      const derniereActivite =
        travaux
          .filter((t) => t.intervalles.some(([a, b]) => b >= debut && a <= fin))
          .map((t) => t.date)
          .sort()
          .at(-1) ?? null;

      let etat: EtatSourate = "vide";
      if (connus >= sourate.nbVersets) {
        const recente = derniereActivite !== null && joursEntre(derniereActivite, aujourdhui) <= seuilJours;
        etat = recente ? "maitrisee" : "a_reviser";
      } else if (connus > 0) {
        etat = "en_cours";
      }
      return { sourate, etat, pourcentage, derniereActivite };
    });

  const compte: Record<EtatSourate, number> = { maitrisee: 0, a_reviser: 0, en_cours: 0, vide: 0 };
  for (const c of cases) compte[c.etat] += 1;

  const aReviserAujourdhui = cases
    .filter((c) => c.etat === "a_reviser" || c.etat === "maitrisee")
    .sort((a, b) => (a.derniereActivite ?? "").localeCompare(b.derniereActivite ?? ""))
    .slice(0, 3);

  return { cases, compte, aReviserAujourdhui };
}
