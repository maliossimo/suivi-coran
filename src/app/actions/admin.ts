"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import {
  ajouterEtablissement,
  basculerUtilisateur,
  deplacerUnUtilisateur,
  renommerUnEtablissement,
  renvoyerUneInvitation,
  supprimerUnEtablissement,
  supprimerUtilisateur,
} from "@/services/admin";
import type { EtatSaisie } from "./fiche";
import { notifier } from "./notification";

async function admin() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif || profil.role !== "admin") redirect("/");
  return profil;
}

export async function actionCreerEtablissement(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await admin();
  const resultat = await ajouterEtablissement(profil, form.get("nom"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Établissement créé");
  revalidatePath("/admin");
  return {};
}

export async function actionBasculerUtilisateur(form: FormData): Promise<void> {
  const profil = await admin();
  const actif = form.get("actif") === "true";
  await basculerUtilisateur(profil, form.get("id"), actif);
  await notifier(actif ? "Compte réactivé" : "Compte désactivé");
  revalidatePath("/admin");
}

export async function actionSupprimerUtilisateur(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await admin();
  const resultat = await supprimerUtilisateur(profil, form.get("id"), form.get("confirmation"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Utilisateur supprimé définitivement");
  revalidatePath("/admin");
  return { enregistre: true };
}

export async function actionRenommerEtablissement(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await admin();
  const resultat = await renommerUnEtablissement(profil, form.get("id"), form.get("nom"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Établissement renommé");
  revalidatePath("/admin");
  return { enregistre: true };
}

export async function actionSupprimerEtablissement(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await admin();
  const resultat = await supprimerUnEtablissement(profil, form.get("id"), form.get("confirmation"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Établissement supprimé");
  revalidatePath("/admin");
  return { enregistre: true };
}

export async function actionDeplacerUtilisateur(form: FormData): Promise<void> {
  const profil = await admin();
  const resultat = await deplacerUnUtilisateur(profil, form.get("id"), form.get("etablissementId"));
  await notifier(resultat.ok ? "Compte déplacé" : resultat.erreur, resultat.ok ? "succes" : "erreur");
  revalidatePath("/admin");
  revalidatePath("/maitre");
}

export async function actionRenvoyerInvitation(form: FormData): Promise<void> {
  const profil = await admin();
  const resultat = await renvoyerUneInvitation(profil, form.get("id"));
  await notifier(resultat.ok ? "Invitation renvoyée" : resultat.erreur, resultat.ok ? "succes" : "erreur");
  revalidatePath("/admin");
}
