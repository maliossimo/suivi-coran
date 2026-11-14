"use server";

import { profilConnecte } from "@/repositories/profils";
import { chargerSourateSuivante, type BlocCoran } from "@/services/coran";

/** Lecture en continu : la sourate qui suit celle affichée. */
export async function actionSourateSuivante(lecture: unknown, sourate: unknown): Promise<BlocCoran | null> {
  const profil = await profilConnecte();
  if (!profil) return null;
  return chargerSourateSuivante(profil, lecture, sourate).catch(() => null);
}
