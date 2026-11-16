"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profilConnecte } from "@/repositories/profils";
import {
  changerEcoute,
  declarerAcquis,
  marquerUnAcquis,
  repondreSansAcquis,
  retirerUnAcquis,
  type ResultatAcquis,
} from "@/services/acquis";

async function acteur() {
  const profil = await profilConnecte();
  if (!profil || !profil.actif) redirect("/connexion");
  return profil;
}

function revalider(eleveId?: string) {
  revalidatePath("/eleve", "layout");
  revalidatePath("/maitre", "layout");
  if (eleveId) revalidatePath(`/maitre/eleves/${eleveId}`, "layout");
}

/** L'élève enregistre ce qu'il connaît déjà (juz, sourates, et s'il veut le faire écouter). */
export async function actionDeclarerAcquis(donnees: unknown): Promise<ResultatAcquis> {
  const profil = await acteur();
  const r = await declarerAcquis(profil, donnees);
  if (r.ok) revalider();
  return r;
}

/** « Je ne connais encore rien » / « Plus tard ». */
export async function actionPasserAcquis(): Promise<void> {
  const profil = await acteur();
  await repondreSansAcquis(profil);
  revalider();
}

export async function actionRetirerAcquis(id: unknown): Promise<ResultatAcquis> {
  const profil = await acteur();
  const r = await retirerUnAcquis(profil, id);
  if (r.ok) revalider();
  return r;
}

export async function actionChangerEcouteAcquis(id: unknown, aEcouter: unknown): Promise<ResultatAcquis> {
  const profil = await acteur();
  const r = await changerEcoute(profil, id, aEcouter);
  if (r.ok) revalider();
  return r;
}

/** Le Cheikh marque une partie déclarée par l'élève. */
export async function actionMarquerAcquis(
  eleveId: unknown,
  id: unknown,
  etat: unknown,
): Promise<ResultatAcquis> {
  const profil = await acteur();
  const r = await marquerUnAcquis(profil, id, etat);
  if (r.ok) revalider(typeof eleveId === "string" ? eleveId : undefined);
  return r;
}
