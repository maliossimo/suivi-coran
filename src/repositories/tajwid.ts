import "server-only";
import type { Lecture } from "@/domain/lectures";
import { creerClientServeur } from "@/lib/supabase/server";

export interface NouveauSignalement {
  lecture: Lecture;
  sourate: number;
  verset: number;
  mot: string;
  regles: string[];
  remarque: string | null;
}

/** « L'appli s'est trompée » : au nom de la personne connectée (la base fixe l'auteur et l'heure). */
export async function enregistrerSignalement(s: NouveauSignalement): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("signalements_tajwid").insert({
    lecture: s.lecture,
    sourate: s.sourate,
    verset: s.verset,
    mot: s.mot,
    regles: s.regles,
    remarque: s.remarque,
  });
  if (error) throw new Error(`Signalement impossible : ${error.message}`);
}
