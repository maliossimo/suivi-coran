import "server-only";
import { z } from "zod";
import type { Lecture } from "@/domain/lectures";
import type { Role } from "@/domain/roles";
import { creerClientServeur } from "@/lib/supabase/server";
import type { SeanceUsage } from "@/domain/usage";
import { clientAdmin } from "@/lib/supabase/admin";

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

export async function renommerEtablissement(id: string, nom: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("etablissements").update({ nom }).eq("id", id);
  if (error) throw new Error(`Renommage impossible : ${error.message}`);
}

/** Supprime un établissement vide ; renvoie false s'il a encore des comptes (refusé par la base). */
export async function supprimerEtablissement(id: string): Promise<boolean> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("etablissements").delete().eq("id", id);
  if (!error) return true;
  if (error.code === "23503") return false; // comptes encore rattachés
  throw new Error(`Suppression impossible : ${error.message}`);
}

/** Change un Cheikh ou un élève d'établissement (réservé à l'admin par la base). */
export async function deplacerUtilisateur(id: string, etablissementId: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.from("profils").update({ etablissement_id: etablissementId }).eq("id", id);
  if (error) throw new Error(`Déplacement impossible : ${error.message}`);
}

export interface Utilisateur {
  id: string;
  role: Role;
  prenom: string;
  nom: string;
  actif: boolean;
  etablissementId: string | null;
  creeLe: string;
  lecture: Lecture | null;
}

export async function listerUtilisateurs(): Promise<Utilisateur[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("profils")
    .select("id, role, prenom, nom, actif, etablissement_id, cree_le, lecture")
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
        lecture: z.enum(["hafs", "warsh"]).nullable(),
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
      lecture: u.lecture,
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

export interface FiltresJournal {
  /** Personne qui a agi, ou élève concerné. */
  personneId?: string;
  action?: string;
  table?: string;
  /** Dates incluses (AAAA-MM-JJ, heure de Paris approchée par UTC+1). */
  du?: string;
  au?: string;
}

export async function journalRecent(limite = 100, filtres: FiltresJournal = {}): Promise<EvenementAudit[]> {
  const supabase = await creerClientServeur();
  let requete = supabase
    .from("journal_audit")
    .select("id, quand, acteur_id, action, table_nom, eleve_id")
    .order("quand", { ascending: false })
    .limit(limite);
  if (filtres.personneId) {
    requete = requete.or(`acteur_id.eq.${filtres.personneId},eleve_id.eq.${filtres.personneId}`);
  }
  if (filtres.action) requete = requete.eq("action", filtres.action);
  if (filtres.table) requete = requete.eq("table_nom", filtres.table);
  if (filtres.du) requete = requete.gte("quand", `${filtres.du}T00:00:00+01:00`);
  if (filtres.au) requete = requete.lte("quand", `${filtres.au}T23:59:59+01:00`);
  const { data, error } = await requete;
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
/** Séances depuis une date (élève, date, durée) pour les statistiques d'usage. */
export async function seancesPourStats(depuis: string): Promise<SeanceUsage[]> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("seances")
    .select("eleve_id, date, duree_min")
    .gte("date", depuis)
    .limit(20000);
  if (error) throw new Error(`Lecture des séances impossible : ${error.message}`);
  return z
    .array(z.object({ eleve_id: z.string().uuid(), date: z.string(), duree_min: z.number() }))
    .parse(data)
    .map((s) => ({ eleveId: s.eleve_id, date: s.date, dureeMin: s.duree_min }));
}

export interface CompteConnexion {
  email: string | null;
  derniereConnexion: string | null;
  /** Date de la dernière invitation envoyée (null si le compte a été créé autrement). */
  inviteLe: string | null;
}

/**
 * Comptes de connexion (e-mail, dernière connexion, invitation), lus côté serveur
 * avec la clé « service role ». Map vide si la clé n'est pas configurée.
 */
export async function comptesConnexion(): Promise<Map<string, CompteConnexion>> {
  const admin = clientAdmin();
  const resultat = new Map<string, CompteConnexion>();
  if (!admin) return resultat;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    for (const u of data.users) {
      resultat.set(u.id, {
        email: u.email ?? null,
        derniereConnexion: u.last_sign_in_at ?? null,
        inviteLe: u.invited_at ?? null,
      });
    }
    if (data.users.length < 1000) break;
  }
  return resultat;
}

export interface Sauvegarde {
  faiteLe: string;
  chiffree: boolean;
  tailleOctets: number | null;
}

