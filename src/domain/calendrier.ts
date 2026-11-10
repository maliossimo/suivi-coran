/**
 * Découpage du mois tel que sur la fiche papier :
 *   Semaine 1 = jours 1 à 7, Semaine 2 = 8 à 14, Semaine 3 = 15 à 21,
 *   Semaine 4 = 22 à 28, Semaine 5 = 29 → dernier jour du mois (0 à 3 jours).
 *   « Jour N » = N-ième jour du bloc.
 *
 * Les dates sont manipulées en chaînes ISO « AAAA-MM-JJ » : pas de fuseau
 * horaire, donc pas de décalage d'un jour selon le serveur ou le navigateur.
 */

export type DateISO = string;
export type NumeroSemaine = 1 | 2 | 3 | 4 | 5;

export interface Semaine {
  numero: NumeroSemaine;
  /** Jours du mois couverts, ex. [8, 9, …, 14] */
  jours: number[];
}

const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function lireDate(date: DateISO): { annee: number; mois: number; jour: number } {
  const m = RE_DATE.exec(date);
  if (!m) throw new Error(`Date invalide : ${date}`);
  const annee = Number(m[1]);
  const mois = Number(m[2]);
  const jour = Number(m[3]);
  if (mois < 1 || mois > 12 || jour < 1 || jour > nbJoursDuMois(annee, mois)) {
    throw new Error(`Date invalide : ${date}`);
  }
  return { annee, mois, jour };
}

export function formaterDate(annee: number, mois: number, jour: number): DateISO {
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

/** Nombre de jours d'un mois (mois de 1 à 12). */
export function nbJoursDuMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** Semaine de la fiche (1 à 5) pour un jour du mois. */
export function semaineDuJour(jourDuMois: number): NumeroSemaine {
  if (!Number.isInteger(jourDuMois) || jourDuMois < 1 || jourDuMois > 31) {
    throw new Error(`Jour du mois invalide : ${jourDuMois}`);
  }
  return Math.ceil(jourDuMois / 7) as NumeroSemaine;
}

/** « Jour N » (1 à 7) à l'intérieur de la semaine de la fiche. */
export function jourDansSemaine(jourDuMois: number): number {
  semaineDuJour(jourDuMois); // validation
  return ((jourDuMois - 1) % 7) + 1;
}

/** Position d'une date sur la fiche : semaine et « Jour N ». */
export function positionSurFiche(date: DateISO): { semaine: NumeroSemaine; jour: number } {
  const { jour } = lireDate(date);
  return { semaine: semaineDuJour(jour), jour: jourDansSemaine(jour) };
}

/** Semaines de la fiche pour un mois donné. La semaine 5 est absente en février non bissextile. */
export function semainesDuMois(annee: number, mois: number): Semaine[] {
  const total = nbJoursDuMois(annee, mois);
  const semaines: Semaine[] = [];
  for (let numero = 1; numero <= 5; numero++) {
    const debut = (numero - 1) * 7 + 1;
    const fin = numero === 5 ? total : Math.min(numero * 7, total);
    if (debut > total) break;
    const jours = Array.from({ length: fin - debut + 1 }, (_, i) => debut + i);
    semaines.push({ numero: numero as NumeroSemaine, jours });
  }
  return semaines;
}

/** Premier jour du mois d'une date (clé des objectifs et bilans mensuels). */
export function debutDuMois(date: DateISO): DateISO {
  const { annee, mois } = lireDate(date);
  return formaterDate(annee, mois, 1);
}
