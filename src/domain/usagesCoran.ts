/**
 * Qui utilise le Coran (administration) : lectures, écoutes et récitations par personne. Code pur, testé.
 */
import type { DateISO } from "./calendrier";
import type { Role } from "./roles";

export type QuoiCoran = "lecture" | "ecoute" | "recitation";

export interface LigneUsageCoran {
  personneId: string;
  nom: string;
  role: Role;
  jour: DateISO;
  quoi: QuoiCoran;
  sourate: number;
  nombre: number;
  dernier: string;
}

export interface UsagePersonne {
  id: string;
  nom: string;
  role: Role;
  /** Sur les 7 derniers jours (aujourd'hui compris). */
  lectures: number;
  ecoutes: number;
  recitations: number;
  /** Dernière utilisation (toutes périodes chargées). */
  derniere: string;
  /** Les sourates les plus ouvertes sur 7 jours (au plus 3), de la plus ouverte à la moins ouverte. */
  sourates: number[];
}

export interface ResumeUsageCoran {
  personnes: UsagePersonne[];
  /** Personnes qui ont lu ou écouté, et qui ont récité, sur 7 jours. */
  lecteurs7j: number;
  reciteurs7j: number;
}

/** Résume les compteurs : une ligne par personne, les plus récentes d'abord. */
export function resumerUsagesCoran(
  lignes: readonly LigneUsageCoran[],
  aujourdhui: DateISO,
): ResumeUsageCoran {
  const debut7j = new Date(Date.parse(`${aujourdhui}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  const parPersonne = new Map<string, UsagePersonne & { parSourate: Map<number, number> }>();
  for (const l of lignes) {
    let p = parPersonne.get(l.personneId);
    if (!p) {
      p = {
        id: l.personneId,
        nom: l.nom,
        role: l.role,
        lectures: 0,
        ecoutes: 0,
        recitations: 0,
        derniere: l.dernier,
        sourates: [],
        parSourate: new Map(),
      };
      parPersonne.set(l.personneId, p);
    }
    if (l.dernier > p.derniere) p.derniere = l.dernier;
    if (l.jour < debut7j) continue;
    if (l.quoi === "lecture") p.lectures += l.nombre;
    else if (l.quoi === "ecoute") p.ecoutes += l.nombre;
    else p.recitations += l.nombre;
    p.parSourate.set(l.sourate, (p.parSourate.get(l.sourate) ?? 0) + l.nombre);
  }
  const personnes = [...parPersonne.values()]
    .map(({ parSourate, ...p }) => ({
      ...p,
      sourates: [...parSourate.entries()]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .slice(0, 3)
        .map(([s]) => s),
    }))
    .sort((a, b) => (a.derniere < b.derniere ? 1 : -1));
  return {
    personnes,
    lecteurs7j: personnes.filter((p) => p.lectures + p.ecoutes > 0).length,
    reciteurs7j: personnes.filter((p) => p.recitations > 0).length,
  };
}
