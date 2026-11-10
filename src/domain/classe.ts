/**
 * Résumé de la classe pour le tableau de bord du maître. Code pur.
 */
import type { DateISO } from "./calendrier";
import type { StatutObjectif, TypeSeance } from "./fiche";

export interface EleveClasse {
  id: string;
  prenom: string;
  nom: string;
  actif: boolean;
}

export interface SeanceStat {
  eleveId: string;
  type: TypeSeance;
  date: DateISO;
  dureeMin: number;
}

export interface ObjectifStat {
  eleveId: string;
  statut: StatutObjectif;
}

export interface ResumeEleve {
  eleve: EleveClasse;
  minutesApprentissage: number;
  minutesRevision: number;
  joursTravailles: number;
  objectifsAtteints: number;
  objectifsTotal: number;
  derniereSaisie: DateISO | null;
  /** Jours écoulés depuis la dernière saisie (null si jamais). */
  joursSansSaisie: number | null;
  /** Rien saisi depuis au moins `SEUIL_ALERTE` jours (ou jamais). */
  alerte: boolean;
}

export const SEUIL_ALERTE = 3;

/** Nombre de jours entre deux dates ISO (b - a). */
export function joursEntre(a: DateISO, b: DateISO): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function resumerClasse(
  eleves: readonly EleveClasse[],
  seancesDuMois: readonly SeanceStat[],
  objectifsDuMois: readonly ObjectifStat[],
  dernieresSaisies: ReadonlyMap<string, DateISO>,
  aujourdhui: DateISO,
): ResumeEleve[] {
  return [...eleves]
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"))
    .map((eleve) => {
      const seances = seancesDuMois.filter((s) => s.eleveId === eleve.id);
      const objectifs = objectifsDuMois.filter((o) => o.eleveId === eleve.id);
      const derniere = dernieresSaisies.get(eleve.id) ?? null;
      const joursSansSaisie = derniere ? joursEntre(derniere, aujourdhui) : null;
      const somme = (type: TypeSeance) =>
        seances.filter((s) => s.type === type).reduce((t, s) => t + s.dureeMin, 0);
      return {
        eleve,
        minutesApprentissage: somme("apprentissage"),
        minutesRevision: somme("revision"),
        joursTravailles: new Set(seances.map((s) => s.date)).size,
        objectifsAtteints: objectifs.filter((o) => o.statut === "atteint").length,
        objectifsTotal: objectifs.length,
        derniereSaisie: derniere,
        joursSansSaisie,
        alerte: eleve.actif && (joursSansSaisie === null || joursSansSaisie >= SEUIL_ALERTE),
      };
    });
}

/** « aujourd'hui », « hier », « il y a 4 jours », « jamais » */
export function libelleDerniereSaisie(jours: number | null): string {
  if (jours === null) return "jamais";
  if (jours <= 0) return "aujourd’hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} jours`;
}
