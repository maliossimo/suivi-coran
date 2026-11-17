"use server";

import { profilConnecte } from "@/repositories/profils";
import type { ResultatRecherche } from "@/domain/rechercheCoran";
import { chargerSourateSuivante, rechercherDansLeCoran, type BlocCoran } from "@/services/coran";

/** Lecture en continu : la sourate qui suit celle affichée. */
export async function actionSourateSuivante(lecture: unknown, sourate: unknown): Promise<BlocCoran | null> {
  const profil = await profilConnecte();
  if (!profil) return null;
  return chargerSourateSuivante(profil, lecture, sourate).catch(() => null);
}

/** Recherche dans le Coran (référence, sourate, mots arabes). */
export async function actionRechercherCoran(
  demande: unknown,
): Promise<{ resultats: ResultatRecherche[]; total: number }> {
  const profil = await profilConnecte();
  if (!profil) return { resultats: [], total: 0 };
  return rechercherDansLeCoran(profil, demande).catch(() => ({ resultats: [], total: 0 }));
}
