/**
 * Présences : classes, jours de cours et appel. Règles pures (testées).
 */
import { ajouterJours, formaterDate, lireDate, nbJoursDuMois, type DateISO } from "./calendrier";

export const STATUTS = ["present", "absent"] as const;
export type StatutPresence = (typeof STATUTS)[number];

export const LIBELLE_STATUT: Record<StatutPresence, string> = { present: "Présent", absent: "Absent" };

/** Lettre du tableau du mois. */
export const LETTRE_STATUT: Record<StatutPresence, string> = { present: "P", absent: "A" };

// ---------- Qui fait quoi ---------------------------------------------------

/**
 * Point de vue sur les présences. Les droits réels sont appliqués par la base ;
 * ceci décide seulement de ce que l'interface propose.
 */
export type PointDeVue = "admin" | "responsable" | "cheikh";

export interface Capacites {
  /** Faire (ou corriger) l'appel. */
  appel: boolean;
  /** Créer une classe, changer son nom, ses jours, ses Cheikhs. */
  organiser: boolean;
  /** Ajouter ou retirer des élèves d'une classe. */
  eleves: boolean;
  /** Rapport des présences (PDF) sur une période. */
  rapport: boolean;
}

export function capacites(vue: PointDeVue): Capacites {
  switch (vue) {
    case "admin":
      return { appel: true, organiser: true, eleves: true, rapport: true };
    case "responsable":
      return { appel: false, organiser: true, eleves: true, rapport: true };
    case "cheikh":
      return { appel: true, organiser: false, eleves: true, rapport: false };
  }
}

export const LIBELLE_VUE: Record<PointDeVue, string> = {
  admin: "Administrateur",
  responsable: "Responsable de la mosquée",
  cheikh: "Cheikh",
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

/** Taux de présence (en %) ; null sans aucun appel. */
export function tauxPresence(statuts: readonly StatutPresence[]): number | null {
  if (!statuts.length) return null;
  return Math.round((statuts.filter((s) => s === "present").length / statuts.length) * 100);
}

/** Absences d'affilée les plus récentes (statuts du plus ancien au plus récent). */
export function absencesDAffilee(statuts: readonly StatutPresence[]): number {
  let n = 0;
  for (let i = statuts.length - 1; i >= 0 && statuts[i] === "absent"; i--) n++;
  return n;
}

/** Comptes d'un appel. */
export function resumeAppel(statuts: readonly StatutPresence[]): Record<StatutPresence, number> {
  const r: Record<StatutPresence, number> = { present: 0, absent: 0 };
  for (const s of statuts) r[s]++;
  return r;
}

/** « 16 présents · 2 absents » */
export function libelleResume(r: Record<StatutPresence, number>): string {
  return [
    `${r.present} présent${r.present > 1 ? "s" : ""}`,
    r.absent ? `${r.absent} absent${r.absent > 1 ? "s" : ""}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Liste des jours d'une période (du … au …, inclus), limitée à `max` jours. */
export function joursEntre(du: DateISO, au: DateISO, max = 400): DateISO[] {
  const jours: DateISO[] = [];
  for (let d = du; d <= au && jours.length < max; d = ajouterJours(d, 1)) jours.push(d);
  return jours;
}

/** Jours de cours entre deux dates incluses (au plus 400 jours parcourus). */
export function joursDeCoursEntre(jours: readonly number[], du: DateISO, au: DateISO): DateISO[] {
  return joursEntre(du, au).filter((d) => aCoursLe(jours, d));
}

// ---------- Périodes du rapport ---------------------------------------------

export interface Periode {
  du: DateISO;
  au: DateISO;
}

/** Lundi de la semaine d'une date. */
export function debutSemaine(date: DateISO): DateISO {
  return ajouterJours(date, 1 - jourIso(date));
}

function moisDe(date: DateISO, decalage: number): Periode {
  const { annee, mois } = lireDate(date);
  const index = annee * 12 + (mois - 1) + decalage;
  const a = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return { du: formaterDate(a, m, 1), au: formaterDate(a, m, nbJoursDuMois(a, m)) };
}

/** Raccourcis proposés au responsable. */
export function periodesRapides(aujourdhui: DateISO): { cle: string; libelle: string; periode: Periode }[] {
  const lundi = debutSemaine(aujourdhui);
  return [
    { cle: "semaine", libelle: "Cette semaine", periode: { du: lundi, au: ajouterJours(lundi, 6) } },
    {
      cle: "semaine-1",
      libelle: "Semaine dernière",
      periode: { du: ajouterJours(lundi, -7), au: ajouterJours(lundi, -1) },
    },
    { cle: "mois", libelle: "Ce mois-ci", periode: moisDe(aujourdhui, 0) },
    { cle: "mois-1", libelle: "Mois dernier", periode: moisDe(aujourdhui, -1) },
  ];
}

/** Période valide (dans l'ordre, au plus un an) ; sinon le mois en cours. */
export function lirePeriode(du: unknown, au: unknown, aujourdhui: DateISO): Periode {
  if (valide(du) && valide(au) && du <= au && joursEntre(du, au, 367).length <= 366) return { du, au };
  return moisDe(aujourdhui, 0);
}

/** Date « AAAA-MM-JJ » qui existe vraiment (pas de 30 février). */
function valide(x: unknown): x is DateISO {
  if (typeof x !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  try {
    const { annee, mois, jour } = lireDate(x);
    return jour <= nbJoursDuMois(annee, mois);
  } catch {
    return false;
  }
}

export const periodeEgale = (a: Periode, b: Periode) => a.du === b.du && a.au === b.au;

// ---------- Aperçu « Voir comme… » -----------------------------------------

/** Ajoute `vue=…` à un lien interne quand l'admin regarde avec les yeux d'un autre rôle. */
export function avecVue(href: string, apercu: PointDeVue | null): string {
  if (!apercu) return href;
  return `${href}${href.includes("?") ? "&" : "?"}vue=${apercu}`;
}
