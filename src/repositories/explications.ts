import "server-only";
import { z } from "zod";

/*
 * Explication des versets en français : « Résumé dans l'exégèse du noble Coran »
 * (Al-Mukhtasar fi tafsir), traduction française publiée par QuranEnc.com.
 *
 * Conditions de QuranEnc : texte repris sans modification, source et numéro de version
 * cités, mise à jour selon la dernière version (d'où la relecture chaque semaine).
 */
const API = "https://quranenc.com/api/v1";
export const CLE_EXPLICATION = "french_mokhtasar";
const UNE_SEMAINE = 60 * 60 * 24 * 7;

export interface ExplicationVerset {
  texte: string;
  notes: string | null;
}

const schemaVerset = z.object({
  aya: z.coerce.number().int().positive(),
  translation: z.string(),
  footnotes: z.string().nullish(),
});

// L'API renvoie { result: [...] } ; on accepte aussi un tableau nu.
const schemaSourate = z.union([z.object({ result: z.array(schemaVerset) }), z.array(schemaVerset)]);

/** Explications de tous les versets d'une sourate (numérotation Hafs). */
export async function explicationsSourate(sourate: number): Promise<Map<number, ExplicationVerset>> {
  const reponse = await fetch(`${API}/translation/sura/${CLE_EXPLICATION}/${sourate}`, {
    next: { revalidate: UNE_SEMAINE },
    signal: AbortSignal.timeout(10_000),
  });
  if (!reponse.ok) throw new Error(`QuranEnc : ${reponse.status}`);
  const donnees = schemaSourate.parse(await reponse.json());
  const versets = Array.isArray(donnees) ? donnees : donnees.result;
  return new Map(
    versets.map((v) => [v.aya, { texte: v.translation.trim(), notes: v.footnotes?.trim() || null }]),
  );
}

const schemaTraduction = z.object({ key: z.string(), version: z.coerce.string().nullish() }).passthrough();
const schemaListe = z.union([
  z.object({ translations: z.array(schemaTraduction) }),
  z.array(schemaTraduction),
]);

/** Numéro de version publié par QuranEnc (à citer avec le texte) ; null s'il est introuvable. */
export async function versionExplications(): Promise<string | null> {
  try {
    const reponse = await fetch(`${API}/translations/list/fr`, {
      next: { revalidate: UNE_SEMAINE },
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok) return null;
    const donnees = schemaListe.parse(await reponse.json());
    const liste = Array.isArray(donnees) ? donnees : donnees.translations;
    return liste.find((t) => t.key === CLE_EXPLICATION)?.version ?? null;
  } catch {
    return null;
  }
}
