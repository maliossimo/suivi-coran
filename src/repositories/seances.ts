import "server-only";
import { z } from "zod";
import type { DateISO } from "@/domain/calendrier";
import type { Seance, TypeSeance } from "@/domain/fiche";
import type { Passage } from "@/domain/versets";
import { creerClientServeur } from "@/lib/supabase/server";

const COLONNES =
  "id, date, type, duree_min, tajwid, note_libre, modifiee_par, passages(ordre, sourate_debut, verset_debut, sourate_fin, verset_fin)";

const schemaLigne = z.object({
  id: z.string().uuid(),
  date: z.string(),
  type: z.enum(["apprentissage", "revision"]),
  duree_min: z.number().int(),
  tajwid: z.string().nullable(),
  note_libre: z.string().nullable(),
  modifiee_par: z.string().uuid().nullable(),
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
