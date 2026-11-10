import "server-only";
import { z } from "zod";
import type { Role } from "@/domain/roles";
import { creerClientServeur } from "@/lib/supabase/server";

const schemaProfil = z.object({
  id: z.string().uuid(),
  role: z.enum(["eleve", "maitre", "admin"]),
  etablissement_id: z.string().uuid().nullable(),
  prenom: z.string(),
  nom: z.string(),
  actif: z.boolean(),
});

export interface Profil {
  id: string;
  role: Role;
  etablissementId: string | null;
  prenom: string;
  nom: string;
  actif: boolean;
}

/** Profil de la personne connectée, ou null si personne n'est connecté. */
export async function profilConnecte(): Promise<Profil | null> {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profils")
    .select("id, role, etablissement_id, prenom, nom, actif")
    .eq("id", user.id)
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
  };
}

const schemaEleve = z.array(
  z.object({
    id: z.string().uuid(),
    prenom: z.string(),
    nom: z.string(),
    actif: z.boolean(),
    etablissement_id: z.string().uuid().nullable(),
  }),
);

export interface EleveListe {
  id: string;
  prenom: string;
  nom: string;
  actif: boolean;
  etablissementId: string | null;
}

/** Élèves visibles par la personne connectée (RLS : ceux de son établissement, ou tous pour l'admin). */
export async function listerEleves(): Promise<EleveListe[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, prenom, nom, actif, etablissement_id")
    .eq("role", "eleve")
    .order("nom");
  if (error) throw new Error(`Lecture des élèves impossible : ${error.message}`);
  return schemaEleve.parse(data).map((e) => ({
    id: e.id,
    prenom: e.prenom,
    nom: e.nom,
    actif: e.actif,
    etablissementId: e.etablissement_id,
  }));
}

/** Un élève visible par la personne connectée, ou null. */
export async function eleveParId(id: string): Promise<EleveListe | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, prenom, nom, actif, etablissement_id")
    .eq("role", "eleve")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Lecture de l'élève impossible : ${error.message}`);
  if (!data) return null;
  const [e] = schemaEleve.parse([data]);
  return e
    ? { id: e.id, prenom: e.prenom, nom: e.nom, actif: e.actif, etablissementId: e.etablissement_id }
    : null;
}

/** Archive ou réactive un élève (RLS + trigger : son maître ou l'admin). */
export async function definirActif(id: string, actif: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ actif }).eq("id", id);
  if (error) throw new Error(`Mise à jour impossible : ${error.message}`);
}
