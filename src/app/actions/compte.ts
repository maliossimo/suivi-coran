"use server";

import { revalidatePath } from "next/cache";
import { profilConnecte } from "@/repositories/profils";
import { enregistrerMonNom } from "@/services/compte";

/** Prénom et nom de la personne connectée. */
export async function actionMonNom(donnees: unknown): Promise<{ ok: boolean; erreur?: string }> {
  const r = await enregistrerMonNom(await profilConnecte(), donnees);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}
