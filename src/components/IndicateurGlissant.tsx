"use client";

import { useLayoutEffect, useRef } from "react";

/** Dernière position connue de chaque indicateur (si son conteneur est recréé par une navigation). */
const memoire = new Map<string, { x: number; y: number; l: number; h: number }>();

/**
 * Fond de l'option choisie qui glisse d'une option à l'autre dans un choix en segments
 * (Sourate / Mushaf, Lecture seule / Modifier, Thème…). À placer en premier enfant du conteneur ;
 * `actif` : sélecteur CSS de l'option choisie ; `valeur` : ce qui change quand on choisit.
 * L'option choisie perd son propre fond (classe avec-indicateur sur le conteneur, voir globals.css).
 */
export function IndicateurGlissant({ id, actif, valeur }: { id: string; actif: string; valeur: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const indicateur = ref.current;
    const conteneur = indicateur?.parentElement;
    if (!indicateur || !conteneur) return;
    const placer = (anime: boolean) => {
      const choisi = conteneur.querySelector<HTMLElement>(actif);
      if (!choisi) {
        conteneur.classList.remove("avec-indicateur");
        return;
      }
      // D'abord la classe (le conteneur devient le repère des positions), puis les mesures.
      conteneur.classList.add("avec-indicateur");
      const cible = {
        x: choisi.offsetLeft,
        y: choisi.offsetTop,
        l: choisi.offsetWidth,
        h: choisi.offsetHeight,
      };
      const appliquer = (p: typeof cible) => {
        indicateur.style.transform = `translate(${p.x}px, ${p.y}px)`;
        indicateur.style.width = `${p.l}px`;
        indicateur.style.height = `${p.h}px`;
      };
      const avant = memoire.get(id);
      indicateur.classList.remove("glisse");
      if (anime && avant && (avant.x !== cible.x || avant.y !== cible.y)) {
        appliquer(avant);
        void indicateur.offsetWidth;
        indicateur.classList.add("glisse");
      }
      appliquer(cible);
      memoire.set(id, cible);
    };
    placer(true);
    // Taille du texte, rotation de l'écran… : on suit, sans animation.
    const suivre = new ResizeObserver(() => placer(false));
    suivre.observe(conteneur);
    return () => suivre.disconnect();
  }, [id, actif, valeur]);

  return <span ref={ref} className="indicateur-glissant" aria-hidden="true" />;
}
