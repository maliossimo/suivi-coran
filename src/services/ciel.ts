import "server-only";
import { jourParticulier, type JourParticulier } from "@/domain/ciel";
import { dateHegirienne, libelleHegirienArabe } from "@/domain/hegire";
import { COORDONNEES_PAR_DEFAUT, horairesPriere, minutesParis, type HorairesPriere } from "@/domain/priere";
import { positionEtablissement } from "@/repositories/etablissements";
import { aujourdhuiParis } from "./fiche";

export interface DonneesCiel {
  /** Jour à Paris (AAAA-MM-JJ). */
  jour: string;
  horaires: HorairesPriere;
  /** Jour du mois hégirien (lune), null si le calendrier est indisponible. */
  jourHegire: number | null;
  dateFrancaise: string;
  dateHegirienneArabe: string | null;
  particulier: JourParticulier | null;
  /** Minutes depuis minuit à Paris, maintenant. */
  maintenant: number;
}

const DATE_FR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Ciel du jour pour la barre du haut : heures de prière de la mosquée (Paris par défaut), lune, fête. */
export async function chargerCiel(etablissementId: string | null): Promise<DonneesCiel> {
  const jour = aujourdhuiParis();
  const position = etablissementId ? await positionEtablissement(etablissementId).catch(() => null) : null;
  const h = dateHegirienne(jour);
  return {
    jour,
    horaires: horairesPriere(jour, position ?? COORDONNEES_PAR_DEFAUT),
    jourHegire: h?.jour ?? null,
    dateFrancaise: DATE_FR.format(new Date(`${jour}T12:00:00Z`)).replace(/^./, (c) => c.toUpperCase()),
    dateHegirienneArabe: h ? libelleHegirienArabe(h) : null,
    particulier: jourParticulier(jour, h),
    maintenant: minutesParis(new Date()),
  };
}