export async function derniereSauvegarde(): Promise<Sauvegarde | null> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("sauvegardes")
    .select("faite_le, chiffree, taille_octets")
    .order("faite_le", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Lecture des sauvegardes impossible : ${error.message}`);
  if (!data) return null;
  const l = z
    .object({ faite_le: z.string(), chiffree: z.boolean(), taille_octets: z.number().nullable() })
    .parse(data);
  return { faiteLe: l.faite_le, chiffree: l.chiffree, tailleOctets: l.taille_octets };
}

export interface ErreurSignalee {
  id: number;
  quand: string;
  utilisateurId: string | null;
  page: string;
  message: string;
  version: string | null;
}

export async function erreursRecentes(limite = 10): Promise<{ erreurs: ErreurSignalee[]; total7j: number }> {
  const supabase = await creerClientServeur();
  const depuis = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [liste, compte] = await Promise.all([
    supabase
      .from("erreurs")
      .select("id, quand, utilisateur_id, page, message, version")
      .order("quand", { ascending: false })
      .limit(limite),
    supabase.from("erreurs").select("id", { count: "exact", head: true }).gte("quand", depuis),
  ]);
  if (liste.error) throw new Error(`Lecture des erreurs impossible : ${liste.error.message}`);
  const erreurs = z
    .array(
      z.object({
        id: z.number(),
        quand: z.string(),
        utilisateur_id: z.string().nullable(),
        page: z.string(),
        message: z.string(),
        version: z.string().nullable(),
      }),
    )
    .parse(liste.data)
    .map((e) => ({
      id: e.id,
      quand: e.quand,
      utilisateurId: e.utilisateur_id,
      page: e.page,
      message: e.message,
      version: e.version,
    }));
  return { erreurs, total7j: compte.count ?? 0 };
}

/** Suppression définitive d'un élève ou d'un maître (règles vérifiées par la base). */
export async function supprimerUtilisateurDefinitivement(id: string): Promise<void> {
  const supabase = await creerClientServeur();
  const { error } = await supabase.rpc("supprimer_utilisateur", { p_id: id });
  if (error) throw new Error(error.message);
}

/** Erreur rencontrée par la personne connectée (enregistrée à son nom ; lue par l'admin). */
export async function enregistrerErreur(
  page: string,
  message: string,
  version: string | null,
): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase.from("erreurs").insert({ page, message, version });
}

/**
 * Note que cette session de l'admin a saisi le bon code (clé « service role » :
 * une session ne peut pas se déclarer vérifiée elle-même).
 */
export async function marquerSessionVerifiee(sessionId: string, userId: string): Promise<boolean> {
  const admin = clientAdmin();
  if (!admin) return false;
  const { error } = await admin
    .from("sessions_verifiees")
    .upsert({ session_id: sessionId, user_id: userId, verifiee_le: new Date().toISOString() });
  if (error) return false;
  const ilYA90Jours = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await admin.from("sessions_verifiees").delete().eq("user_id", userId).lt("verifiee_le", ilYA90Jours);
  return true;
}

export interface UtilisationAppli {
  derniere: string;
  ouvertures7j: number;
}

/** Dernière ouverture de l'appli de chaque personne. */
export async function dernieresOuvertures(): Promise<Map<string, UtilisationAppli>> {
  const supabase = await creerClientServeur();
  const { data, error } = await supabase.rpc("dernieres_ouvertures");
  if (error) throw new Error(`Lecture des ouvertures impossible : ${error.message}`);
  const lignes = z
    .array(z.object({ user_id: z.string().uuid(), derniere: z.string(), ouvertures_7j: z.coerce.number() }))
    .parse(data ?? []);
  return new Map(lignes.map((l) => [l.user_id, { derniere: l.derniere, ouvertures7j: l.ouvertures_7j }]));
}

export interface Ouverture {
  id: number;
  personneId: string;
  quand: string;
}

/** Ouvertures les plus récentes (toutes, ou celles d'une personne). */
export async function ouverturesRecentes(limite: number, personneId?: string): Promise<Ouverture[]> {
  const supabase = await creerClientServeur();
  let requete = supabase
    .from("ouvertures")
    .select("id, user_id, ouverte_le")
    .order("ouverte_le", { ascending: false })
    .limit(limite);
  if (personneId) requete = requete.eq("user_id", personneId);
  const { data, error } = await requete;
  if (error) throw new Error(`Lecture des ouvertures impossible : ${error.message}`);
  return z
    .array(z.object({ id: z.number(), user_id: z.string().uuid(), ouverte_le: z.string() }))
    .parse(data ?? [])
    .map((o) => ({ id: o.id, personneId: o.user_id, quand: o.ouverte_le }));
}
