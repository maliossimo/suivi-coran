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

/** Les derniers essais de la personne connectée, toutes sourates (mots à revoir). */
export async function listerMesEssaisRecents(
  eleveId: string,
  lecture: Lecture,
  nombre = 300,
): Promise<Essai[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("essais_recitation")
    .select("sourate, du, au, score, fautes, cree_le")
    .eq("eleve_id", eleveId)
    .eq("lecture", lecture)
    .order("cree_le", { ascending: false })
    .limit(nombre);
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
