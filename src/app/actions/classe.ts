"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import { archiverEleve, inviterEleve, inviterMaitre } from "@/services/classe";
import type { EtatSaisie } from "./fiche";

export type EtatInvitation = EtatSaisie & { envoye?: string };

async function acteur() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif) redirect("/connexion");
  return profil;
}

export async function actionInviterEleve(_: EtatInvitation, form: FormData): Promise<EtatInvitation> {
  const profil = await acteur();
  const email = String(form.get("email") ?? "");
  const resultat = await inviterEleve(profil, { prenom: form.get("prenom"), nom: form.get("nom"), email });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath("/maitre");
  return { envoye: email.trim().toLowerCase() };
}

export async function actionInviterMaitre(_: EtatInvitation, form: FormData): Promise<EtatInvitation> {
  const profil = await acteur();
  const email = String(form.get("email") ?? "");
  const resultat = await inviterMaitre(profil, {
    prenom: form.get("prenom"),
    nom: form.get("nom"),
    email,
    etablissementId: form.get("etablissementId"),
  });
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath("/admin");
  return { envoye: email.trim().toLowerCase() };
}

export async function actionArchiverEleve(form: FormData): Promise<void> {
  const profil = await acteur();
  const eleveId = form.get("eleveId");
  await archiverEleve(profil, eleveId, form.get("actif") === "true");
  revalidatePath("/maitre");
  redirect(`/maitre/eleves/${String(eleveId)}`);
}
