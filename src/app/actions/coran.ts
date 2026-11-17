"use server";

import { profilConnecte } from "@/repositories/profils";
import {
  chargerSourateSuivante,
  rechercherDansLeCoran,
  type BlocCoran,
  type ResultatCoran,
} from "@/services/coran";

/** Lecture en continu : la sourate qui suit celle affichée. */
export async function actionSourateSuivante(lecture: unknown, sourate: unknown): Promise<BlocCoran | null> {
  const profil = await profilConnecte();
  if (!profil) return null;
  return chargerSourateSuivante(profil, lecture, sourate).catch(() => null);
}

/** Recherche dans le Coran (référence, sourate, mots arabes). */
export async function actionRechercherCoran(lecture: unknown, requete: unknown): Promise<ResultatCoran[]> {
  const profil = await profilConnecte();
  if (!profil) return [];
  return rechercherDansLeCoran(profil, lecture, requete).catch(() => []);
}
