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

type Resultat = { ok: true } | { ok: false; erreur: string };

// Envois préparés mais pas encore partis : on attend que la fiche soit affichée,
// sinon Next attend la fin de l'enregistrement avant de changer de page.
const aEnvoyer = new Map<string, () => Promise<Resultat>>();

const enAttente = new Map<string, EnAttente>();
const abonnes = new Set<() => void>();

function publier() {
  abonnes.forEach((f) => f());
}

/** Prépare l'envoi ; il part dès que la fiche est affichée (ou au bout de 1,5 s). */
export function preparerEnvoi(cle: string, saisie: Saisie, envoyer: () => Promise<Resultat>) {
  enAttente.set(cle, { etat: "envoi", saisie });
  aEnvoyer.set(cle, envoyer);
  publier();
  window.setTimeout(() => lancerEnvoi(cle), 1500);
}

/** Lance l'envoi préparé (une seule fois). */
export function lancerEnvoi(cle: string) {
  const envoyer = aEnvoyer.get(cle);
  if (!envoyer) return;
  aEnvoyer.delete(cle);
  envoyer()
    .then((r) => (r.ok ? retirer(cle) : marquerErreur(cle, r.erreur)))
    .catch(() => marquerErreur(cle, "pas de connexion. Vérifie ton réseau et réessaie."));
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
