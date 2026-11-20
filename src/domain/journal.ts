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

/**
 * Quand, avec l'heure dès que ce n'est plus récent (heure de Paris) : « à l’instant », « il y a 5 min »,
 * « aujourd’hui à 15:20 », « hier à 21:14 », « lundi à 09:05 », puis « 2 oct. à 10:00 ».
 */
export function depuisQuand(iso: string | null, maintenant: Date): string {
  if (!iso) return "jamais";
  const quand = new Date(iso);
  const ecart = maintenant.getTime() - quand.getTime();
  if (ecart < MINUTE) return "à l’instant";
  if (ecart < HEURE) return `il y a ${Math.floor(ecart / MINUTE)} min`;
  const heure = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(quand);
  const jour = jourParis(quand);
  if (jour === jourParis(maintenant)) return `aujourd’hui à ${heure}`;
  if (jour === jourParis(new Date(maintenant.getTime() - JOUR))) return `hier à ${heure}`;
  if (ecart < 6 * JOUR) {
    const nom = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "Europe/Paris" }).format(quand);
    return `${nom} à ${heure}`;
  }
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  }).format(quand);
  return `${date} à ${heure}`;
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

export interface OuvertureGroupee {
  id: string | number;
  personneId: string;
  /** La plus récente, puis la plus ancienne du groupe. */
  derniere: string;
  premiere: string;
  nombre: number;
}

/**
 * Ouvertures (de la plus récente à la plus ancienne) regroupées quand la même personne ouvre l'appli
 * plusieurs fois de suite le même jour : « Malek a ouvert l'appli 6 fois, de 16:35 à 19:46 ».
 */
export function regrouperOuvertures(
  ouvertures: readonly { id: string | number; quand: string; personneId: string }[],
): OuvertureGroupee[] {
  const groupes: OuvertureGroupee[] = [];
  for (const o of ouvertures) {
    const g = groupes.at(-1);
    if (
      g &&
      g.personneId === o.personneId &&
      jourParis(new Date(g.premiere)) === jourParis(new Date(o.quand))
    ) {
      g.premiere = o.quand;
      g.nombre++;
    } else {
      groupes.push({ id: o.id, personneId: o.personneId, derniere: o.quand, premiere: o.quand, nombre: 1 });
    }
  }
  return groupes;
}

/** Une erreur telle que le tableau de l'admin la montre : les mêmes messages réunis. */
export interface GroupeErreurs {
  message: string;
  nombre: number;
  /** La plus récente (les erreurs arrivent de la plus récente à la plus ancienne). */
  quand: string;
  pages: string[];
  versions: string[];
}

/** Réunit les erreurs au même message (un même bug vu plusieurs fois), de la plus récente à la plus ancienne. */
export function regrouperErreurs(
  erreurs: readonly { quand: string; page: string; message: string; version: string | null }[],
): GroupeErreurs[] {
  const groupes = new Map<string, GroupeErreurs>();
  for (const e of erreurs) {
    const g = groupes.get(e.message);
    if (!g) {
      groupes.set(e.message, {
        message: e.message,
        nombre: 1,
        quand: e.quand,
        pages: [e.page],
        versions: e.version ? [e.version] : [],
      });
      continue;
    }
    g.nombre++;
    if (!g.pages.includes(e.page)) g.pages.push(e.page);
    if (e.version && !g.versions.includes(e.version)) g.versions.push(e.version);
  }
  return [...groupes.values()];
}

export type TypeErreur = "reseau" | "mise-a-jour" | "affichage" | "navigateur" | "appli";

export interface ExplicationErreur {
  type: TypeErreur;
  /** Court libellé de la famille : « Réseau », « Mise à jour »… */
  famille: string;
  /** Ce que ça veut dire, en une phrase simple. */
  explication: string;
  /** Faux : à regarder ; vrai : sans gravité tant que ça ne se répète pas. */
  sansGravite: boolean;
}

/**
 * Traduit le message technique d'une erreur en une phrase que l'admin comprend : réseau coupé,
 * appli mise à jour pendant l'utilisation, écart d'affichage… et dit si c'est sans gravité.
 */
export function expliquerErreur(message: string): ExplicationErreur {
  if (
    /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i.test(message)
  )
    return {
      type: "mise-a-jour",
      famille: "Mise à jour",
      explication:
        "L'appli s'est mise à jour pendant qu'elle était ouverte. Elle se règle en la fermant puis en la rouvrant.",
      sansGravite: true,
    };
  if (
    /Load failed|Failed to fetch|NetworkError|network request failed|fetch failed|Network connection was lost/i.test(
      message,
    )
  )
    return {
      type: "reseau",
      famille: "Réseau",
      explication:
        "Une requête a été coupée : réseau perdu, ou téléphone sorti de veille. Sans gravité si ça ne se répète pas.",
      sansGravite: true,
    };
  if (/ResizeObserver loop|Script error\.?$|The operation was aborted|AbortError/i.test(message))
    return {
      type: "navigateur",
      famille: "Navigateur",
      explication:
        "Message du navigateur lui-même (page quittée en cours de chargement, extension…). Sans gravité.",
      sansGravite: true,
    };
  if (/hydrat|Minified React error #(418|423|425)|did not match/i.test(message))
    return {
      type: "affichage",
      famille: "Affichage",
      explication:
        "Écart entre ce que le serveur a envoyé et ce que le téléphone a affiché. À regarder si ça se répète.",
      sansGravite: false,
    };
  return {
    type: "appli",
    famille: "Appli",
    explication: "Erreur de l'appli elle-même : à regarder (le détail technique est dessous).",
    sansGravite: false,
  };
}

const NOMS_PAGES: [string, string][] = [
  ["/connexion", "écran de connexion"],
  ["/eleve", "espace élève"],
  ["/maitre", "espace Cheikh"],
  ["/admin", "administration"],
  ["/presences", "présences"],
  ["/coran", "lecture du Coran"],
  ["/compte", "mon compte"],
  ["/mosquee", "ma mosquée"],
];

/** « /connexion » → « écran de connexion » ; une page inconnue garde son adresse. */
export function nomDePage(page: string): string {
  const nom = NOMS_PAGES.find(([debut]) => page === debut || page.startsWith(`${debut}/`));
  return nom ? nom[1] : page;
}
