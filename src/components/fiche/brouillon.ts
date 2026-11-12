"use client";

import type { Passage } from "@/domain/versets";

/**
 * Brouillon d'une séance gardé dans le téléphone (localStorage) : si l'élève
 * quitte la page en pleine saisie (appel, écran verrouillé), il retrouve ce
 * qu'il avait tapé. Effacé à l'enregistrement, oublié au bout de 7 jours.
 */
export interface Brouillon {
  dureeMin: number;
  passages: Passage[];
  noteLibre: string;
}

const DUREE_VIE_MS = 7 * 24 * 3600 * 1000;
const cleStockage = (cle: string) => `brouillon-seance:${cle}`;

export function lireBrouillon(cle: string): Brouillon | null {
  try {
    const brut = window.localStorage.getItem(cleStockage(cle));
    if (!brut) return null;
    const b = JSON.parse(brut) as Brouillon & { le: number };
    if (typeof b.le !== "number" || Date.now() - b.le > DUREE_VIE_MS || !Array.isArray(b.passages)) {
      window.localStorage.removeItem(cleStockage(cle));
      return null;
    }
    return { dureeMin: Number(b.dureeMin) || 0, passages: b.passages, noteLibre: String(b.noteLibre ?? "") };
  } catch {
    return null; // stockage indisponible (navigation privée…) : pas de brouillon
  }
}

export function ecrireBrouillon(cle: string, b: Brouillon) {
  try {
    window.localStorage.setItem(cleStockage(cle), JSON.stringify({ ...b, le: Date.now() }));
  } catch {
    /* stockage plein ou indisponible : tant pis */
  }
}

export function effacerBrouillon(cle: string) {
  try {
    window.localStorage.removeItem(cleStockage(cle));
  } catch {
    /* rien */
  }
}

/** Même contenu (pour ne pas garder un « brouillon » identique à la séance). */
export function memeSaisie(a: Brouillon, b: Brouillon): boolean {
  const passages = (l: Passage[]) =>
    JSON.stringify(l.map((p) => [p.sourateDebut, p.versetDebut, p.sourateFin, p.versetFin]));
  return (
    a.dureeMin === b.dureeMin &&
    a.noteLibre.trim() === b.noteLibre.trim() &&
    passages(a.passages) === passages(b.passages)
  );
}
