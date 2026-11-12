import "server-only";
import { cache } from "react";
import { z } from "zod";
import { souratesDeLecture, type Lecture } from "@/domain/lectures";
import type { Sourate } from "@/domain/versets";
import { creerClientServeur } from "@/lib/supabase/server";

const schema = z.array(
  z.object({
    numero: z.number().int(),
    nom_ar: z.string(),
    nom_latin: z.string(),
    nb_versets: z.number().int(),
    premier_verset_global: z.number().int(),
  }),
);

// Le référentiel ne change jamais : une fois lu, il reste en mémoire du serveur
// (plus de requête à la base pour chaque page).
let enMemoire: Sourate[] | null = null;

/** Les 114 sourates, dans la numérotation de la lecture demandée (Hafs par défaut). */
export const listerSourates = cache(async (lecture: Lecture = "hafs"): Promise<Sourate[]> => {
  return souratesDeLecture(await souratesHafs(), lecture);
});

/** Le référentiel de la base (numérotation Hafs). */
const souratesHafs = cache(async (): Promise<Sourate[]> => {
  if (enMemoire) return enMemoire;
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("sourates")
    .select("numero, nom_ar, nom_latin, nb_versets, premier_verset_global")
    .order("numero");
  if (error) throw new Error(`Lecture des sourates impossible : ${error.message}`);
  const sourates = schema.parse(data).map((s) => ({
    numero: s.numero,
    nomAr: s.nom_ar,
    nomLatin: s.nom_latin,
    nbVersets: s.nb_versets,
    premierVersetGlobal: s.premier_verset_global,
  }));
  if (sourates.length === 114) enMemoire = sourates;
  return sourates;
});
