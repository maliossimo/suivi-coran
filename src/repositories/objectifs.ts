import "server-only";
import { z } from "zod";
import type { NumeroSemaine } from "@/domain/calendrier";
import type { ObjectifStat } from "@/domain/classe";
import type { Objectif, StatutObjectif, TypeSeance } from "@/domain/fiche";
import { creerClientServeur } from "@/lib/supabase/server";

const schema = z.array(
  z.object({
    semaine: z.number().int().min(1).max(5).nullable(),
    description: z.string(),
    statut: z.enum(["en_cours", "atteint", "non_atteint"]),
  }),
);

/** Objectifs (hebdomadaires et mensuel) d'un élève pour un mois et un type. */
export async function objectifsDuMois(eleveId: string, type: TypeSeance, mois: string): Promise<Objectif[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("objectifs")
    .select("semaine, description, statut")
    .eq("eleve_id", eleveId)
    .eq("type", type)
    .eq("mois", mois);
  if (error) throw new Error(`Lecture des objectifs impossible : ${error.message}`);
  return schema.parse(data).map((o) => ({
    semaine: o.semaine as NumeroSemaine | null,
    description: o.description,
    statut: o.statut,
  }));
}

export interface SaisieObjectif {
  type: TypeSeance;
  mois: string; // AAAA-MM-01
  semaine: NumeroSemaine | null;
  description: string;
  statut: StatutObjectif;
}

export async function enregistrerObjectif(eleveId: string, saisie: SaisieObjectif): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("objectifs").upsert(
    {
      eleve_id: eleveId,
      type: saisie.type,
      periode: saisie.semaine === null ? "mensuel" : "hebdo",
      mois: saisie.mois,
      semaine: saisie.semaine,
      description: saisie.description,
      statut: saisie.statut,
    },
    { onConflict: "eleve_id,type,mois,semaine" },
  );
  if (error) throw new Error(`Enregistrement de l'objectif impossible : ${error.message}`);
}

/** Statuts des objectifs de tous les élèves visibles pour un mois (AAAA-MM-01). */
export async function statutsObjectifsDuMois(mois: string): Promise<ObjectifStat[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.from("objectifs").select("eleve_id, statut").eq("mois", mois);
  if (error) throw new Error(`Lecture des objectifs impossible : ${error.message}`);
  return z
    .array(z.object({ eleve_id: z.string().uuid(), statut: z.enum(["en_cours", "atteint", "non_atteint"]) }))
    .parse(data)
    .map((o) => ({ eleveId: o.eleve_id, statut: o.statut }));
}

/** Objectifs d'un élève (tous types) entre deux mois inclus (AAAA-MM-01). */
export async function objectifsEntre(
  eleveId: string,
  debut: string,
  fin: string,
): Promise<(Objectif & { mois: string })[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("objectifs")
    .select("mois, semaine, description, statut")
    .eq("eleve_id", eleveId)
    .gte("mois", debut)
    .lte("mois", fin);
  if (error) throw new Error(`Lecture des objectifs impossible : ${error.message}`);
  return z
    .array(
      z.object({
        mois: z.string(),
        semaine: z.number().int().min(1).max(5).nullable(),
        description: z.string(),
        statut: z.enum(["en_cours", "atteint", "non_atteint"]),
      }),
    )
    .parse(data)
    .map((o) => ({
      mois: o.mois,
      semaine: o.semaine as NumeroSemaine | null,
      description: o.description,
      statut: o.statut,
    }));
}
