import "server-only";
import { z } from "zod";
import { versetsHafsDuVerset } from "@/domain/coran";
import { correspondanceWarsh } from "@/repositories/coran";
import {
  explicationsSourate,
  versionExplications,
  type ExplicationVerset,
} from "@/repositories/explications";
import type { Profil } from "@/repositories/profils";
import { peutOuvrirCoran } from "./coran";

export interface ExplicationsSourate {
  /** Par numéro de verset affiché (Hafs ou Warsh) ; un verset Warsh peut réunir deux versets Hafs. */
  versets: Record<number, ExplicationVerset[]>;
  source: { titre: string; editeur: string; lien: string; version: string | null };
}

const schemaDemande = z.object({
  lecture: z.enum(["hafs", "warsh"]).catch("hafs"),
  sourate: z.coerce.number().int().min(1).max(114),
});

/** Explications d'une sourate, dans la numérotation de la lecture affichée. */
export async function chargerExplications(
  acteur: Profil | null,
  brut: { lecture: unknown; sourate: unknown },
): Promise<ExplicationsSourate | null> {
  if (!acteur || !peutOuvrirCoran(acteur)) return null;
  const d = schemaDemande.safeParse(brut);
  if (!d.success) return null;
  const { lecture, sourate } = d.data;

  const [hafs, version, correspondance] = await Promise.all([
    explicationsSourate(sourate),
    versionExplications(),
    lecture === "warsh" ? correspondanceWarsh() : Promise.resolve(null),
  ]);

  const versets: Record<number, ExplicationVerset[]> = {};
  const table = correspondance?.[String(sourate)];
  if (table) {
    const numerosWarsh = new Set(table.flat());
    for (const w of numerosWarsh) {
      versets[w] = versetsHafsDuVerset(table, w)
        .map((h) => hafs.get(h))
        .filter((e): e is ExplicationVerset => !!e);
    }
  } else {
    for (const [n, e] of hafs) versets[n] = [e];
  }

  return {
    versets,
    source: {
      titre: "Résumé dans l’exégèse du noble Coran (Al-Mukhtasar), traduction française",
      editeur: "QuranEnc.com",
      lien: `https://quranenc.com/fr/browse/french_mokhtasar/${sourate}`,
      version,
    },
  };
}
