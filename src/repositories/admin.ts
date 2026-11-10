import "server-only";
import { z } from "zod";
import type { Role } from "@/domain/roles";
import { creerClientServeur } from "@/lib/supabase/server";

/*
 * Lectures et écritures du back-office. Elles passent par le client de la
 * personne connectée : seules les règles RLS « admin » les autorisent.
 */

export interface Etablissement {
  id: string;
  nom: string;
  actif: boolean;
}

export async function listerEtablissements(): Promise<Etablissement[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.from("etablissements").select("id, nom, actif").order("nom");
  if (error) throw new Error(`Lecture des établissements impossible : ${error.message}`);
  return z.array(z.object({ id: z.string().uuid(), nom: z.string(), actif: z.boolean() })).parse(data);
}

export async function creerEtablissement(nom: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("etablissements").insert({ nom });
  if (error) throw new Error(`Création impossible : ${error.message}`);
}

export interface Utilisateur {
  id: string;
  role: Role;
  prenom: string;
  nom: string;
  actif: boolean;
  etablissementId: string | null;
  creeLe: string;
}

export async function listerUtilisateurs(): Promise<Utilisateur[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, role, prenom, nom, actif, etablissement_id, cree_le")
    .order("cree_le", { ascending: false });
  if (error) throw new Error(`Lecture des utilisateurs impossible : ${error.message}`);
  return z
    .array(
      z.object({
        id: z.string().uuid(),
        role: z.enum(["eleve", "maitre", "admin"]),
        prenom: z.string(),
        nom: z.string(),
        actif: z.boolean(),
        etablissement_id: z.string().uuid().nullable(),
        cree_le: z.string(),
      }),
    )
    .parse(data)
    .map((u) => ({
      id: u.id,
      role: u.role,
      prenom: u.prenom,
      nom: u.nom,
      actif: u.actif,
      etablissementId: u.etablissement_id,
      creeLe: u.cree_le,
    }));
}

export async function definirActifUtilisateur(id: string, actif: boolean): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ actif }).eq("id", id);
  if (error) throw new Error(`Mise à jour impossible : ${error.message}`);
}

export interface EvenementAudit {
  id: number;
  quand: string;
  acteurId: string | null;
  action: string;
  table: string;
  eleveId: string | null;
}

export async function journalRecent(limite = 100): Promise<EvenementAudit[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("journal_audit")
    .select("id, quand, acteur_id, action, table_nom, eleve_id")
    .order("quand", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Lecture du journal impossible : ${error.message}`);
  return z
    .array(
      z.object({
        id: z.number(),
        quand: z.string(),
        acteur_id: z.string().uuid().nullable(),
        action: z.string(),
        table_nom: z.string(),
        eleve_id: z.string().uuid().nullable(),
      }),
    )
    .parse(data)
    .map((e) => ({
      id: e.id,
      quand: e.quand,
      acteurId: e.acteur_id,
      action: e.action,
      table: e.table_nom,
      eleveId: e.eleve_id,
    }));
}

/** Nombre de séances enregistrées depuis une date (toutes classes). */
export async function compterSeancesDepuis(depuis: string): Promise<number> {
  const supabase = await creerClientServeur();
  const { count, error } = await supabase
    .from("seances")
    .select("id", { count: "exact", head: true })
    .gte("date", depuis);
  if (error) throw new Error(`Comptage impossible : ${error.message}`);
  return count ?? 0;
}
