/** Dates affichées dans l'appli, toujours à l'heure de Paris. */

const PARIS = "Europe/Paris";

/** « 12 nov., 14:30 » */
export function dateHeure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PARIS,
  }).format(new Date(iso));
}

/** « 12 nov. », ou « 12 nov. 2026 » avec l'année. */
export function dateCourte(iso: string, avecAnnee = false): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    ...(avecAnnee ? { year: "numeric" as const } : {}),
    timeZone: PARIS,
  }).format(new Date(iso));
}

/** « 14:30 » */
export function heure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: PARIS }).format(
    new Date(iso),
  );
}
