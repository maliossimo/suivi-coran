import "server-only";
import { cache } from "react";
import { z } from "zod";
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

/** Les 114 sourates (lues une seule fois par requête). */
export const listerSourates = cache(async (): Promise<Sourate[]> => {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("sourates")
    .select("numero, nom_ar, nom_latin, nb_versets, premier_verset_global")
    .order("numero");
  if (error) throw new Error(`Lecture des sourates impossible : ${error.message}`);
  return schema.parse(data).map((s) => ({
    numero: s.numero,
    nomAr: s.nom_ar,
    nomLatin: s.nom_latin,
    nbVersets: s.nb_versets,
    premierVersetGlobal: s.premier_verset_global,
  }));
});
