/**
 * Construction de la fiche du mois (semaines 1 à 5, « Jour 1 » à « Jour 7 »)
 * à partir des séances d'un élève. Code pur : aucune dépendance au framework.
 */
import {
  formaterDate,
  jourDansSemaine,
  lireDate,
  semainesDuMois,
  type DateISO,
  type NumeroSemaine,
} from "./calendrier";
import type { Passage } from "./versets";

export type TypeSeance = "apprentissage" | "revision";
export const TYPES_SEANCE: readonly TypeSeance[] = ["apprentissage", "revision"];
export const LIBELLE_TYPE: Record<TypeSeance, string> = {
  apprentissage: "Apprentissage",
  revision: "Révision",
};

export type StatutObjectif = "en_cours" | "atteint" | "non_atteint";

export interface Seance {
  id: string;
  date: DateISO;
  type: TypeSeance;
  dureeMin: number;
  tajwid: string | null;
  noteLibre: string | null;
  /** Vrai si le Cheikh (ou l'admin) a corrigé la séance (au moins en partie). */
  corrigee: boolean;
  /** Nombre de commentaires du Cheikh sur la séance. */
  nbCommentaires?: number;
  passages: Passage[];
}

export interface Objectif {
  semaine: NumeroSemaine | null; // null = objectif du mois
  description: string;
  statut: StatutObjectif;
}

export interface JourFiche {
  /** « Jour N » dans la semaine (1 à 7). */
  numero: number;
  jourDuMois: number;
  date: DateISO;
  seance: Seance | null;
  aujourdhui: boolean;
  futur: boolean;
}

export interface SemaineFiche {
  numero: NumeroSemaine;
  jours: JourFiche[];
  totalMinutes: number;
  joursTravailles: number;
  objectif: Objectif | null;
}

export interface Mois {
  annee: number;
  mois: number; // 1..12
}

/** Construit les semaines de la fiche pour un mois et un type de séance. */
export function construireFiche(
  { annee, mois }: Mois,
  seances: readonly Seance[],
  objectifs: readonly Objectif[],
  aujourdhui: DateISO,
): SemaineFiche[] {
  const parDate = new Map(seances.map((s) => [s.date, s]));
  const objectifParSemaine = new Map(objectifs.filter((o) => o.semaine !== null).map((o) => [o.semaine, o]));

  return semainesDuMois(annee, mois).map((semaine) => {
    const jours = semaine.jours.map((jourDuMois): JourFiche => {
      const date = formaterDate(annee, mois, jourDuMois);
      return {
        numero: jourDansSemaine(jourDuMois),
        jourDuMois,
        date,
        seance: parDate.get(date) ?? null,
        aujourdhui: date === aujourdhui,
        futur: date > aujourdhui,
      };
    });
    const avecSeance = jours.filter((j) => j.seance);
    return {
      numero: semaine.numero,
      jours,
      totalMinutes: avecSeance.reduce((t, j) => t + (j.seance?.dureeMin ?? 0), 0),
      joursTravailles: avecSeance.length,
      objectif: objectifParSemaine.get(semaine.numero) ?? null,
    };
  });
}

/** Lit « AAAA-MM » ; renvoie le mois de `aujourdhui` si la valeur est absente ou invalide. */
export function lireMois(valeur: string | undefined, aujourdhui: DateISO): Mois {
  const m = /^(\d{4})-(\d{2})$/.exec(valeur ?? "");
  if (m) {
    const annee = Number(m[1]);
    const mois = Number(m[2]);
    if (annee >= 2000 && annee <= 2100 && mois >= 1 && mois <= 12) return { annee, mois };
  }
  const { annee, mois } = lireDate(aujourdhui);
  return { annee, mois };
}

/** Situe un mois par rapport à aujourd'hui. */
export type PositionMois = "passe" | "courant" | "futur";

export function positionDuMois(m: Mois, aujourdhui: DateISO): PositionMois {
  const courant = cleMois(lireMois(undefined, aujourdhui));
  const cle = cleMois(m);
  if (cle === courant) return "courant";
  return cle < courant ? "passe" : "futur";
}

/** Mois consécutifs autour d'un mois : `avant` mois avant, `apres` mois après. */
export function moisAutour(centre: Mois, avant: number, apres: number): Mois[] {
  return Array.from({ length: avant + apres + 1 }, (_, i) => decalerMois(centre, i - avant));
}

