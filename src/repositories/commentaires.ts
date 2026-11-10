import "server-only";
import { z } from "zod";
import { creerClientServeur } from "@/lib/supabase/server";

export interface Commentaire {
  texte: string;
  creeLe: string;
}

const schema = z.array(z.object({ texte: z.string(), cree_le: z.string() }));

/** Commentaires du maître sur une séance, du plus récent au plus ancien. */
export async function commentairesDeSeance(seanceId: string): Promise<Commentaire[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("commentaires")
    .select("texte, cree_le")
    .eq("seance_id", seanceId)
    .order("cree_le", { ascending: false });
  if (error) throw new Error(`Lecture des commentaires impossible : ${error.message}`);
  return schema.parse(data).map((c) => ({ texte: c.texte, creeLe: c.cree_le }));
}
