/**
 * Mise en forme du journal d'audit et de l'activité pour l'administration :
 * des phrases courtes (« a modifié une séance ») plutôt que des codes techniques.
 */

const VERBES: Record<string, string> = {
  INSERT: "a créé",
  UPDATE: "a modifié",
  DELETE: "a supprimé",
};

/** Élément concerné, avec son article. */
export const ELEMENTS: Record<string, string> = {
  seances: "une séance",
  passages: "un passage",
  objectifs: "un objectif",
  bilans_mensuels: "un bilan",
  commentaires: "un commentaire",
  profils: "un profil",
  etablissements: "un établissement",
  invitations_classe: "un QR code de classe",
  classes: "une classe",
  membres_classe: "un élève d’une classe",
  appels: "un appel",
};

/** « a modifié une séance », « a supprimé un compte »… */
export function phraseAudit(action: string, table: string): string {
  if (action === "SUPPRESSION_UTILISATEUR") return "a supprimé un compte";
  const verbe = VERBES[action] ?? action.toLowerCase();
  return `${verbe} ${ELEMENTS[table] ?? table}`;
}

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

/** « à l’instant », « il y a 5 min », « il y a 3 h », « hier », « il y a 4 j », puis la date. */
export function depuisQuand(iso: string | null, maintenant: Date): string {
  if (!iso) return "jamais";
  const ecart = maintenant.getTime() - Date.parse(iso);
  if (ecart < MINUTE) return "à l’instant";
  if (ecart < HEURE) return `il y a ${Math.floor(ecart / MINUTE)} min`;
  if (ecart < JOUR) return `il y a ${Math.floor(ecart / HEURE)} h`;
  if (ecart < 2 * JOUR) return "hier";
  if (ecart < 7 * JOUR) return `il y a ${Math.floor(ecart / JOUR)} j`;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

const jourParis = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d); // AAAA-MM-JJ

/** Regroupe des événements par jour (heure de Paris), du plus récent au plus ancien, en gardant l'ordre. */
export function grouperParJour<T extends { quand: string }>(
  evenements: readonly T[],
  maintenant: Date,
): { cle: string; titre: string; evenements: T[] }[] {
  const aujourdhui = jourParis(maintenant);
  const hier = jourParis(new Date(maintenant.getTime() - JOUR));
  const groupes = new Map<string, T[]>();
  for (const e of evenements) {
    const cle = jourParis(new Date(e.quand));
    const liste = groupes.get(cle);
    if (liste) liste.push(e);
    else groupes.set(cle, [e]);
  }
  return [...groupes].map(([cle, liste]) => ({
    cle,
    titre:
      cle === aujourdhui
        ? "Aujourd’hui"
        : cle === hier
          ? "Hier"
          : new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Europe/Paris",
            }).format(new Date(`${cle}T12:00:00Z`)),
    evenements: liste,
  }));
}
