"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { profilConnecte } from "@/repositories/profils";
import { commenterSeance } from "@/services/classe";
import {
  enregistrerObjectifEleve,
  enregistrerSeanceEleve,
  supprimerSeanceEleve,
  type ResultatSaisie,
} from "@/services/fiche";

/**
 * Actions de la fiche, communes à l'élève et au maître.
 * Le formulaire indique l'élève concerné (eleveId) ; la base vérifie le droit
 * d'écrire (RLS : l'élève lui-même, son maître ou l'admin). On contrôle ici
 * que la personne est connectée et active, et que le chemin de retour est interne.
 */

export type EtatSaisie = { erreur?: string };

const uuid = z.string().uuid();

/** Chemin de retour : uniquement vers la fiche élève ou l'espace maître. */
function retourSur(valeur: FormDataEntryValue | null): string {
  const chemin = String(valeur ?? "");
  return /^\/(eleve|maitre)(\/|\?|$)/.test(chemin) && !chemin.includes("//") ? chemin : "/";
}

async function acteurEtEleve(form: FormData) {
  const acteur = await profilConnecte();
  if (!acteur || !acteur.actif) redirect("/connexion");
  const eleveId = uuid.safeParse(form.get("eleveId"));
  if (!eleveId.success) redirect("/");
  return { acteur, eleveId: eleveId.data };
}

export async function actionEnregistrerSeance(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const { eleveId } = await acteurEtEleve(form);
  let passages: unknown = [];
  try {
    passages = JSON.parse(String(form.get("passages") ?? "[]"));
  } catch {
    return { erreur: "La liste des passages est invalide." };
  }

  let resultat: ResultatSaisie;
  try {
    resultat = await enregistrerSeanceEleve(eleveId, {
      date: String(form.get("date") ?? ""),
      type: String(form.get("type") ?? ""),
      dureeMin: form.get("dureeMin"),
      tajwid: String(form.get("tajwid") ?? ""),
      noteLibre: String(form.get("noteLibre") ?? ""),
      passages,
    });
  } catch {
    resultat = { ok: false, erreur: "L'enregistrement a échoué. Réessaie dans un instant." };
  }
  if (!resultat.ok) return { erreur: resultat.erreur };

  revalidatePath("/", "layout");
  redirect(retourSur(form.get("retour")));
}

export async function actionSupprimerSeance(form: FormData): Promise<void> {
  const { eleveId } = await acteurEtEleve(form);
  await supprimerSeanceEleve(eleveId, form.get("type"), form.get("date"));
  revalidatePath("/", "layout");
  redirect(retourSur(form.get("retour")));
}

export async function actionEnregistrerObjectif(form: FormData): Promise<void> {
  const { eleveId } = await acteurEtEleve(form);
  await enregistrerObjectifEleve(eleveId, {
    type: form.get("type"),
    mois: form.get("mois"),
    semaine: form.get("semaine") ?? "",
    description: form.get("description"),
    statut: form.get("statut") ?? "en_cours",
  });
  revalidatePath("/", "layout");
}

export async function actionCommenter(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const { acteur, eleveId } = await acteurEtEleve(form);
  const resultat = await commenterSeance(acteur, eleveId, form.get("seanceId"), form.get("texte"));
  if (!resultat.ok) return { erreur: resultat.erreur };
  revalidatePath("/", "layout");
  return {};
}
