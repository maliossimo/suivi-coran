import "server-only";
import { z } from "zod";
import type { Bilan, TypeSeance } from "@/domain/fiche";
import { creerClientServeur } from "@/lib/supabase/server";

const schemaLigne = z.object({
  id: z.string().uuid(),
  eleve_id: z.string().uuid(),
  bien_memorise: z.string().nullable(),
  a_renforcer: z.string().nullable(),
  modifie_par: z.string().uuid().nullable(),
});

/** Bilan d'un élève pour un mois (AAAA-MM-01) et un type, ou null s'il n'est pas encore écrit. */
export async function bilanDuMois(eleveId: string, type: TypeSeance, mois: string): Promise<Bilan | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("bilans_mensuels")
    .select("id, eleve_id, bien_memorise, a_renforcer, modifie_par")
    .eq("eleve_id", eleveId)
    .eq("type", type)
    .eq("mois", mois)
    .maybeSingle();
  if (error) throw new Error(`Lecture du bilan impossible : ${error.message}`);
  if (!data) return null;
  const ligne = schemaLigne.parse(data);
  return {
    id: ligne.id,
    bienMemorise: ligne.bien_memorise ?? "",
    aRenforcer: ligne.a_renforcer ?? "",
    corrige: ligne.modifie_par !== null && ligne.modifie_par !== ligne.eleve_id,
  };
}

export interface SaisieBilan {
  type: TypeSeance;
  mois: string; // AAAA-MM-01
  bienMemorise: string;
  aRenforcer: string;
}

export async function enregistrerBilan(eleveId: string, saisie: SaisieBilan): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("bilans_mensuels").upsert(
    {
      eleve_id: eleveId,
      type: saisie.type,
      mois: saisie.mois,
      bien_memorise: saisie.bienMemorise || null,
      a_renforcer: saisie.aRenforcer || null,
    },
    { onConflict: "eleve_id,type,mois" },
  );
  if (error) throw new Error(`Enregistrement du bilan impossible : ${error.message}`);
}
