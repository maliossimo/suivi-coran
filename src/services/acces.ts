import "server-only";
import { redirect } from "next/navigation";
import { accueilDuRole, peutOuvrirEspace, type Role } from "@/domain/roles";
import { emailConnecte, sessionVerifiee } from "@/repositories/auth";
import { profilConnecte, type Profil } from "@/repositories/profils";

/**
 * Garde d'accès d'un espace (élève, maître, admin).
 * La vraie protection des données est faite par la base (RLS) ;
 * cette garde évite seulement d'afficher un espace qui n'est pas le sien.
 */
export async function exigerEspace(espace: Role): Promise<Profil> {
  const profil = await profilConnecte();
  if (!profil) redirect("/connexion");
  if (!profil.actif) redirect("/connexion?erreur=inactif");
  if (!peutOuvrirEspace(profil.role, espace)) redirect(accueilDuRole(profil.role));
  await exigerCodeAdmin(profil);
  return profil;
}

/**
 * Admin : sur chaque appareil, le code reçu par e-mail est demandé une fois après
 * le mot de passe (la base refuse de toute façon ses droits d'admin sans ce code).
 */
export async function exigerCodeAdmin(profil: Profil): Promise<void> {
  if (profil.role !== "admin") return;
  if (!(await sessionVerifiee())) redirect("/verification");
}

/**
 * Espace élève, une fois la lecture (Hafs ou Warsh) choisie : sinon, on la demande d'abord
 * (première connexion). Toute la numérotation des versets en dépend.
 */
export async function exigerEleveAvecLecture(): Promise<Profil> {
  const profil = await exigerEspace("eleve");
  if (profil.role === "eleve" && profil.lecture === null) redirect("/eleve/lecture");
  return profil;
}

/** Page d'arrivée de la personne connectée. */
export async function destinationApresConnexion(): Promise<string> {
  const profil = await profilConnecte();
  if (!profil || !profil.actif) return "/connexion?erreur=inactif";
  return accueilDuRole(profil.role);
}

/** Garde des pages communes à tous les rôles (ex. « Mon compte »). */
export async function exigerConnexion(): Promise<Profil> {
  const profil = await profilConnecte();
  if (!profil) redirect("/connexion");
  if (!profil.actif) redirect("/connexion?erreur=inactif");
  await exigerCodeAdmin(profil);
  return profil;
}

/** Données de la page « Mon compte ». */
export async function chargerCompte(): Promise<{ profil: Profil; email: string | null }> {
  const profil = await exigerConnexion();
  return { profil, email: await emailConnecte() };
}

/** Profil de la personne connectée, sans redirection (pages publiques). */
export async function profilOptionnel(): Promise<Profil | null> {
  return profilConnecte();
}
