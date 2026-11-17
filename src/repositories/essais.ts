import "server-only";
import type { Essai, FauteEssai } from "@/domain/essais";
import type { Lecture } from "@/domain/lectures";
import { creerClientServeur } from "@/lib/supabase/server";

/** Un essai du mode Réciter de la personne connectée (score et mots fautifs, jamais l'audio). */
export async function enregistrerEssai(e: {
  lecture: Lecture;
  sourate: number;
  du: number;
  au: number;
  score: number;
  fautes: FauteEssai[];
}): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("essais_recitation").insert(e);
  if (error) throw new Error(`Enregistrement de l'essai impossible : ${error.message}`);
}

/** Les derniers essais de la personne connectée sur une sourate (100 au plus). */
export async function listerMesEssais(eleveId: string, lecture: Lecture, sourate: number): Promise<Essai[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("essais_recitation")
    .select("sourate, du, au, score, fautes, cree_le")
    .eq("eleve_id", eleveId)
    .eq("lecture", lecture)
    .eq("sourate", sourate)
    .order("cree_le", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Lecture des essais impossible : ${error.message}`);
  return (data ?? []).map((r) => ({
    sourate: r.sourate as number,
    du: r.du as number,
    au: r.au as number,
    score: r.score as number,
    fautes: (Array.isArray(r.fautes) ? r.fautes : []) as FauteEssai[],
    quand: r.cree_le as string,
  }));
}

/** Les derniers essais d'un élève, toutes sourates (400 au plus) ; lisibles par lui et ceux qui le suivent (RLS). */
export async function listerEssaisEleve(eleveId: string): Promise<(Essai & { lecture: Lecture })[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("essais_recitation")
    .select("lecture, sourate, du, au, score, fautes, cree_le")
    .eq("eleve_id", eleveId)
    .order("cree_le", { ascending: false })
    .limit(400);
  if (error) throw new Error(`Lecture des essais impossible : ${error.message}`);
  return (data ?? []).map((r) => ({
    lecture: (r.lecture === "warsh" ? "warsh" : "hafs") as Lecture,
    sourate: r.sourate as number,
    du: r.du as number,
    au: r.au as number,
    score: r.score as number,
    fautes: (Array.isArray(r.fautes) ? r.fautes : []) as FauteEssai[],
    quand: r.cree_le as string,
  }));
}
