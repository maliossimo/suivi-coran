import "server-only";
import { z } from "zod";
import { CODES_TAJWID, type SegmentTajwid } from "@/domain/coran";
import type { Lecture } from "@/domain/lectures";
import { RECITATEURS_VERSETS } from "@/donnees/recitateurs";

/**
 * Texte du Coran et récitations.
 * - Texte : données du Complexe du Roi Fahd (KFGQPC), Hafs v18 et Warsh v10, un fichier par sourate
 *   (src/donnees/coran). Chaque verset se termine par son numéro, dessiné en rosace par la police du Complexe.
 * - Tajwid (Hafs) : texte Uthmani de Tanzil.net découpé selon les règles de cpfair/quran-tajweed
 *   (CC BY 4.0), un fichier par sourate (src/donnees/coran/tajwid).
 * - Récitations : EveryAyah (un fichier par verset : le texte suit la récitation) et mp3quran.net
 *   (un fichier par sourate), lues directement depuis leurs serveurs : rien n'est stocké chez nous.
 */

export async function versetsSourate(lecture: Lecture, sourate: number): Promise<string[]> {
  const donnees: { default: unknown } =
    lecture === "warsh"
      ? await import(`@/donnees/coran/warsh/${sourate}.json`)
      : await import(`@/donnees/coran/hafs/${sourate}.json`);
  return z.array(z.string()).parse(donnees.default);
}

const schemaSegment = z.union([z.string(), z.tuple([z.enum(CODES_TAJWID), z.string()])]);

/** Sourate en Hafs découpée pour colorer le tajwid. */
export async function tajwidSourate(sourate: number): Promise<SegmentTajwid[][]> {
  const donnees: { default: unknown } = await import(`@/donnees/coran/tajwid/${sourate}.json`);
  return z.array(z.array(schemaSegment)).parse(donnees.default);
}

/** Une récitation proposée à l'écoute. */
export interface Recitation {
  id: string;
  nom: string;
  style: string;
  /** Vrai : un fichier par verset (le texte suit). Faux : un fichier par sourate. */
  suivi: boolean;
  /** Dossier des fichiers MP3. */
  source: string;
}

/** Récitations verset par verset (EveryAyah) de la lecture. */
export function recitationsVersets(lecture: Lecture): Recitation[] {
  return RECITATEURS_VERSETS.filter((r) => r.lecture === lecture).map((r) => ({
    id: `ea-${r.dossier}`,
    nom: r.nom,
    style: r.style,
    suivi: true,
    source: `https://everyayah.com/data/${r.dossier}/`,
  }));
}

export interface Recitateur {
  /** Identifiant unique (récitateur + enregistrement). */
  id: string;
  nom: string;
  /** « Murattal », « Mujawwad »… */
  style: string;
  /** Dossier des fichiers MP3 (https://serverN.mp3quran.net/…/). */
  serveur: string;
  sourates: number[];
}

const API = "https://mp3quran.net/api/v3";
const UN_JOUR = 60 * 60 * 24;

const schemaRiwayat = z.object({ riwayat: z.array(z.object({ id: z.coerce.number(), name: z.string() })) });
const schemaRecitateurs = z.object({
  reciters: z.array(
    z.object({
      id: z.coerce.number(),
      name: z.string(),
      moshaf: z.array(
        z.object({
          id: z.coerce.number(),
          name: z.string(),
          server: z.string().url(),
          surah_list: z.string(),
        }),
      ),
    }),
  ),
});

/** Le nom d'un enregistrement correspond-il à la lecture ? (Warsh : voie d'al-Azraq, pas al-Asbahani). */
function correspond(nom: string, lecture: Lecture): boolean {
  if (lecture === "warsh") return /warsh/i.test(nom) && !/asbahani/i.test(nom);
  return /hafs/i.test(nom);
}

async function lireJson(url: string): Promise<unknown> {
  const reponse = await fetch(url, { next: { revalidate: UN_JOUR } });
  if (!reponse.ok) throw new Error(`mp3quran : ${reponse.status}`);
  return reponse.json();
}

/** Récitateurs disponibles pour une lecture (liste mise en cache une journée). */
export async function recitateurs(lecture: Lecture): Promise<Recitateur[]> {
  const { riwayat } = schemaRiwayat.parse(await lireJson(`${API}/riwayat?language=eng`));
  const ids = riwayat.filter((r) => correspond(r.name, lecture)).map((r) => r.id);
  const listes = await Promise.all(
    ids.map(async (id) =>
      schemaRecitateurs.parse(await lireJson(`${API}/reciters?language=eng&rewaya=${id}`)),
    ),
  );
  const resultat = new Map<string, Recitateur>();
  for (const { reciters } of listes) {
    for (const r of reciters) {
      for (const m of r.moshaf) {
        if (!correspond(m.name, lecture) || !m.server.startsWith("https://")) continue;
        const style = m.name.split(" - ").slice(1).join(" - ").trim();
        resultat.set(`${r.id}-${m.id}`, {
          id: `${r.id}-${m.id}`,
          nom: r.name.trim(),
          style,
          serveur: m.server.endsWith("/") ? m.server : `${m.server}/`,
          sourates: m.surah_list
            .split(",")
            .map((n) => Number(n))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 114),
        });
      }
    }
  }
  return [...resultat.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
