"use client";

import type { ContenuSeance } from "@/domain/fiche";
import type { Passage } from "@/domain/versets";

/**
 * Brouillon d'une séance gardé dans le téléphone (localStorage) : si l'élève
 * quitte la page en pleine saisie (appel, écran verrouillé), il retrouve ce
 * qu'il avait tapé. Au clic sur « Enregistrer », il est marqué « envoi » et
 * n'est effacé qu'une fois la base d'accord : si l'onglet se ferme ou si le
 * réseau coupe pendant l'envoi, la séance n'est pas perdue : elle est renvoyée
 * au prochain affichage de la fiche (voir EtatEnregistrement). Oublié au bout de 7 jours.
 */
export interface Brouillon {
  dureeMin: number;
  passages: Passage[];
  noteLibre: string;
}

const DUREE_VIE_MS = 7 * 24 * 3600 * 1000;
const PREFIXE = "brouillon-seance:";
const cleStockage = (cle: string) => `${PREFIXE}${cle}`;

type Stocke = Brouillon & { le: number; envoi?: boolean; attendu?: ContenuSeance | null };

function lireBrut(cle: string): Stocke | null {
  const brut = window.localStorage.getItem(cleStockage(cle));
  if (!brut) return null;
  const b = JSON.parse(brut) as Stocke;
  if (typeof b.le !== "number" || Date.now() - b.le > DUREE_VIE_MS || !Array.isArray(b.passages)) {
    window.localStorage.removeItem(cleStockage(cle));
    return null;
  }
  return b;
}

export function lireBrouillon(cle: string): Brouillon | null {
  try {
    const b = lireBrut(cle);
    if (!b) return null;
    return { dureeMin: Number(b.dureeMin) || 0, passages: b.passages, noteLibre: String(b.noteLibre ?? "") };
  } catch {
    return null; // stockage indisponible (navigation privée…) : pas de brouillon
  }
}

/**
 * `envoi` : la séance a été envoyée, on attend la confirmation de la base.
 * `attendu` : la séance telle qu'elle était en base quand l'élève l'a ouverte (null : aucune).
 */
export function ecrireBrouillon(cle: string, b: Brouillon, envoi = false, attendu?: ContenuSeance | null) {
  try {
    const stocke: Stocke = { ...b, le: Date.now(), envoi, ...(attendu !== undefined ? { attendu } : {}) };
    window.localStorage.setItem(cleStockage(cle), JSON.stringify(stocke));
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

/**
 * Envoi de cette séance jamais confirmé (onglet fermé, coupure…) : la saisie
 * et la version de la séance sur laquelle elle a été faite (`undefined` : inconnue).
 */
export function envoiInterrompu(
  cle: string,
): { saisie: Brouillon; attendu: ContenuSeance | null | undefined } | null {
  try {
    const b = lireBrut(cle);
    if (!b?.envoi) return null;
    return {
      saisie: {
        dureeMin: Number(b.dureeMin) || 0,
        passages: b.passages,
        noteLibre: String(b.noteLibre ?? ""),
      },
      attendu: b.attendu,
    };
  } catch {
    return null;
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
