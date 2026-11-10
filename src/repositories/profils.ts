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
