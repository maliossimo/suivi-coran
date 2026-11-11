/**
 * Statistiques d'usage pour l'administrateur : qui utilise l'app, et combien.
 * Code pur, testé.
 */
import type { DateISO } from "./calendrier";
import { joursEntre } from "./classe";
import type { Role } from "./roles";

export interface UtilisateurStat {
  id: string;
  role: Role;
  actif: boolean;
  etablissementId: string | null;
}

export interface SeanceUsage {
  eleveId: string;
  date: DateISO;
  dureeMin: number;
}

export interface SemaineUsage {
  /** Lundi de la semaine. */
  debut: DateISO;
  seances: number;
  /** Élèves différents ayant saisi au moins une séance cette semaine-là. */
  eleves: number;
}

export interface EtablissementUsage {
  id: string;
  nom: string;
  maitres: number;
  eleves: number;
  elevesActifs7j: number;
  seances30j: number;
}

export interface StatsUsage {
  eleves: { actifs: number; archives: number };
  maitres: { actifs: number; archives: number };
  /** Élèves (comptes actifs) ayant saisi au moins une séance ces 7 derniers jours. */
  elevesActifs7j: number;
  /** Part des élèves actifs qui ont saisi cette semaine (0 à 100). */
  tauxActivite7j: number;
  seances7j: number;
  minutes7j: number;
  seances30j: number;
  /** Les 12 dernières semaines (lundi → dimanche), de la plus ancienne à la plus récente. */
  semaines: SemaineUsage[];
  parEtablissement: EtablissementUsage[];
}

function decaler(date: DateISO, jours: number): DateISO {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant `date`. */
export function lundiDe(date: DateISO): DateISO {
  const jour = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  return decaler(date, -((jour + 6) % 7));
}

export function calculerStatsUsage(
  utilisateurs: readonly UtilisateurStat[],
  etablissements: readonly { id: string; nom: string }[],
  seances: readonly SeanceUsage[],
  aujourdhui: DateISO,
  nbSemaines = 12,
): StatsUsage {
  const eleves = utilisateurs.filter((u) => u.role === "eleve");
  const maitres = utilisateurs.filter((u) => u.role === "maitre");
  const elevesActifsIds = new Set(eleves.filter((u) => u.actif).map((u) => u.id));

  const passees = seances.filter((s) => s.date <= aujourdhui);
  const depuis = (jours: number) => passees.filter((s) => joursEntre(s.date, aujourdhui) < jours);
  const s7 = depuis(7);
  const s30 = depuis(30);

  const actifs7j = new Set(s7.map((s) => s.eleveId).filter((id) => elevesActifsIds.has(id)));

  const lundiCourant = lundiDe(aujourdhui);
  const semaines: SemaineUsage[] = Array.from({ length: nbSemaines }, (_, i) => {
    const debut = decaler(lundiCourant, -7 * (nbSemaines - 1 - i));
    const fin = decaler(debut, 6);
    const dedans = passees.filter((s) => s.date >= debut && s.date <= fin);
    return { debut, seances: dedans.length, eleves: new Set(dedans.map((s) => s.eleveId)).size };
  });

  const etabDe = new Map(utilisateurs.map((u) => [u.id, u.etablissementId]));
  const parEtablissement: EtablissementUsage[] = etablissements.map((e) => {
    const elevesEtab = eleves.filter((u) => u.etablissementId === e.id && u.actif);
    const ids = new Set(elevesEtab.map((u) => u.id));
    return {
      id: e.id,
      nom: e.nom,
      maitres: maitres.filter((u) => u.etablissementId === e.id && u.actif).length,
      eleves: elevesEtab.length,
      elevesActifs7j: [...actifs7j].filter((id) => ids.has(id)).length,
      seances30j: s30.filter((s) => etabDe.get(s.eleveId) === e.id).length,
    };
  });

  return {
    eleves: { actifs: elevesActifsIds.size, archives: eleves.length - elevesActifsIds.size },
    maitres: {
      actifs: maitres.filter((u) => u.actif).length,
      archives: maitres.filter((u) => !u.actif).length,
    },
    elevesActifs7j: actifs7j.size,
    tauxActivite7j: elevesActifsIds.size ? Math.round((actifs7j.size / elevesActifsIds.size) * 100) : 0,
    seances7j: s7.length,
    minutes7j: s7.reduce((t, s) => t + s.dureeMin, 0),
    seances30j: s30.length,
    semaines,
    parEtablissement,
  };
}
