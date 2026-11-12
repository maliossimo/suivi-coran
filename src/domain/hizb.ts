/**
 * Découpage du Coran en 60 hizb (selon la lecture : Hafs ou Warsh) et révision par hizb.
 * Code pur, testé. Limites : voir lectures.ts.
 */
import type { DateISO } from "./calendrier";
import { joursEntre } from "./classe";
import type { Seance } from "./fiche";
import { DEBUTS_HIZB_LECTURE, TOTAL_VERSETS_LECTURE, type Lecture } from "./lectures";
import { versIntervalle, type Referentiel, type Sourate } from "./versets";

/** Lecture Hafs (valeurs par défaut des fonctions ci-dessous). */
export const DEBUTS_HIZB = DEBUTS_HIZB_LECTURE.hafs;
export const TOTAL_VERSETS = TOTAL_VERSETS_LECTURE.hafs;

/** Au-delà de ce nombre de jours sans révision, une partie connue est à revoir. */
export const SEUIL_REVISION_JOURS = 30;

export interface Position {
  sourate: Sourate;
  verset: number;
}

/** Bornes globales [début, fin] du hizb n (1 à 60). */
export function bornesHizb(numero: number, lecture: Lecture = "hafs"): readonly [number, number] {
  if (!Number.isInteger(numero) || numero < 1 || numero > 60) throw new Error(`Hizb inconnu : ${numero}`);
  const debuts = DEBUTS_HIZB_LECTURE[lecture];
  const debut = debuts[numero - 1]!;
  const fin = numero === 60 ? TOTAL_VERSETS_LECTURE[lecture] : debuts[numero]! - 1;
  return [debut, fin];
}

/** Hizb (1 à 60) contenant le verset d'index global donné. */
export function hizbDuVerset(global: number, lecture: Lecture = "hafs"): number {
  const debuts = DEBUTS_HIZB_LECTURE[lecture];
  let n = 1;
  while (n < 60 && debuts[n]! <= global) n += 1;
  return n;
}

/** Sourate et numéro de verset d'un index global. */
export function positionGlobale(ref: Referentiel, global: number): Position {
  for (const sourate of ref.values()) {
    if (global >= sourate.premierVersetGlobal && global < sourate.premierVersetGlobal + sourate.nbVersets) {
      return { sourate, verset: global - sourate.premierVersetGlobal + 1 };
    }
  }
  throw new Error(`Verset global hors du Coran : ${global}`);
}

/**
 * - `jamais_revisee` : apprise (en entier pour la sourate) mais jamais révisée ;
 * - `a_revoir`       : révisée, mais plus depuis le seuil (30 jours) ;
 * - `en_cours`       : sourate encore en cours d'apprentissage.
 */
export type EtatRevision = "jamais_revisee" | "a_revoir" | "en_cours";

export const LIBELLE_REVISION: Record<EtatRevision, string> = {
  jamais_revisee: "Jamais révisé",
  a_revoir: "À revoir",
  en_cours: "En cours",
};

const RANG: Record<EtatRevision, number> = { jamais_revisee: 0, a_revoir: 1, en_cours: 2 };

/** Une partie d'une sourate située dans un hizb, à réviser. */
export interface PortionARevoir {
  sourate: Sourate;
  /** Premier et dernier verset connus de la portion. */
  versetDebut: number;
  versetFin: number;
  etat: EtatRevision;
  /** Versets connus dans la portion. */
  connus: number;
  /** Versets connus jamais révisés. */
  jamaisRevises: number;
  /** Plus ancienne « dernière révision » parmi les versets connus (null si l'un n'a jamais été révisé). */
  plusAncienneRevision: DateISO | null;
  /** Dernière révision touchant la portion. */
  derniereRevision: DateISO | null;
}

export interface HizbARevoir {
  numero: number;
  debut: Position;
  fin: Position;
  /** L'état le plus urgent parmi ses portions. */
  etat: EtatRevision;
  plusAncienneRevision: DateISO | null;
  portions: PortionARevoir[];
}

/**
 * Hizb à réviser en priorité, du plus urgent au moins urgent :
 * d'abord ceux qui contiennent une partie apprise jamais révisée,
 * puis ceux révisés il y a plus de `seuilJours` (le plus ancien d'abord),
 * puis ceux d'une sourate encore en cours d'apprentissage.
 * Ce qui a été révisé récemment n'apparaît pas.
 */
