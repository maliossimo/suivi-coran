"use server";

import { profilConnecte } from "@/repositories/profils";
import { textesPourEnchainement } from "@/services/enchainements";

/** Tester les enchaînements : les versets d'une sourate (lecture de l'élève). */
export async function actionTextesEnchainement(sourate: unknown): Promise<string[]> {
  return textesPourEnchainement(await profilConnecte(), sourate);
}
