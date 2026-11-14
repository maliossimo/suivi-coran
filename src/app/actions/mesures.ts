"use server";

import { headers } from "next/headers";
import { profilConnecte } from "@/repositories/profils";
import { recevoirMesure, signalerAppareil } from "@/services/securite";

/** L'appareil de la personne connectée (nouvel appareil : signalé à l'admin). */
export async function actionAppareil(appareil: unknown): Promise<void> {
  await signalerAppareil(await profilConnecte(), appareil, (await headers()).get("user-agent") ?? "");
}

/** Vitesse réelle : une mesure envoyée par le téléphone (anonyme). */
export async function actionMesureVitesse(mesure: unknown): Promise<void> {
  await recevoirMesure(await profilConnecte(), mesure, (await headers()).get("user-agent") ?? "");
}
