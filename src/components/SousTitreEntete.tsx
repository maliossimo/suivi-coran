"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * Sous-titre de l'en-tête compact (« 12 élèves · 3 à écouter », « Novembre 2026 · Révision »…).
 * Chaque page le donne là où elle a ses données (même chargées plus tard) ; l'en-tête l'affiche.
 */
let courant: string | null = null;
const abonnes = new Set<() => void>();

function publier(texte: string | null) {
  courant = texte;
  for (const f of abonnes) f();
}

export function useSousTitreEntete(): string | null {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => courant,
    () => null,
  );
}

/** À placer dans la page : son texte s'affiche sous le titre de l'en-tête compact. */
export function SousTitreEntete({ texte }: { texte: string }) {
  useEffect(() => {
    publier(texte);
    // En quittant la page, le sous-titre part avec elle (sauf si la suivante l'a déjà remplacé).
    return () => {
      if (courant === texte) publier(null);
    };
  }, [texte]);
  return null;
}
