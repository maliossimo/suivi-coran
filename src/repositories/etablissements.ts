import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { Coordonnees, HorairesPriere } from "@/domain/priere";
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

const schemaHoraires = z.object({
  fajr: z.number(),
  chourouq: z.number(),
  dhuhr: z.number(),
  asr: z.number(),
  maghrib: z.number(),
  isha: z.number(),
});

/**
 * Horaires de la mosquée pour un jour (calendrier importé de Mawaqit), en minutes depuis minuit ;
 * null s'il n'y a pas de calendrier (ou si la base n'a pas encore la table).
 */
export const horairesMosquee = cache(
  async (etablissementId: string, mois: number, jour: number): Promise<HorairesPriere | null> => {
    const supabase = await creerClientServeur();
    const { data, error } = await supabase
      .from("horaires_priere")
      .select("fajr, chourouq, dhuhr, asr, maghrib, isha")
      .eq("etablissement_id", etablissementId)
      .eq("mois", mois)
      .eq("jour", jour)
      .maybeSingle();
    if (error || !data) return null;
    const h = schemaHoraires.safeParse(data);
    if (!h.success) return null;
    const { chourouq, ...reste } = h.data;
    return { ...reste, lever: chourouq };
  },
);

export interface LienMawaqit {
  adresse: string;
  importeLe: string | null;
  erreur: string | null;
}

/** Pages Mawaqit reliées aux établissements (admin) ; vide si les colonnes n'existent pas encore. */
export async function liensMawaqit(): Promise<Map<string, LienMawaqit>> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("etablissements")
    .select("id, mawaqit, mawaqit_importe_le, mawaqit_erreur")
    .not("mawaqit", "is", null);
  const liens = new Map<string, LienMawaqit>();
  if (error || !data) return liens;
  for (const l of data as {
    id: string;
    mawaqit: string;
    mawaqit_importe_le: string | null;
    mawaqit_erreur: string | null;
  }[]) {
    liens.set(l.id, { adresse: l.mawaqit, importeLe: l.mawaqit_importe_le, erreur: l.mawaqit_erreur });
  }
  return liens;
}

/**
 * Relie (ou délie) la page Mawaqit d'une mosquée : réservé à l'admin par la base.
 * Nouvelle adresse : l'import peut repartir tout de suite. Sans adresse : ses horaires sont retirés
 * (le ciel revient au calcul).
 */
export async function relierMawaqit(id: string, adresse: string | null): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("etablissements")
    .update({ mawaqit: adresse, mawaqit_tente_le: null, mawaqit_erreur: null, mawaqit_importe_le: null })
    .eq("id", id);
  if (error) throw new Error(`Page Mawaqit impossible à enregistrer : ${error.message}`);
  if (!adresse) {
    const { error: e2 } = await supabase.from("horaires_priere").delete().eq("etablissement_id", id);
    if (e2) throw new Error(`Horaires impossibles à retirer : ${e2.message}`);
  }
}
