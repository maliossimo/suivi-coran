"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Choix retenus d'une visite à l'autre, dans un petit cookie (un an). Les liens de l'appli
 * (barre du bas, cartes des élèves) les ajoutent à leur adresse : la page s'ouvre directement
 * sur le bon choix, sans jamais en afficher un autre d'abord.
 */
export const CHOIX = {
  /** Onglet de la fiche : apprentissage ou révision. */
  ongletFiche: "choix-onglet-fiche",
  /** Classe affichée par le Cheikh qui en a plusieurs (vide : toutes). */
  classeCheikh: "choix-classe-cheikh",
} as const;

type NomChoix = (typeof CHOIX)[keyof typeof CHOIX];
const EVENEMENT = "choix-retenu";

function lire(nom: NomChoix): string | null {
  const ligne = document.cookie.split("; ").find((c) => c.startsWith(`${nom}=`));
  const valeur = ligne ? decodeURIComponent(ligne.slice(nom.length + 1)) : "";
  return valeur || null;
}

/** Retient un choix, sans rien afficher. */
export function RetenirChoix({ nom, valeur }: { nom: NomChoix; valeur: string }) {
  useEffect(() => {
    document.cookie = `${nom}=${encodeURIComponent(valeur)}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(EVENEMENT));
  }, [nom, valeur]);
  return null;
}

/** Le choix retenu (null avant l'affichage côté téléphone, ou s'il n'y en a pas). */
export function useChoix(nom: NomChoix): string | null {
  return useSyncExternalStore(
    (f) => {
      window.addEventListener(EVENEMENT, f);
      return () => window.removeEventListener(EVENEMENT, f);
    },
    () => lire(nom),
    () => null,
  );
}
