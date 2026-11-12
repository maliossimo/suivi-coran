import "server-only";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";

export interface Commentaire {
  texte: string;
  creeLe: string;
}

/** Ce que l'on commente : une séance ou un bilan mensuel. */
export type CibleCommentaire = { seanceId: string } | { bilanId: string };

const schema = z.array(z.object({ texte: z.string(), cree_le: z.string() }));

function colonneCible(cible: CibleCommentaire): { seance_id: string } | { bilan_id: string } {
  return "seanceId" in cible ? { seance_id: cible.seanceId } : { bilan_id: cible.bilanId };
}

/** Commentaires du maître sur une séance ou un bilan, du plus récent au plus ancien. */
export async function commentairesDe(cible: CibleCommentaire): Promise<Commentaire[]> {
  const supabase = await creerClientServeur();
  const [colonne, valeur] = Object.entries(colonneCible(cible))[0]!;
  const { data, error } = await supabase
    .from("commentaires")
    .select("texte, cree_le")
    .eq(colonne, valeur)
    .order("cree_le", { ascending: false });
  if (error) throw new Error(`Lecture des commentaires impossible : ${error.message}`);
  return schema.parse(data).map((c) => ({ texte: c.texte, creeLe: c.cree_le }));
}

export function commentairesDeSeance(seanceId: string): Promise<Commentaire[]> {
  return commentairesDe({ seanceId });
}

/**
 * Commentaires de la séance d'un jour, sans connaître son identifiant :
 * lus en même temps que la séance (un aller-retour de moins).
 */
export async function commentairesDuJour(
  eleveId: string,
  type: string,
  date: string,
): Promise<Commentaire[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("commentaires")
    .select("texte, cree_le, seances!inner(date, type)")
    .eq("eleve_id", eleveId)
    .eq("seances.date", date)
    .eq("seances.type", type)
    .order("cree_le", { ascending: false });
  if (error) throw new Error(`Lecture des commentaires impossible : ${error.message}`);
  return schema.parse(data).map((c) => ({ texte: c.texte, creeLe: c.cree_le }));
}

export async function ajouterCommentaire(
  eleveId: string,
  auteurId: string,
  cible: CibleCommentaire,
  texte: string,
): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("commentaires")
    .insert({ eleve_id: eleveId, auteur_id: auteurId, ...colonneCible(cible), texte });
  if (error) throw new Error(`Commentaire impossible : ${error.message}`);
}
