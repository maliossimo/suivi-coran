import { jourParticulier } from "@/domain/ciel";
import { dateHegirienne, libelleHegirienArabe } from "@/domain/hegire";
import { horairesPriere, minutesParis } from "@/domain/priere";

/** Ciel du jour à Paris, sans rien demander au serveur (écrans de chargement). */
export function cielParDefaut() {
  const maintenant = new Date();
  const jour = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(maintenant);
  const h = dateHegirienne(jour);
  return {
    horaires: horairesPriere(jour),
    jourHegire: h?.jour ?? null,
    particulier: jourParticulier(jour, h),
    maintenant: minutesParis(maintenant),
    dateFrancaise: new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(new Date(`${jour}T12:00:00Z`))
      .replace(/^./, (c) => c.toUpperCase()),
    dateHegirienneArabe: h ? libelleHegirienArabe(h) : null,
  };
}
