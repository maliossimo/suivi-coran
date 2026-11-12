"use server";

import { profilConnecte } from "@/repositories/profils";
import { signalerErreur } from "@/services/admin";

/**
 * Une page a planté chez quelqu'un : l'erreur est notée pour l'administrateur
 * (page, message technique, version). Seulement pour une personne connectée.
 */
export async function actionSignalerErreur(page: string, message: string): Promise<void> {
  try {
    await signalerErreur(await profilConnecte(), page, message);
  } catch {
    /* le signalement ne doit jamais provoquer une autre erreur */
  }
}
