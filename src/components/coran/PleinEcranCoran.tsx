"use client";

import { Maximize, Minimize } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const CLE = "coran-plein-ecran";

type DocTransition = Document & {
  startViewTransition?: (maj: () => void) => { finished: Promise<void> };
};

/** Applique (ou retire) le plein écran : un repère sur <html>, et le vrai plein écran du navigateur s'il existe. */
function appliquer(actif: boolean, anime: boolean) {
  const html = document.documentElement;
  const changer = () => {
    if (actif) html.dataset.pleinEcran = "";
    else delete html.dataset.pleinEcran;
  };
  const doc = document as DocTransition;
  if (anime && doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // La barre du haut monte, celle du bas descend, la page s'agrandit en douceur.
    html.classList.add("transition-plein-ecran");
    try {
      doc
        .startViewTransition(changer)
        .finished.catch(() => undefined)
        .finally(() => html.classList.remove("transition-plein-ecran"));
    } catch {
      html.classList.remove("transition-plein-ecran");
      changer();
    }
  } else changer();
  // Vrai plein écran (Android, ordinateur) : la barre d'état disparaît aussi. Pas sur iPhone : le mode suffit.
  try {
    if (actif && !document.fullscreenElement)
      void html.requestFullscreen?.({ navigationUI: "hide" }).catch(() => undefined);
    if (!actif && document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  } catch {
    // navigateur sans plein écran : le mode de l'appli suffit
  }
}

/**
 * Lecture du Coran en plein écran : la barre du haut, la barre du bas et les outils s'effacent,
 * le texte prend toute la place. Un bouton discret permet d'en sortir. Le mode est gardé en
 * tournant les pages, et quitté en sortant du Coran.
 */
export function PleinEcranCoran() {
  const [actif, setActif] = useState(false);

  const basculer = useCallback((valeur: boolean) => {
    setActif(valeur);
    try {
      if (valeur) sessionStorage.setItem(CLE, "1");
      else sessionStorage.removeItem(CLE);
    } catch {
      // stockage indisponible
    }
    appliquer(valeur, true);
  }, []);

  // Gardé d'une page du Coran à l'autre (chaque page monte son propre bouton).
  useLayoutEffect(() => {
    let garde = false;
    try {
      garde = sessionStorage.getItem(CLE) === "1";
    } catch {
      // stockage indisponible
    }
    if (garde) {
      setActif(true);
      document.documentElement.dataset.pleinEcran = "";
    }
    return () => {
      // En quittant le Coran (pas en tournant la page), on sort du plein écran.
      window.setTimeout(() => {
        if (document.querySelector(".espace-coran")) return;
        try {
          sessionStorage.removeItem(CLE);
        } catch {
          // stockage indisponible
        }
        appliquer(false, false);
      }, 0);
    };
  }, []);

  // Le navigateur sort de son plein écran (geste retour, touche Échap) : l'appli aussi.
  useEffect(() => {
    const surChangement = () => {
      if (!document.fullscreenElement && document.documentElement.hasAttribute("data-plein-ecran")) {
        basculer(false);
      }
    };
    document.addEventListener("fullscreenchange", surChangement);
    return () => document.removeEventListener("fullscreenchange", surChangement);
  }, [basculer]);

  return actif ? (
    <button
      type="button"
      className="coran-sortir-plein-ecran"
      onClick={() => basculer(false)}
      aria-label="Quitter le plein écran"
    >
      <Minimize size={20} aria-hidden="true" />
    </button>
  ) : (
    <button
      type="button"
      className="coran-plein-ecran"
      onClick={() => basculer(true)}
      aria-label="Lire en plein écran"
      title="Plein écran"
    >
      <Maximize size={18} aria-hidden="true" />
    </button>
  );
}
