"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import { basculerVers, delierComptes, lierMonCompte } from "@/services/comptesLies";
import type { EtatSaisie } from "./fiche";
import { notifier } from "./notification";

async function acteur() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif) redirect("/connexion");
  return profil;
}

/** Passe à l'espace d'un compte lié : la racine renvoie ensuite vers l'espace de ce compte. */
export async function actionBasculer(form: FormData): Promise<void> {
  const profil = await acteur();
  const resultat = await basculerVers(profil, form.get("cible"));
  if (!resultat.ok) {
    await notifier(resultat.erreur, "erreur");
    redirect("/compte");
  }
  redirect("/");
}

export async function actionLierCompte(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await acteur();
  const resultat = await lierMonCompte(profil, form.get("email"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Comptes liés");
  revalidatePath("/admin");
  return { enregistre: true };
}

export async function actionDelierComptes(form: FormData): Promise<void> {
  const profil = await acteur();
  const resultat = await delierComptes(profil, form.get("a"), form.get("b"));
  await notifier(resultat.ok ? "Lien retiré" : resultat.erreur, resultat.ok ? "succes" : "erreur");
  revalidatePath("/admin");
}