/** Bilan de fin de mois (un par élève, par mois et par type). */
export interface Bilan {
  id: string;
  bienMemorise: string;
  aRenforcer: string;
  /** Vrai si le maître (ou l'admin) a modifié le bilan. */
  corrige: boolean;
}

export function decalerMois({ annee, mois }: Mois, delta: number): Mois {
  const index = annee * 12 + (mois - 1) + delta;
  return { annee: Math.floor(index / 12), mois: (index % 12) + 1 };
}

export function cleMois({ annee, mois }: Mois): string {
  return `${annee}-${String(mois).padStart(2, "0")}`;
}

export function premierJour(m: Mois): DateISO {
  return formaterDate(m.annee, m.mois, 1);
}

export function dernierJour(m: Mois): DateISO {
  const fin = new Date(Date.UTC(m.annee, m.mois, 0)).getUTCDate();
  return formaterDate(m.annee, m.mois, fin);
}

const NOMS_MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** « novembre 2026 » */
export function libelleMois({ annee, mois }: Mois): string {
  return `${NOMS_MOIS[mois - 1]} ${annee}`;
}

/** « déc. », avec l'année si elle diffère de `anneeReference` : « janv. 2027 ». */
export function libelleMoisCourt({ annee, mois }: Mois, anneeReference: number): string {
  const nom = MOIS_COURTS[mois - 1]!;
  return annee === anneeReference ? nom : `${nom} ${annee}`;
}

/** « 10 nov. » */
export function libelleJourCourt(date: DateISO): string {
  const { mois, jour } = lireDate(date);
  return `${jour} ${MOIS_COURTS[mois - 1]}`;
}

const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/** « jeu. » */
export function libelleJourSemaine(date: DateISO): string {
  const { annee, mois, jour } = lireDate(date);
  return JOURS_COURTS[new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay()]!;
}

/** « 12 novembre 2026 » */
export function libelleDateLongue(date: DateISO): string {
  const { annee, mois, jour } = lireDate(date);
  return `${jour === 1 ? "1er" : jour} ${NOMS_MOIS[mois - 1]} ${annee}`;
}

/** « 1 h 15 », « 25 min », « — » */
export function formaterDuree(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/**
 * État de correction d'une séance d'après ses passages :
 * `complete` si le Cheikh a vu tous les passages, `partielle` s'il en manque
 * (passage ajouté ou modifié après son passage), null s'il ne l'a pas encore vue.
 */
export function etatCorrection(
  seance: Pick<Seance, "corrigee" | "passages">,
): "complete" | "partielle" | null {
  if (!seance.corrigee) return null;
  const vus = seance.passages.filter((p) => p.corrige).length;
  if (seance.passages.length === 0 || vus === seance.passages.length) return "complete";
  return "partielle";
}

/** Ce que l'élève saisit pour une séance (sans l'état de correction). */
export interface ContenuSeance {
  dureeMin: number;
  noteLibre: string | null;
  passages: readonly Passage[];
}

/** Même contenu de séance : durée, note (espaces ignorés) et passages dans l'ordre. */
export function memeContenuSeance(a: ContenuSeance, b: ContenuSeance): boolean {
  const passages = (l: readonly Passage[]) =>
    JSON.stringify(l.map((p) => [p.sourateDebut, p.versetDebut, p.sourateFin, p.versetFin]));
  return (
    a.dureeMin === b.dureeMin &&
    (a.noteLibre ?? "").trim() === (b.noteLibre ?? "").trim() &&
    passages(a.passages) === passages(b.passages)
  );
}

/**
 * Un enregistrement fait à partir d'une version ancienne de la séance (hors ligne,
 * ou renvoyé plus tard) ne doit pas écraser ce qui a changé entre-temps
 * (correction du Cheikh, ressaisie sur un autre téléphone).
 * `attendu` : la séance telle que l'élève l'avait sous les yeux (null : pas de séance).
 */
export function conflitDeSaisie(
  attendu: ContenuSeance | null,
  actuelle: ContenuSeance | null,
  nouvelle: ContenuSeance,
): boolean {
  if (actuelle && memeContenuSeance(actuelle, nouvelle)) return false; // déjà enregistrée
  if (!attendu) return actuelle !== null;
  return actuelle === null || !memeContenuSeance(attendu, actuelle);
}