export function hizbARevoir(
  ref: Referentiel,
  seances: readonly Seance[],
  aujourdhui: DateISO,
  seuilJours = SEUIL_REVISION_JOURS,
  lecture: Lecture = "hafs",
): HizbARevoir[] {
  const total = TOTAL_VERSETS_LECTURE[lecture];
  const connu = new Uint8Array(total + 1);
  const derniere: (DateISO | null)[] = new Array(total + 1).fill(null);

  for (const s of seances) {
    if (s.date > aujourdhui) continue;
    for (const p of s.passages) {
      let intervalle: readonly [number, number];
      try {
        intervalle = versIntervalle(ref, p);
      } catch {
        continue; // passage incohérent : ignoré
      }
      const [a, b] = intervalle;
      for (let g = Math.max(1, a); g <= Math.min(total, b); g += 1) {
        connu[g] = 1;
        if (s.type === "revision" && (derniere[g] === null || derniere[g]! < s.date)) derniere[g] = s.date;
      }
    }
  }

  // Une sourate est « apprise » quand tous ses versets sont connus.
  const sourateComplete = new Map<number, boolean>();
  for (const sourate of ref.values()) {
    let complete = true;
    for (let i = 0; i < sourate.nbVersets; i += 1) {
      if (!connu[sourate.premierVersetGlobal + i]) {
        complete = false;
        break;
      }
    }
    sourateComplete.set(sourate.numero, complete);
  }

  const sourates = [...ref.values()].sort((a, b) => a.numero - b.numero);
  const resultat: HizbARevoir[] = [];

  for (let numero = 1; numero <= 60; numero += 1) {
    const [debutH, finH] = bornesHizb(numero, lecture);
    const portions: PortionARevoir[] = [];

    for (const sourate of sourates) {
      const debut = Math.max(debutH, sourate.premierVersetGlobal);
      const fin = Math.min(finH, sourate.premierVersetGlobal + sourate.nbVersets - 1);
      if (debut > fin) continue;

      let connus = 0;
      let jamaisRevises = 0;
      let premier = 0;
      let dernier = 0;
      let plusAncienne: DateISO | null = null;
      let plusRecente: DateISO | null = null;
      for (let g = debut; g <= fin; g += 1) {
        if (!connu[g]) continue;
        connus += 1;
        if (!premier) premier = g;
        dernier = g;
        const d = derniere[g] ?? null;
        if (d === null) jamaisRevises += 1;
        else {
          if (plusAncienne === null || d < plusAncienne) plusAncienne = d;
          if (plusRecente === null || d > plusRecente) plusRecente = d;
        }
      }
      if (connus === 0) continue;

      let etat: EtatRevision | null;
      if (!sourateComplete.get(sourate.numero)) etat = "en_cours";
      else if (jamaisRevises > 0) etat = "jamais_revisee";
      else if (plusAncienne !== null && joursEntre(plusAncienne, aujourdhui) > seuilJours) etat = "a_revoir";
      else etat = null; // révisée récemment : rien à faire
      if (!etat) continue;

      portions.push({
        sourate,
        versetDebut: premier - sourate.premierVersetGlobal + 1,
        versetFin: dernier - sourate.premierVersetGlobal + 1,
        etat,
        connus,
        jamaisRevises,
        plusAncienneRevision: jamaisRevises > 0 ? null : plusAncienne,
        derniereRevision: plusRecente,
      });
    }

    if (portions.length === 0) continue;
    const etat = portions.reduce<EtatRevision>((e, p) => (RANG[p.etat] < RANG[e] ? p.etat : e), "en_cours");
    const datees = portions.filter((p) => p.etat === "a_revoir").map((p) => p.plusAncienneRevision!);
    resultat.push({
      numero,
      debut: positionGlobale(ref, debutH),
      fin: positionGlobale(ref, finH),
      etat,
      plusAncienneRevision: datees.length ? datees.sort()[0]! : null,
      portions,
    });
  }

  return resultat.sort(
    (a, b) =>
      RANG[a.etat] - RANG[b.etat] ||
      (a.plusAncienneRevision ?? "").localeCompare(b.plusAncienneRevision ?? "") ||
      a.numero - b.numero,
  );
}
