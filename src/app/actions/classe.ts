"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import { archiverEleve, inviterEleve, inviterMaitre, supprimerEleve } from "@/services/classe";
import type { EtatSaisie } from "./fiche";
import { notifier } from "./notification";

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
  await notifier("Invitation envoyée");
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
  await notifier("Invitation envoyée");
  revalidatePath("/admin");
  return { envoye: email.trim().toLowerCase() };
}

export async function actionArchiverEleve(form: FormData): Promise<void> {
  const profil = await acteur();
  const eleveId = String(form.get("eleveId") ?? "");
  const actif = form.get("actif") === "true";
  const resultat = await archiverEleve(profil, eleveId, actif);
  await notifier(
    resultat.ok ? (actif ? "Élève réactivé" : "Élève archivé") : resultat.erreur,
    resultat.ok ? "succes" : "erreur",
  );
  revalidatePath("/maitre");
  redirect(/^[0-9a-f-]{36}$/i.test(eleveId) ? `/maitre/eleves/${eleveId}` : "/maitre");
}

export async function actionSupprimerEleve(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await acteur();
  const resultat = await supprimerEleve(profil, form.get("eleveId"), form.get("confirmation"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  await notifier("Élève supprimé définitivement");
  revalidatePath("/maitre");
  redirect("/maitre");
}
