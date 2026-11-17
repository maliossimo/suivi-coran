import "server-only";
import { z } from "zod";
import { extraireConfData, horairesDepuisConf, importADesuet, urlPageMawaqit } from "@/domain/mawaqit";
import { VERSION } from "@/lib/version";
import {
  enregistrerHorairesMawaqit,
  mosqueesMawaqit,
  noterErreurMawaqit,
  noterEssaiMawaqit,
} from "@/repositories/horairesMawaqit";

/**
 * Met à jour les horaires des mosquées depuis leur page publique Mawaqit (objet `confData`).
 * Appelée chaque nuit par la tâche planifiée de Vercel, mais chaque page n'est relue qu'une fois
 * tous les 25 jours : une seule requête par mosquée et par mois, identifiée, sans authentification.
 * En cas d'échec, rien n'est écrit : les horaires déjà en base (ou le calcul) restent utilisés.
 */

const DELAI_MS = 15_000;
const TAILLE_MAX = 3_000_000;

const jours = z.record(z.string(), z.array(z.string()));
const schemaConf = z.object({
  calendar: z.array(jours).length(12),
  timezone: z.string().nullish(),
});

export type ResultatImport =
  | { adresse: string; etat: "importe"; jours: number }
  | { adresse: string; etat: "a-jour" }
  | { adresse: string; etat: "erreur"; message: string };

interface PageLue {
  html: string;
  /** Pour le message d'erreur : statut, adresse finale, titre et taille de la page reçue. */
  resume: string;
}

async function lirePage(adresse: string): Promise<PageLue> {
  const reponse = await fetch(urlPageMawaqit(adresse), {
    headers: {
      "User-Agent": `SuiviCoran/${VERSION} (horaires de la mosquee, 1 requete par mois)`,
      Accept: "text/html",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(DELAI_MS),
  });
  if (!reponse.ok) throw new Error(`Mawaqit a répondu ${reponse.status}`);
  const html = await reponse.text();
  if (html.length > TAILLE_MAX) throw new Error("Page Mawaqit trop volumineuse");
  const titre = /<title[^>]*>([^<]{0,80})/i.exec(html)?.[1]?.trim() ?? "sans titre";
  const chemin = new URL(reponse.url || urlPageMawaqit(adresse)).pathname;
  return { html, resume: `${reponse.status} ${chemin}, « ${titre} », ${html.length} car.` };
}

/** Importe une mosquée (sans regarder la date du dernier import). */
export async function importerMosquee(id: string, adresse: string): Promise<ResultatImport> {
  try {
    const page = await lirePage(adresse);
    const brut = extraireConfData(page.html);
    if (brut === null) throw new Error(`confData introuvable dans la page Mawaqit (${page.resume})`);
    const conf = schemaConf.safeParse(brut);
    if (!conf.success) throw new Error(`confData inattendu : ${conf.error.issues[0]?.path.join(".") ?? "?"}`);
    const jours = horairesDepuisConf(conf.data);
    await enregistrerHorairesMawaqit(id, jours);
    return { adresse, etat: "importe", jours: jours.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await noterErreurMawaqit(id, message).catch(() => undefined);
    return { adresse, etat: "erreur", message };
  }
}

/**
 * Toutes les mosquées reliées à Mawaqit. `forcer` ignore le délai de 25 jours (jamais celui
 * d'un jour entre deux essais) : quoi qu'il arrive, au plus une requête par mosquée et par jour.
 */
export async function mettreAJourHorairesMosquees(forcer = false): Promise<ResultatImport[]> {
  const maintenant = new Date();
  const resultats: ResultatImport[] = [];
  // Une mosquée après l'autre : pas de rafale vers Mawaqit.
  for (const m of await mosqueesMawaqit()) {
    const aRelire = forcer
      ? importADesuet(null, maintenant, m.tenteLe)
      : importADesuet(m.importeLe, maintenant, m.tenteLe);
    if (!aRelire || !(await noterEssaiMawaqit(m.id, maintenant))) {
      resultats.push({ adresse: m.adresse, etat: "a-jour" });
      continue;
    }
    resultats.push(await importerMosquee(m.id, m.adresse));
  }
  return resultats;
}

/** Import demandé par l'admin (il vient de relier la page) : toujours au plus une requête par jour. */
export async function importerMaintenant(id: string, adresse: string): Promise<ResultatImport> {
  if (!(await noterEssaiMawaqit(id, new Date()))) return { adresse, etat: "a-jour" };
  return importerMosquee(id, adresse);
}
