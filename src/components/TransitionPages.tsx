"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Attente maximale de la nouvelle page : au-delà, le navigateur reprend la main, la page n'est jamais figée. */
const ATTENTE_MAX_MS = 450;

interface DocumentAvecTransition {
  startViewTransition?: (miseAJour: () => Promise<void>) => { finished: Promise<unknown> };
}

/**
 * Transition douce entre deux pages : un fondu court, sur les navigateurs qui savent le faire
 * (Chrome, Safari récent). Au toucher d'un lien vers une autre page, le navigateur retient l'image de
 * l'ancienne page, Next affiche la nouvelle (ou son écran de chargement), puis le fondu se joue.
 *
 * Jamais bloquant : si la page n'arrive pas en 450 ms, le navigateur reprend la main. Rien ne change pour
 * les liens qui restent sur la même page (mois, onglets), le logo (il joue sa propre animation), le retour
 * en arrière, les téléphones réglés sur « moins d'animations » et les navigateurs plus anciens.
 */
export function TransitionPages() {
  const chemin = usePathname();
  const arrivee = useRef<(() => void) | null>(null);

  // La nouvelle page est affichée : le navigateur peut jouer le fondu.
  // (Pas de requestAnimationFrame ici : le dessin de la page est suspendu pendant l'attente.)
  useEffect(() => {
    const fin = arrivee.current;
    arrivee.current = null;
    fin?.();
  }, [chemin]);

  useEffect(() => {
    const doc = document as unknown as DocumentAvecTransition;
    if (typeof doc.startViewTransition !== "function") return;
    const calme = matchMedia("(prefers-reduced-motion: reduce)");
    let enCours = false;
    const auClic = (e: MouseEvent) => {
      if (calme.matches || enCours || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const lien = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!lien || lien.target === "_blank" || lien.hasAttribute("download") || lien.closest(".barre-marque"))
        return;
      const url = new URL(lien.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      enCours = true;
      const attente = new Promise<void>((resolu) => {
        arrivee.current = resolu;
        window.setTimeout(resolu, ATTENTE_MAX_MS);
      });
      const transition = doc.startViewTransition?.(() => attente);
      const fini = () => {
        enCours = false;
      };
      if (transition) transition.finished.then(fini, fini);
      else fini();
    };
    // En phase de capture : avant que Next ne change de page.
    document.addEventListener("click", auClic, true);
    return () => document.removeEventListener("click", auClic, true);
  }, []);

  return null;
}
