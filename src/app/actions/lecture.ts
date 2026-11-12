"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LIBELLE_LECTURE, lireLecture } from "@/domain/lectures";
import { profilConnecte } from "@/repositories/profils";
import { choisirLecture } from "@/services/lecture";
import { notifier } from "./notification";

/** Pages vers lesquelles on revient après le choix (jamais une adresse extérieure). */
function retourSur(valeur: FormDataEntryValue | null): string {
  const r = String(valeur ?? "");
  return /^\/(eleve|maitre\/eleves\/[0-9a-f-]{36})(\/|\?|$)/.test(r) ? r : "/";
}

export async function actionChoisirLecture(form: FormData): Promise<void> {
  const acteur = await profilConnecte();
  if (!acteur || !acteur.actif) redirect("/connexion");
  const eleveId = String(form.get("eleveId") ?? "");
  const retour = retourSur(form.get("retour"));
  const resultat = await choisirLecture(acteur, { eleveId, lecture: form.get("lecture") });
  if (!resultat.ok) {
    await notifier(resultat.erreur, "erreur");
    redirect(retour);
  }
  await notifier(`Lecture enregistrée : ${LIBELLE_LECTURE[lireLecture(form.get("lecture"))]}`);
  revalidatePath("/eleve", "layout");
  revalidatePath(`/maitre/eleves/${eleveId}`, "layout");
  revalidatePath("/maitre");
  redirect(retour);
}
