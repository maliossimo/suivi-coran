"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * « L'élément touché s'ouvre en page » : une carte marquée data-ouvre-en-page (carte d'un élève,
 * jour de la fiche) s'agrandit jusqu'à remplir l'écran, puis la nouvelle page apparaît dessous.
 * Au retour (bouton ou geste « retour »), l'écran se referme vers la carte, à sa place.
 * Rien ne bloque : la navigation est celle du lien ; le voile part dès la nouvelle page affichée
 * (au plus tard après 3 s). Immobile si le téléphone demande de réduire les animations.
 */

let voile: HTMLDivElement | null = null;
let minuteur: number | undefined;
/** Adresse de la dernière carte ouverte, pour s'y refermer au retour. */
let derniere: { href: string; quand: number } | null = null;
let retourDemande = 0;

const calme = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function retirerVoile(fondu: boolean) {
  window.clearTimeout(minuteur);
  const v = voile;
  voile = null;
  if (!v) return;
  if (!fondu) return v.remove();
  v.classList.add("part");
  window.setTimeout(() => v.remove(), 260);
}

function creerVoile(r: DOMRect, rayon: string): HTMLDivElement {
  retirerVoile(false);
  const v = document.createElement("div");
  v.className = "ouverture-page";
  v.setAttribute("aria-hidden", "true");
  Object.assign(v.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    borderRadius: rayon,
  });
  document.body.appendChild(v);
  voile = v;
  minuteur = window.setTimeout(() => retirerVoile(true), 3000);
  return v;
}

function plein(v: HTMLDivElement) {
  Object.assign(v.style, { left: "0px", top: "0px", width: "100vw", height: "100dvh", borderRadius: "0px" });
}

export function OuvertureEnPage() {
  const chemin = usePathname();

  useEffect(() => {
    const auClic = (e: MouseEvent) => {
      // (Pas de test de defaultPrevented : le lien de Next l'annule toujours pour naviguer lui-même.)
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || calme()) return;
      // Liens « Retour » de l'appli : comme le geste retour, la page se referme vers la carte.
      if (e.target instanceof Element && e.target.closest(".lien-retour, .seance-retour, [data-retour]"))
        retourDemande = Date.now();
      const lien =
        e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[data-ouvre-en-page]") : null;
      if (!lien) return;
      const cible = new URL(lien.href, location.href);
      if (cible.origin !== location.origin || cible.pathname === location.pathname) return;
      const v = creerVoile(lien.getBoundingClientRect(), getComputedStyle(lien).borderRadius);
      derniere = { href: lien.getAttribute("href") ?? "", quand: Date.now() };
      void v.offsetWidth;
      v.classList.add("ouvre");
      plein(v);
    };
    const auRetour = () => {
      retourDemande = Date.now();
    };
    document.addEventListener("click", auClic);
    window.addEventListener("popstate", auRetour);
    return () => {
      document.removeEventListener("click", auClic);
      window.removeEventListener("popstate", auRetour);
    };
  }, []);

  useEffect(() => {
    // Nouvelle page affichée : le voile d'ouverture s'efface.
    if (voile) {
      retirerVoile(true);
      return;
    }
    // Retour sur la page de la carte : l'écran se referme vers elle.
    if (!derniere || Date.now() - retourDemande > 1500 || calme()) return;
    const href = derniere.href;
    derniere = null;
    let essais = 0;
    let image = 0;
    const chercher = () => {
      const carte = [...document.querySelectorAll<HTMLAnchorElement>("a[data-ouvre-en-page]")].find(
        (a) => a.getAttribute("href") === href,
      );
      if (!carte) {
        if (++essais < 20) image = requestAnimationFrame(chercher);
        return;
      }
      const r = carte.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return; // hors de l'écran : pas d'animation
      const v = creerVoile(new DOMRect(0, 0, innerWidth, innerHeight), "0px");
      v.classList.add("ferme");
      void v.offsetWidth;
      Object.assign(v.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        borderRadius: getComputedStyle(carte).borderRadius,
      });
      v.classList.add("part");
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(() => retirerVoile(false), 380);
    };
    image = requestAnimationFrame(chercher);
    return () => cancelAnimationFrame(image);
  }, [chemin]);

  return null;
}
