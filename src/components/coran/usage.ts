"use client";

import { actionNoterUsageCoran } from "@/app/actions/usagesCoran";

/**
 * Compteur « qui utilise le Coran » : une lecture (ou une écoute) d'une sourate n'est signalée
 * qu'une fois par visite, en arrière-plan, sans jamais gêner la lecture.
 */
export function noterUneFois(quoi: "lecture" | "ecoute", sourate: number): void {
  const cle = `usage-coran-${quoi}-${sourate}`;
  try {
    if (sessionStorage.getItem(cle)) return;
    sessionStorage.setItem(cle, "1");
  } catch {
    // stockage indisponible : on compte quand même
  }
  void actionNoterUsageCoran(quoi, sourate).catch(() => undefined);
}
