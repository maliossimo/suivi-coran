"use server";

import { profilConnecte } from "@/repositories/profils";
import { signalerErreurTajwid } from "@/services/tajwid";

/** « L'appli s'est trompée » sur un mot de la vérification tajwid. */
export async function actionSignalerTajwid(donnees: unknown): Promise<{ ok: boolean; erreur?: string }> {
  return signalerErreurTajwid(await profilConnecte(), donnees);
}
