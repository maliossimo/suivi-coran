import "server-only";
import { z } from "zod";
import type { DateISO } from "@/domain/calendrier";
import type { SeanceStat } from "@/domain/classe";
import type { Seance, TypeSeance } from "@/domain/fiche";
import type { Passage } from "@/domain/versets";
import { creerClientServeur } from "@/lib/supabase/server";

const COLONNES =
  "id, date, type, duree_min, tajwid, note_libre, modifiee_par, passages(ordre, sourate_debut, verset_debut, sourate_fin, verset_fin), commentaires(count)";

const schemaLigne = z.object({
  id: z.string().uuid(),
  date: z.string(),
  type: z.enum(["apprentissage", "revision"]),
  duree_min: z.number().int(),
  tajwid: z.string().nullable(),
  note_libre: z.string().nullable(),
  modifiee_par: z.string().uuid().nullable(),
  commentaires: z.array(z.object({ count: z.number().int() })).optional(),
  passages: z.array(
    z.object({
      ordre: z.number().int(),
      sourate_debut: z.number().int(),
      verset_debut: z.number().int(),
      sourate_fin: z.number().int(),
      verset_fin: z.number().int(),
    }),
  ),
});

function versSeance(ligne: z.infer<typeof schemaLigne>): Seance {
  return {
    id: ligne.id,
    date: ligne.date,
    type: ligne.type,
    dureeMin: ligne.duree_min,
    tajwid: ligne.tajwid,
    noteLibre: ligne.note_libre,
    corrigee: ligne.modifiee_par !== null,
    nbCommentaires: ligne.commentaires?.[0]?.count ?? 0,
    passages: [...ligne.passages]
      .sort((a, b) => a.ordre - b.ordre)
      .map((p) => ({
        sourateDebut: p.sourate_debut,
        versetDebut: p.verset_debut,
        sourateFin: p.sourate_fin,
        versetFin: p.verset_fin,
      })),
  };
}

/** Séances d'un élève, d'un type, entre deux dates incluses. */
export async function seancesEntre(
  eleveId: string,
  type: TypeSeance,
  debut: DateISO,
  fin: DateISO,
): Promise<Seance[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("seances")
    .select(COLONNES)
    .eq("eleve_id", eleveId)
    .eq("type", type)
    .gte("date", debut)
    .lte("date", fin)
    .order("date");
  if (error) throw new Error(`Lecture des séances impossible : ${error.message}`);
  return z.array(schemaLigne).parse(data).map(versSeance);
}

export async function seanceDuJour(eleveId: string, type: TypeSeance, date: DateISO): Promise<Seance | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("seances")
    .select(COLONNES)
    .eq("eleve_id", eleveId)
    .eq("type", type)
    .eq("date", date)
    .maybeSingle();
  if (error) throw new Error(`Lecture de la séance impossible : ${error.message}`);
  return data ? versSeance(schemaLigne.parse(data)) : null;
}

export interface SaisieSeance {
  date: DateISO;
  type: TypeSeance;
  dureeMin: number;
  tajwid: string;
  noteLibre: string;
  passages: Passage[];
}

/** Crée ou met à jour la séance et remplace ses passages, en une transaction (fonction SQL). */
export async function enregistrerSeance(eleveId: string, saisie: SaisieSeance): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("enregistrer_seance", {
    p_date: saisie.date,
    p_type: saisie.type,
    p_duree: saisie.dureeMin,
    p_tajwid: saisie.tajwid,
    p_note: saisie.noteLibre,
    p_passages: saisie.passages,
    p_eleve: eleveId,
  });
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
}

export async function supprimerSeance(eleveId: string, type: TypeSeance, date: DateISO): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("seances")
    .delete()
    .eq("eleve_id", eleveId)
    .eq("type", type)
    .eq("date", date);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
}

const schemaStat = z.array(
  z.object({
    eleve_id: z.string().uuid(),
    type: z.enum(["apprentissage", "revision"]),
    date: z.string(),
    duree_min: z.number().int(),
  }),
);

/** Séances (sans détail) de tous les élèves visibles entre deux dates. */
export async function statsSeancesEntre(debut: DateISO, fin: DateISO): Promise<SeanceStat[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("seances")
    .select("eleve_id, type, date, duree_min")
    .gte("date", debut)
    .lte("date", fin)
    .limit(10000);
  if (error) throw new Error(`Lecture des statistiques impossible : ${error.message}`);
  return schemaStat
    .parse(data)
    .map((s) => ({ eleveId: s.eleve_id, type: s.type, date: s.date, dureeMin: s.duree_min }));
}

/** Date de la dernière séance de chaque élève visible (depuis une date donnée). */
export async function dernieresSaisies(depuis: DateISO): Promise<Map<string, DateISO>> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("seances")
    .select("eleve_id, date")
    .gte("date", depuis)
    .order("date", { ascending: false })
    .limit(10000);
  if (error) throw new Error(`Lecture des dernières saisies impossible : ${error.message}`);
  const resultat = new Map<string, DateISO>();
  for (const s of z.array(z.object({ eleve_id: z.string(), date: z.string() })).parse(data)) {
    if (!resultat.has(s.eleve_id)) resultat.set(s.eleve_id, s.date);
  }
  return resultat;
}

/** Dernière séance avec passages avant une date (pour proposer la suite). */
export async function derniereSeanceAvecPassagesAvant(
  eleveId: string,
  type: TypeSeance,
  date: DateISO,
): Promise<Seance | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("seances")
    .select(COLONNES)
    .eq("eleve_id", eleveId)
    .eq("type", type)
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(10);
  if (error) throw new Error(`Lecture des séances impossible : ${error.message}`);
  const seances = z.array(schemaLigne).parse(data).map(versSeance);
  return seances.find((s) => s.passages.length > 0) ?? null;
}
