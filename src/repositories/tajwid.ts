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

export interface Signalement {
  quand: string;
  auteur: string;
  lecture: Lecture;
  sourate: number;
  verset: number;
  mot: string;
  regles: string[];
  remarque: string | null;
}

/** Derniers signalements (lisibles par l'admin seulement : la base filtre). */
export async function listerSignalements(limite = 200): Promise<Signalement[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("signalements_tajwid")
    .select("cree_le, lecture, sourate, verset, mot, regles, remarque, profils(prenom, nom)")
    .order("cree_le", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Lecture des signalements impossible : ${error.message}`);
  return (data ?? []).map((s) => {
    const p = (Array.isArray(s.profils) ? s.profils[0] : s.profils) as {
      prenom?: string;
      nom?: string;
    } | null;
    return {
      quand: s.cree_le as string,
      auteur: `${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim() || "Compte supprimé",
      lecture: s.lecture as Lecture,
      sourate: s.sourate as number,
      verset: s.verset as number,
      mot: s.mot as string,
      regles: (s.regles as string[] | null) ?? [],
      remarque: (s.remarque as string | null) ?? null,
    };
  });
}

export interface CorrectionTajwid {
  lecture: Lecture;
  sourate: number;
  verset: number;
  mot: string;
  regle: string;
}

/** Corrections apprises d'un passage : remarques à ne plus faire sur ces mots (la base décide lesquelles). */
export async function listerCorrections(
  lecture: Lecture,
  sourate: number,
  du: number,
  au: number,
): Promise<CorrectionTajwid[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("corrections_tajwid", {
    p_lecture: lecture,
    p_sourate: sourate,
    p_du: du,
    p_au: au,
  });
  if (error) throw new Error(`Lecture des corrections impossible : ${error.message}`);
  return ((data ?? []) as { verset: number; mot: string; regle: string }[]).map((c) => ({
    lecture,
    sourate,
    verset: c.verset,
    mot: c.mot,
    regle: c.regle,
  }));
}

export interface CorrectionApprise extends CorrectionTajwid {
  signalements: number;
  refusee: boolean;
}

/** Pour l'admin : toutes les corrections apprises, refusées comprises. */
export async function listerToutesCorrections(): Promise<CorrectionApprise[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("corrections_tajwid_admin");
  if (error) throw new Error(`Lecture des corrections impossible : ${error.message}`);
  return ((data ?? []) as Record<string, unknown>[]).map((c) => ({
    lecture: c.lecture as Lecture,
    sourate: c.sourate as number,
    verset: c.verset as number,
    mot: c.mot as string,
    regle: c.regle as string,
    signalements: Number(c.signalements),
    refusee: Boolean(c.refusee),
  }));
}

/** L'admin refuse (ou rétablit) une correction apprise. */
export async function changerRefusCorrection(c: CorrectionTajwid, refuser: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  const cle = { lecture: c.lecture, sourate: c.sourate, verset: c.verset, mot: c.mot, regle: c.regle };
  const { error } = refuser
    ? await supabase.from("corrections_tajwid_refusees").insert(cle)
    : await supabase.from("corrections_tajwid_refusees").delete().match(cle);
  if (error) throw new Error(`Modification impossible : ${error.message}`);
}
