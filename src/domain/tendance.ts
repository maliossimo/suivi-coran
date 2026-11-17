/** Tendance d'un élève : son travail semaine par semaine, et s'il est en hausse, stable ou en baisse. */
import { ajouterJours, type DateISO } from "./calendrier";
import type { Seance } from "./fiche";
import { nbVersetsDistincts, type Referentiel } from "./versets";

export interface SemaineTendance {
  /** Lundi de la semaine. */
  debut: DateISO;
  minutes: number;
  /** Versets appris (séances d'apprentissage) cette semaine. */
  versets: number;
}

export type SensTendance = "hausse" | "stable" | "baisse" | "aucune";

/** Lundi de la semaine d'une date. */
export function lundi(date: DateISO): DateISO {
  const j = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = dimanche
  return ajouterJours(date, -((j + 6) % 7));
}

/**
 * Les `semaines` dernières semaines (la courante à droite), et le sens : les 4 dernières semaines comparées
 * aux 4 d'avant, en temps de travail (± 15 % : stable).
 */
export function tendanceEleve(
  ref: Referentiel,
  seances: readonly Seance[],
  aujourdhui: DateISO,
  semaines = 8,
): { semaines: SemaineTendance[]; sens: SensTendance } {
  const premier = ajouterJours(lundi(aujourdhui), -7 * (semaines - 1));
  const liste: SemaineTendance[] = Array.from({ length: semaines }, (_, i) => ({
    debut: ajouterJours(premier, 7 * i),
    minutes: 0,
    versets: 0,
  }));
  const parSemaine = new Map(liste.map((s) => [s.debut, s]));
  const passagesAppris = new Map<DateISO, Seance["passages"][number][]>();
  for (const s of seances) {
    if (s.date < premier || s.date > aujourdhui) continue;
    const semaine = parSemaine.get(lundi(s.date));
    if (!semaine) continue;
    semaine.minutes += s.dureeMin;
    if (s.type === "apprentissage")
      passagesAppris.set(semaine.debut, [...(passagesAppris.get(semaine.debut) ?? []), ...s.passages]);
  }
  for (const semaine of liste) {
    const p = passagesAppris.get(semaine.debut);
    if (!p?.length) continue;
    try {
      semaine.versets = nbVersetsDistincts(ref, p);
    } catch {
      semaine.versets = 0;
    }
  }
  const somme = (l: SemaineTendance[]) => l.reduce((t, s) => t + s.minutes, 0);
  const recentes = somme(liste.slice(-4));
  const avant = somme(liste.slice(-8, -4));
  let sens: SensTendance;
  if (!recentes && !avant) sens = "aucune";
  else if (!avant) sens = "hausse";
  else if (recentes > avant * 1.15) sens = "hausse";
  else if (recentes < avant * 0.85) sens = "baisse";
  else sens = "stable";
  return { semaines: liste, sens };
}

/**
 * Sens des 14 derniers jours (minutes par jour, le plus ancien d'abord) : la dernière semaine comparée à
 * la précédente (± 15 % : stable). Sert à la petite flèche des cartes de la classe.
 */
export function sensQuinzaine(minutes: readonly number[]): SensTendance {
  const moitie = Math.floor(minutes.length / 2);
  const somme = (l: readonly number[]) => l.reduce((t, m) => t + m, 0);
  const avant = somme(minutes.slice(0, moitie));
  const recente = somme(minutes.slice(moitie));
  if (!avant && !recente) return "aucune";
  if (!avant || recente > avant * 1.15) return "hausse";
  if (recente < avant * 0.85) return "baisse";
  return "stable";
}
