"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import { ajouterEtablissement, basculerUtilisateur } from "@/services/admin";
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
