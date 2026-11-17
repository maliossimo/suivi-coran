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

/**
 * Sous-titre qui suit la lecture : celui du dernier repère `[data-sous-titre]` passé sous l'en-tête (sourates
 * ajoutées en continu sous la page), sinon `texte`.
 */
export function SousTitreDefilant({ texte }: { texte: string }) {
  useEffect(() => {
    let image = 0;
    let affiche: string | null = null;
    const mettreAJour = () => {
      let choisi = texte;
      for (const el of document.querySelectorAll<HTMLElement>("[data-sous-titre]")) {
        if (el.getBoundingClientRect().top < 140) choisi = el.dataset.sousTitre ?? choisi;
        else break;
      }
      if (choisi !== affiche) {
        affiche = choisi;
        publier(choisi);
      }
    };
    const surDefilement = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(mettreAJour);
    };
    mettreAJour();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", surDefilement);
      if (courant === affiche) publier(null);
    };
  }, [texte]);
  return null;
}
