import "server-only";
import { z } from "zod";
import { pageGenerique, vitesseParPage, type LigneVitesse } from "@/domain/vitesse";
import type { Profil } from "@/repositories/profils";
import {
  listerEvenementsSecurite,
  listerMesuresVitesse,
  noterAppareil,
  noterEchecConnexion,
  noterVitesse,
  type EvenementSecurite,
} from "@/repositories/securite";

/** « Android · Chrome », « iPhone · Safari »… (sans détail qui identifierait l'appareil). */
export function libelleAppareil(ua: string): string {
  const systeme = /iPhone|iPad/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "Autre";
  const navigateur = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "navigateur";
  return `${systeme} · ${navigateur}`;
}

/** Mot de passe erroné (en silence ; n'empêche jamais la réponse à la personne). */
export async function signalerEchecConnexion(email: string, ua: string): Promise<void> {
  await noterEchecConnexion(email, libelleAppareil(ua)).catch(() => undefined);
}

const schemaAppareil = z.string().regex(/^[\w-]{8,64}$/);

/** L'appareil de la personne connectée (identifiant tiré au hasard sur le téléphone). */
export async function signalerAppareil(profil: Profil | null, appareil: unknown, ua: string): Promise<void> {
  if (!profil) return;
  const id = schemaAppareil.safeParse(appareil);
  if (!id.success) return;
  await noterAppareil(id.data, libelleAppareil(ua)).catch(() => false);
}

const schemaMesure = z.object({
  page: z.string().min(1).max(500),
  metrique: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB"]),
  valeur: z.number().min(0).max(599_999),
});

/** Une mesure de vitesse réelle envoyée par le téléphone. */
export async function recevoirMesure(profil: Profil | null, brut: unknown, ua: string): Promise<void> {
  if (!profil) return;
  const m = schemaMesure.safeParse(brut);
  if (!m.success) return;
  await noterVitesse(
    pageGenerique(m.data.page),
    m.data.metrique,
    m.data.valeur,
    /Mobi|Android|iPhone/.test(ua),
  ).catch(() => undefined);
}

export interface EvenementAffiche extends EvenementSecurite {
  nom: string | null;
}

/** Pour l'admin : sécurité (30 jours) et vitesse réelle (7 jours). */
export async function chargerSecuriteEtVitesse(
  profil: Profil,
  noms: Map<string, string>,
): Promise<{ evenements: EvenementAffiche[]; vitesse: LigneVitesse[]; mesures: number }> {
  if (profil.role !== "admin") return { evenements: [], vitesse: [], mesures: 0 };
  const [evenements, mesures] = await Promise.all([
    listerEvenementsSecurite().catch(() => []),
    listerMesuresVitesse().catch(() => []),
  ]);
  return {
    evenements: evenements.map((e) => ({
      ...e,
      nom: e.personneId ? (noms.get(e.personneId) ?? null) : null,
    })),
    vitesse: vitesseParPage(mesures).slice(0, 12),
    mesures: mesures.length,
  };
}
