"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import {
  ajouterUnMembre,
  changerUnMembre,
  creerUneClasse,
  enregistrerUnAppel,
  modifierUneClasse,
} from "@/services/presences";
import type { EtatSaisie } from "./fiche";
import { notifier } from "./notification";

async function connecte() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif) redirect("/connexion");
  return profil;
}

/** Appel (aussi rejoué au retour du réseau) : données en JSON, pas de redirection. */
export async function actionEnregistrerAppel(donnees: unknown): Promise<{ ok: boolean; erreur?: string }> {
  const r = await enregistrerUnAppel(await connecte(), donnees);
  if (r.ok) revalidatePath("/presences", "layout");
  return r.ok ? { ok: true } : { ok: false, erreur: r.erreur };
}

export async function actionCreerClasse(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const r = await creerUneClasse(await connecte(), form);
  if (!r.ok) return { erreur: r.erreur };
  await notifier("Classe créée : ajoute maintenant ses élèves");
  revalidatePath("/presences", "layout");
  redirect(`/presences/${r.id}/modifier`);
}

export async function actionModifierClasse(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const r = await modifierUneClasse(await connecte(), form);
  if (!r.ok) return { erreur: r.erreur };
  await notifier("Classe enregistrée");
  revalidatePath("/presences", "layout");
  return { enregistre: true };
}

export async function actionAjouterMembre(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const r = await ajouterUnMembre(await connecte(), form);
  if (!r.ok) return { erreur: r.erreur };
  revalidatePath("/presences", "layout");
  return { enregistre: true };
}

export async function actionChangerMembre(form: FormData): Promise<void> {
  const r = await changerUnMembre(await connecte(), form);
  await notifier(
    r.ok
      ? form.get("actif") === "true"
        ? "Élève remis dans la classe"
        : "Élève retiré de la classe"
      : r.erreur,
    r.ok ? "succes" : "erreur",
  );
  revalidatePath("/presences", "layout");
}
