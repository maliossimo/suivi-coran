"use server";

import { profilConnecte } from "@/repositories/profils";
import { revalidatePath } from "next/cache";
import { correctionsDuPassage, refuserCorrectionTajwid, signalerErreurTajwid } from "@/services/tajwid";

/** « L'appli s'est trompée » sur un mot de la vérification tajwid. */
export async function actionSignalerTajwid(donnees: unknown): Promise<{ ok: boolean; erreur?: string }> {
  return signalerErreurTajwid(await profilConnecte(), donnees);
}

/** Corrections apprises des signalements, pour le passage que l'élève va réciter. */
export async function actionCorrectionsTajwid(
  passage: unknown,
): Promise<{ verset: number; mot: string; regle: string }[]> {
  return correctionsDuPassage(await profilConnecte(), passage);
}

/** Admin : refuser ou rétablir une correction apprise. */
export async function actionRefuserCorrectionTajwid(
  donnees: unknown,
): Promise<{ ok: boolean; erreur?: string }> {
  const r = await refuserCorrectionTajwid(await profilConnecte(), donnees);
  if (r.ok) revalidatePath("/admin/journal");
  return r;
}
