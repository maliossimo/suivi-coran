import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { Coordonnees } from "@/domain/priere";
import { creerClientServeur } from "@/lib/supabase/server";

const schemaPosition = z.object({ latitude: z.number().nullable(), longitude: z.number().nullable() });

/**
 * Position de la mosquée (null si elle n'est pas encore placée, ou si la base n'a pas encore la colonne :
 * la prévisualisation de main partage la base de production).
 */
export const positionEtablissement = cache(async (id: string): Promise<Coordonnees | null> => {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("etablissements")
    .select("latitude, longitude")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const p = schemaPosition.safeParse(data);
  if (!p.success || p.data.latitude === null || p.data.longitude === null) return null;
  return { latitude: p.data.latitude, longitude: p.data.longitude };
});

/** Positions de tous les établissements (admin) ; vide si la colonne n'existe pas encore. */
export async function positionsEtablissements(): Promise<Map<string, Coordonnees>> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.from("etablissements").select("id, latitude, longitude");
  const positions = new Map<string, Coordonnees>();
  if (error || !data) return positions;
  for (const ligne of data as { id: string; latitude: number | null; longitude: number | null }[]) {
    if (ligne.latitude !== null && ligne.longitude !== null)
      positions.set(ligne.id, { latitude: ligne.latitude, longitude: ligne.longitude });
  }
  return positions;
}

/** Place (ou retire) la mosquée : réservé à l'admin par la base. */
export async function placerEtablissement(id: string, position: Coordonnees | null): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("etablissements")
    .update({ latitude: position?.latitude ?? null, longitude: position?.longitude ?? null })
    .eq("id", id);
  if (error) throw new Error(`Position impossible à enregistrer : ${error.message}`);
}
