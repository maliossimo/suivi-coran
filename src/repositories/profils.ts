import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { Lecture } from "@/domain/lectures";
import type { Role } from "@/domain/roles";
import { creerClientServeur } from "@/lib/supabase/server";

const schemaProfil = z.object({
  id: z.string().uuid(),
  role: z.enum(["eleve", "maitre", "admin"]),
  etablissement_id: z.string().uuid().nullable(),
  prenom: z.string(),
  nom: z.string(),
  actif: z.boolean(),
  lecture: z.enum(["hafs", "warsh"]).nullable(),
});

export interface Profil {
  id: string;
  role: Role;
  etablissementId: string | null;
  prenom: string;
  nom: string;
  actif: boolean;
  /** Lecture de l'élève ; null tant qu'il ne l'a pas choisie (Hafs en attendant). */
  lecture: Lecture | null;
}

/**
 * Profil de la personne connectée, ou null si personne n'est connecté.
 * Mémorisé le temps d'une requête : la garde d'accès, la page et les actions
 * partagent la même lecture au lieu d'interroger la base plusieurs fois.
 */
export const profilConnecte = cache(async (): Promise<Profil | null> => {
  const supabase = await creerClientServeur();
  // Jeton vérifié (signature) sans appel réseau quand les clés de Supabase sont asymétriques.
  const { data: jeton } = await supabase.auth.getClaims();
  const id = jeton?.claims?.sub;
  if (!id) return null;

  const { data, error } = await supabase
    .from("profils")
    .select("id, role, etablissement_id, prenom, nom, actif, lecture")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  if (!data) return null;

  const p = schemaProfil.parse(data);
  return {
    id: p.id,
    role: p.role,
    etablissementId: p.etablissement_id,
    prenom: p.prenom,
    nom: p.nom,
    actif: p.actif,
    lecture: p.lecture,
  };
});

const schemaEleve = z.array(
  z.object({
    id: z.string().uuid(),
    prenom: z.string(),
    nom: z.string(),
    actif: z.boolean(),
    etablissement_id: z.string().uuid().nullable(),
    lecture: z.enum(["hafs", "warsh"]).nullable(),
  }),
);

export interface EleveListe {
  id: string;
  prenom: string;
  nom: string;
  actif: boolean;
  etablissementId: string | null;
  lecture: Lecture | null;
}

/** Élèves visibles par la personne connectée (RLS : ceux de son établissement, ou tous pour l'admin). */
export async function listerEleves(): Promise<EleveListe[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, prenom, nom, actif, etablissement_id, lecture")
    .eq("role", "eleve")
    .order("nom");
  if (error) throw new Error(`Lecture des élèves impossible : ${error.message}`);
  return schemaEleve.parse(data).map((e) => ({
    id: e.id,
    prenom: e.prenom,
    nom: e.nom,
    actif: e.actif,
    etablissementId: e.etablissement_id,
    lecture: e.lecture,
  }));
}

/** Un élève visible par la personne connectée, ou null. */
export async function eleveParId(id: string): Promise<EleveListe | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, prenom, nom, actif, etablissement_id, lecture")
    .eq("role", "eleve")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lecture de l'élève impossible : ${error.message}`);
  if (!data) return null;
  const [e] = schemaEleve.parse([data]);
  return e
    ? {
        id: e.id,
        prenom: e.prenom,
        nom: e.nom,
        actif: e.actif,
        etablissementId: e.etablissement_id,
        lecture: e.lecture,
      }
    : null;
}

/** Archive ou réactive un élève (RLS + trigger : son maître ou l'admin). */
export async function definirActif(id: string, actif: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ actif }).eq("id", id);
  if (error) throw new Error(`Mise à jour impossible : ${error.message}`);
}

/**
 * Suppression définitive d'un élève archivé, avec toutes ses données.
 * Les règles (son maître ou l'admin, élève archivé) sont vérifiées par la base.
 */
export async function supprimerEleveDefinitivement(id: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("supprimer_eleve", { p_eleve: id });
  if (error) throw new Error(error.message);
}

/** Lecture d'un élève visible (Hafs s'il ne l'a pas encore choisie, ou s'il est introuvable). */
export const lectureEleve = cache(async (eleveId: string): Promise<Lecture> => {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.from("profils").select("lecture").eq("id", eleveId).maybeSingle();
  if (error) throw new Error(`Lecture du profil impossible : ${error.message}`);
  return data?.lecture === "warsh" ? "warsh" : "hafs";
});

/**
 * Change la lecture d'un élève (lui-même, son Cheikh ou l'admin : vérifié par la base)
 * et convertit ses passages déjà saisis dans la nouvelle numérotation.
 */
export async function changerLecture(eleveId: string, lecture: Lecture): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("changer_lecture", { p_eleve: eleveId, p_lecture: lecture });
  if (error) throw new Error(`Changement de lecture impossible : ${error.message}`);
}

/** La personne connectée écrit son prénom et son nom (les règles d'accès le lui permettent). */
export async function changerMonNom(id: string, prenom: string, nom: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ prenom, nom }).eq("id", id);
  if (error) throw new Error(`Enregistrement du nom impossible : ${error.message}`);
}
