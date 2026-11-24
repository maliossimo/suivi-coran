import "server-only";
import { z } from "zod";
import type { Acquis } from "@/domain/acquis";
import { creerClientServeur } from "@/lib/supabase/server";

/*
 * « Ce que je connais déjà » (table acquis). Les droits sont appliqués par la base :
 * l'élève déclare pour lui, son Cheikh lit et marque l'écoute.
 * Lectures tolérantes : si la base n'a pas encore la table (site mis en ligne juste avant
 * elle), l'appli continue sans les acquis au lieu de tomber.
 */

const COLONNES =
  "id, eleve_id, sourate_debut, verset_debut, sourate_fin, verset_fin, a_ecouter, ecoute_le, valide_le, cree_le";

const schemaLigne = z.object({
  id: z.string().uuid(),
  eleve_id: z.string().uuid(),
  sourate_debut: z.number().int(),
  verset_debut: z.number().int(),
  sourate_fin: z.number().int(),
  verset_fin: z.number().int(),
  a_ecouter: z.boolean(),
  ecoute_le: z.string().nullable(),
  valide_le: z.string().nullable(),
  cree_le: z.string(),
});

function versAcquis(l: z.infer<typeof schemaLigne>): Acquis {
  return {
    id: l.id,
    eleveId: l.eleve_id,
    passage: {
      sourateDebut: l.sourate_debut,
      versetDebut: l.verset_debut,
      sourateFin: l.sourate_fin,
      versetFin: l.verset_fin,
    },
    aEcouter: l.a_ecouter,
    ecoute: l.ecoute_le !== null,
    valide: l.valide_le !== null,
    creeLe: l.cree_le,
  };
}

/** Les parties déclarées par un élève, dans l'ordre du Coran. */
export async function acquisDe(eleveId: string): Promise<Acquis[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("acquis")
    .select(COLONNES)
    .eq("eleve_id", eleveId)
    .order("sourate_debut")
    .order("verset_debut");
  if (error) return [];
  return z.array(schemaLigne).parse(data).map(versAcquis);
}

/** Parties que leurs élèves veulent faire écouter et que le Cheikh n'a pas encore écoutées (élèves visibles). */
export async function acquisAEcouterParEleve(): Promise<Map<string, number>> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("acquis")
    .select("eleve_id")
    .eq("a_ecouter", true)
    .is("ecoute_le", null)
    .limit(5000);
  const compte = new Map<string, number>();
  if (error) return compte;
  for (const l of z.array(z.object({ eleve_id: z.string().uuid() })).parse(data)) {
    compte.set(l.eleve_id, (compte.get(l.eleve_id) ?? 0) + 1);
  }
  return compte;
}

export async function ajouterAcquis(
  eleveId: string,
  parties: readonly { sourateDebut: number; versetDebut: number; sourateFin: number; versetFin: number }[],
  aEcouter: boolean,
): Promise<void> {
  if (!parties.length) return;
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("acquis").insert(
    parties.map((p) => ({
      eleve_id: eleveId,
      sourate_debut: p.sourateDebut,
      verset_debut: p.versetDebut,
      sourate_fin: p.sourateFin,
      verset_fin: p.versetFin,
      a_ecouter: aEcouter,
    })),
  );
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
}

export async function retirerAcquis(eleveId: string, id: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("acquis").delete().eq("id", id).eq("eleve_id", eleveId);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
}

export async function changerEcouteDemandee(eleveId: string, id: string, aEcouter: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("acquis")
    .update({ a_ecouter: aEcouter })
    .eq("id", id)
    .eq("eleve_id", eleveId);
  if (error) throw new Error(`Modification impossible : ${error.message}`);
}

/** L'élève change la plage d'une partie qu'il a déclarée, tant que son Cheikh ne l'a pas écoutée. */
export async function modifierPassageAcquis(
  eleveId: string,
  id: string,
  p: { sourateDebut: number; versetDebut: number; sourateFin: number; versetFin: number },
): Promise<boolean> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("acquis")
    .update({
      sourate_debut: p.sourateDebut,
      verset_debut: p.versetDebut,
      sourate_fin: p.sourateFin,
      verset_fin: p.versetFin,
    })
    .eq("id", id)
    .eq("eleve_id", eleveId)
    .is("ecoute_le", null)
    .is("valide_le", null)
    .select("id");
  if (error) throw new Error(`Modification impossible : ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Le Cheikh marque une partie écoutée, validée, ou retire sa marque (vérifié par la base). */
export async function marquerAcquis(id: string, etat: "aucun" | "ecoute" | "valide"): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("marquer_acquis", { p_id: id, p_etat: etat });
  if (error) throw new Error(`Marque impossible : ${error.message}`);
}

/** L'élève a déjà répondu à « Ce que tu connais déjà » ? (Faute de réponse de la base : oui, on ne bloque pas.) */
export async function acquisRepondu(eleveId: string): Promise<boolean> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("acquis_repondu")
    .eq("id", eleveId)
    .maybeSingle();
  if (error || !data) return true;
  return z.object({ acquis_repondu: z.boolean() }).safeParse(data).data?.acquis_repondu ?? true;
}

export async function marquerAcquisRepondu(): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("acquis_repondu");
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
}
