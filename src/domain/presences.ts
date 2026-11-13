/**
 * Présences : classes, jours de cours et appel. Règles pures (testées).
 */
import { ajouterJours, formaterDate, lireDate, nbJoursDuMois, type DateISO } from "./calendrier";

export type StatutPresence = "present" | "absent" | "retard" | "excuse";
export const STATUTS: readonly StatutPresence[] = ["present", "absent", "retard", "excuse"];

export const LIBELLE_STATUT: Record<StatutPresence, string> = {
  present: "Présent",
  absent: "Absent",
  retard: "En retard",
  excuse: "Excusé",
};

/** Lettre du tableau du mois et des boutons de l'appel. */
export const LETTRE_STATUT: Record<StatutPresence, string> = {
  present: "P",
  absent: "A",
  retard: "R",
  excuse: "E",
};

/** Jours de la semaine (ISO : 1 = lundi … 7 = dimanche). */
export const JOURS = [
  { n: 1, court: "Lun", long: "lundi" },
  { n: 2, court: "Mar", long: "mardi" },
  { n: 3, court: "Mer", long: "mercredi" },
  { n: 4, court: "Jeu", long: "jeudi" },
  { n: 5, court: "Ven", long: "vendredi" },
  { n: 6, court: "Sam", long: "samedi" },
  { n: 7, court: "Dim", long: "dimanche" },
] as const;

/** Absences d'affilée à partir desquelles un élève est « à surveiller ». */
export const SEUIL_ABSENCES = 2;

/** Jour de la semaine d'une date (1 = lundi … 7 = dimanche). */
export function jourIso(date: DateISO): number {
  const { annee, mois, jour } = lireDate(date);
  const j = new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
  return j === 0 ? 7 : j;
}

/** « Lun · Mar · Jeu » */
export function libelleJours(jours: readonly number[]): string {
  return [...jours]
    .sort((a, b) => a - b)
    .map((n) => JOURS[n - 1]?.court)
    .filter(Boolean)
    .join(" · ");
}

export const aCoursLe = (jours: readonly number[], date: DateISO): boolean => jours.includes(jourIso(date));

/** Prochain jour de cours à partir de `depuis` (inclus) ; null si la classe n'a pas de jour. */
export function prochainCours(jours: readonly number[], depuis: DateISO): DateISO | null {
  for (let i = 0; i < 7; i++) {
    const d = ajouterJours(depuis, i);
    if (aCoursLe(jours, d)) return d;
  }
  return null;
}

/** Jours de cours d'un mois (« 2026-11 »), jusqu'à `jusquA` inclus si donné. */
export function joursDeCoursDuMois(
  jours: readonly number[],
  annee: number,
  mois: number,
  jusquA?: DateISO,
): DateISO[] {
  const resultat: DateISO[] = [];
  for (let j = 1; j <= nbJoursDuMois(annee, mois); j++) {
    const d = formaterDate(annee, mois, j);
    if (jusquA && d > jusquA) break;
    if (aCoursLe(jours, d)) resultat.push(d);
  }
  return resultat;
}

/**
 * Taux de présence (en %) : présents et retards comptent comme venus ;
 * une absence excusée ne compte ni pour ni contre. Null sans aucun appel.
 */
export function tauxPresence(statuts: readonly StatutPresence[]): number | null {
  const comptes = statuts.filter((s) => s !== "excuse");
  if (!comptes.length) return null;
  const venus = comptes.filter((s) => s === "present" || s === "retard").length;
  return Math.round((venus / comptes.length) * 100);
}

/** Absences d'affilée les plus récentes (statuts du plus ancien au plus récent ; une excuse ne coupe pas la série). */
export function absencesDAffilee(statuts: readonly StatutPresence[]): number {
  let n = 0;
  for (let i = statuts.length - 1; i >= 0; i--) {
    const s = statuts[i];
    if (s === "absent") n++;
    else if (s === "excuse") continue;
    else break;
  }
  return n;
}

/** Comptes d'un appel : « 16 présents · 1 absent · 1 en retard ». */
export function resumeAppel(statuts: readonly StatutPresence[]): Record<StatutPresence, number> {
  const r: Record<StatutPresence, number> = { present: 0, absent: 0, retard: 0, excuse: 0 };
  for (const s of statuts) r[s]++;
  return r;
}

export function libelleResume(r: Record<StatutPresence, number>): string {
  const morceaux = [
    `${r.present} présent${r.present > 1 ? "s" : ""}`,
    r.absent ? `${r.absent} absent${r.absent > 1 ? "s" : ""}` : "",
    r.retard ? `${r.retard} en retard` : "",
    r.excuse ? `${r.excuse} excusé${r.excuse > 1 ? "s" : ""}` : "",
  ];
  return morceaux.filter(Boolean).join(" · ");
}
