"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigerEspace } from "@/services/acces";
import {
  enregistrerObjectifEleve,
  enregistrerSeanceEleve,
  supprimerSeanceEleve,
  type ResultatSaisie,
} from "@/services/fiche";

export type EtatSaisie = { erreur?: string };

function moisDe(date: string): string {
  return date.slice(0, 7);
}

/** Enregistre la séance puis revient sur la fiche du mois. */
export async function actionEnregistrerSeance(_: EtatSaisie, form: FormData): Promise<EtatSaisie> {
  const profil = await exigerEspace("eleve");
  let passages: unknown = [];
  try {
    passages = JSON.parse(String(form.get("passages") ?? "[]"));
  } catch {
    return { erreur: "La liste des passages est invalide." };
  }
  const date = String(form.get("date") ?? "");
  const type = String(form.get("type") ?? "");

  let resultat: ResultatSaisie;
  try {
    resultat = await enregistrerSeanceEleve(profil.id, {
      date,
      type,
      dureeMin: form.get("dureeMin"),
      tajwid: String(form.get("tajwid") ?? ""),
      noteLibre: String(form.get("noteLibre") ?? ""),
      passages,
    });
  } catch {
    resultat = { ok: false, erreur: "L'enregistrement a échoué. Réessaie dans un instant." };
  }
  if (!resultat.ok) return { erreur: resultat.erreur };

  revalidatePath("/eleve");
  redirect(`/eleve?mois=${moisDe(date)}&type=${type}`);
}

export async function actionSupprimerSeance(form: FormData): Promise<void> {
  const profil = await exigerEspace("eleve");
  const date = String(form.get("date") ?? "");
  const type = String(form.get("type") ?? "");
  await supprimerSeanceEleve(profil.id, type, date);
  revalidatePath("/eleve");
  redirect(`/eleve?mois=${moisDe(date)}&type=${type}`);
}

export async function actionEnregistrerObjectif(form: FormData): Promise<void> {
  const profil = await exigerEspace("eleve");
  await enregistrerObjectifEleve(profil.id, {
    type: form.get("type"),
    mois: form.get("mois"),
    semaine: form.get("semaine") ?? "",
    description: form.get("description"),
    statut: form.get("statut") ?? "en_cours",
  });
  revalidatePath("/eleve");
}
