"use client";

import { useSyncExternalStore } from "react";

/**
 * Suppressions de séance annulables : la séance n'est réellement supprimée
 * qu'après DELAI_ANNULATION_MS, sauf si l'élève appuie sur « Annuler ».
 * Si la page est quittée avant, la suppression part tout de suite.
 */
export const DELAI_ANNULATION_MS = 6000;

type Resultat = { ok: true } | { ok: false; erreur: string };

export interface SuppressionEnAttente {
  cle: string;
  libelle: string;
  fin: number;
}

const enAttente = new Map<
  string,
  SuppressionEnAttente & { envoyer: () => Promise<Resultat>; minuterie: number }
>();
const abonnes = new Set<() => void>();
let instantane: SuppressionEnAttente[] = [];

function publier() {
  instantane = [...enAttente.values()].map(({ cle, libelle, fin }) => ({ cle, libelle, fin }));
  abonnes.forEach((f) => f());
}

function executer(cle: string) {
  const s = enAttente.get(cle);
  if (!s) return;
  window.clearTimeout(s.minuterie);
  enAttente.delete(cle);
  publier();
  s.envoyer().catch(() => undefined); // l'erreur éventuelle est signalée par le bandeau du serveur
}

export function programmerSuppression(cle: string, libelle: string, envoyer: () => Promise<Resultat>) {
  annulerSuppression(cle);
  const minuterie = window.setTimeout(() => executer(cle), DELAI_ANNULATION_MS);
  enAttente.set(cle, { cle, libelle, fin: Date.now() + DELAI_ANNULATION_MS, envoyer, minuterie });
  publier();
}

export function annulerSuppression(cle: string) {
  const s = enAttente.get(cle);
  if (!s) return;
  window.clearTimeout(s.minuterie);
  enAttente.delete(cle);
  publier();
}

export function useSuppressions(): SuppressionEnAttente[] {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => instantane,
    () => [],
  );
}

export function useSuppressionEnAttente(cle: string): boolean {
  return useSuppressions().some((s) => s.cle === cle);
}

// Quitter la page (ou passer à une autre appli) valide les suppressions en attente.
if (typeof window !== "undefined") {
  const toutEnvoyer = () => [...enAttente.keys()].forEach(executer);
  window.addEventListener("pagehide", toutEnvoyer);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") toutEnvoyer();
  });
}
