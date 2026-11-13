"use client";

import { useSyncExternalStore } from "react";
import type { Passage } from "@/domain/versets";
import { ecrireBrouillon, effacerBrouillon } from "./brouillon";

export { cleSeance } from "./cleSeance";

/**
 * Séances en cours d'enregistrement « en arrière-plan ».
 *
 * Au clic sur « Enregistrer », l'élève revient tout de suite sur sa fiche ;
 * l'envoi continue pendant ce temps. Sans réseau, la séance attend (« Sans réseau »)
 * et part toute seule dès que la connexion revient. Le brouillon gardé dans le
 * téléphone (brouillon.ts) prend le relais si la page est fermée entre-temps.
 * Si la base refuse, la saisie est gardée pour être reprise en rouvrant la séance.
 */
export interface Saisie {
  dureeMin: number;
  passages: Passage[];
  noteLibre: string;
}

export interface EnAttente {
  /** `attente` : pas de réseau, nouvel essai automatique au retour de la connexion. */
  etat: "envoi" | "attente" | "erreur";
  erreur?: string;
  /** La séance a changé entre-temps en base : l'élève choisit en la rouvrant. */
  conflit?: boolean;
  saisie: Saisie;
}

type Resultat = { ok: true } | { ok: false; erreur: string; conflit?: true };

/** Événement émis après chaque enregistrement réussi (la page se rafraîchit). */
export const EVENEMENT_ENREGISTREE = "suivi:seance-enregistree";

// Envois préparés pas encore partis : on attend que la fiche soit affichée,
// sinon Next attend la fin de l'enregistrement avant de changer de page.
const aEnvoyer = new Map<string, () => Promise<Resultat>>();
// Envoi de chaque séance en attente de réseau, pour le nouvel essai.
const aRelancer = new Map<string, () => Promise<Resultat>>();

const enAttente = new Map<string, EnAttente>();
const abonnes = new Set<() => void>();

function publier() {
  abonnes.forEach((f) => f());
}

/** Prépare l'envoi ; il part dès que la fiche est affichée (ou au bout de 1,5 s). */
export function preparerEnvoi(cle: string, saisie: Saisie, envoyer: () => Promise<Resultat>) {
  aRelancer.delete(cle);
  enAttente.set(cle, { etat: "envoi", saisie });
  aEnvoyer.set(cle, envoyer);
  publier();
  window.setTimeout(() => lancerEnvoi(cle), 1500);
}

function horsLigne(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function envoyerMaintenant(cle: string, envoyer: () => Promise<Resultat>) {
  if (horsLigne()) return mettreEnAttente(cle, envoyer);
  const courant = enAttente.get(cle);
  if (courant && courant.etat !== "envoi") {
    enAttente.set(cle, { saisie: courant.saisie, etat: "envoi" });
    publier();
  }
  envoyer()
    .then((r) => {
      if (r.ok) {
        effacerBrouillon(cle); // la base a la séance : le brouillon ne sert plus
        navigator.vibrate?.(30); // petite vibration (Android) : c'est enregistré
        aRelancer.delete(cle);
        retirer(cle);
        window.dispatchEvent(new Event(EVENEMENT_ENREGISTREE));
        return;
      }
      // Refus de la base : plus de nouvel essai automatique, la saisie reste en brouillon.
      const saisie = enAttente.get(cle)?.saisie;
      if (saisie) ecrireBrouillon(cle, saisie);
      aRelancer.delete(cle);
      marquerErreur(cle, r.erreur, r.conflit === true);
    })
    // Pas de réponse (réseau coupé, serveur injoignable) : on réessaiera.
    .catch(() => mettreEnAttente(cle, envoyer));
}

/** Lance l'envoi préparé (une seule fois). */
export function lancerEnvoi(cle: string) {
  const envoyer = aEnvoyer.get(cle);
  if (!envoyer) return;
  aEnvoyer.delete(cle);
  envoyerMaintenant(cle, envoyer);
}

function mettreEnAttente(cle: string, envoyer: () => Promise<Resultat>) {
  const courant = enAttente.get(cle);
  if (!courant) return;
  aRelancer.set(cle, envoyer);
  enAttente.set(cle, { saisie: courant.saisie, etat: "attente" });
  publier();
  programmerNouvelEssai();
}

/** Renvoie toutes les séances qui attendaient le réseau. */
export function relancerEnAttente() {
  if (horsLigne()) return;
  for (const [cle, envoyer] of [...aRelancer]) {
    aRelancer.delete(cle);
    envoyerMaintenant(cle, envoyer);
  }
}

// Certains téléphones ne signalent pas le retour du réseau : on réessaie aussi
// régulièrement tant qu'une séance attend.
let minuterie: number | undefined;
function programmerNouvelEssai() {
  if (minuterie !== undefined) return;
  minuterie = window.setInterval(() => {
    if (aRelancer.size === 0) {
      window.clearInterval(minuterie);
      minuterie = undefined;
      return;
    }
    relancerEnAttente();
  }, 20_000);
}

export function marquerErreur(cle: string, erreur: string, conflit = false) {
  const courant = enAttente.get(cle);
  if (!courant) return;
  enAttente.set(cle, { ...courant, etat: "erreur", erreur, conflit });
  publier();
}

export function retirer(cle: string) {
  aRelancer.delete(cle);
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

if (typeof window !== "undefined") {
  // Le réseau revient, ou l'élève revient sur l'appli : les séances en attente partent.
  window.addEventListener("online", relancerEnAttente);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") relancerEnAttente();
  });
  // Fermer l'onglet pendant un envoi : on prévient (le brouillon garde tout de même la séance).
  window.addEventListener("beforeunload", (e) => {
    if ([...enAttente.values()].some((v) => v.etat === "envoi")) e.preventDefault();
  });
}
