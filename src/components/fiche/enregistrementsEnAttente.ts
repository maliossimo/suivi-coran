"use client";

import { useSyncExternalStore } from "react";
import type { Passage } from "@/domain/versets";

export { cleSeance } from "./cleSeance";

/**
 * Séances en cours d'enregistrement « en arrière-plan ».
 *
 * Au clic sur « Enregistrer », l'élève revient tout de suite sur sa fiche ;
 * l'envoi continue pendant ce temps. Si la base refuse (rare : tout est déjà
 * vérifié dans le formulaire), la saisie est gardée ici pour être reprise
 * telle quelle en rouvrant la séance.
 */
export interface Saisie {
  dureeMin: number;
  passages: Passage[];
  noteLibre: string;
}

export interface EnAttente {
  etat: "envoi" | "erreur";
  erreur?: string;
  saisie: Saisie;
}

const enAttente = new Map<string, EnAttente>();
const abonnes = new Set<() => void>();

function publier() {
  abonnes.forEach((f) => f());
}

export function marquerEnvoi(cle: string, saisie: Saisie) {
  enAttente.set(cle, { etat: "envoi", saisie });
  publier();
}

export function marquerErreur(cle: string, erreur: string) {
  const courant = enAttente.get(cle);
  if (!courant) return;
  enAttente.set(cle, { ...courant, etat: "erreur", erreur });
  publier();
}

export function retirer(cle: string) {
  if (enAttente.delete(cle)) publier();
}

export function lireEnAttente(cle: string): EnAttente | undefined {
  return enAttente.get(cle);
}

function sAbonner(f: () => void) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** État d'enregistrement d'une séance (undefined si rien en cours). */
export function useEnAttente(cle: string): EnAttente | undefined {
  return useSyncExternalStore(
    sAbonner,
    () => enAttente.get(cle),
    () => undefined,
  );
}

// Fermer l'onglet pendant un envoi ferait perdre la séance : on prévient.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if ([...enAttente.values()].some((v) => v.etat === "envoi")) e.preventDefault();
  });
}
