"use client";

import { Maximize, Minimize } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const CLE = "coran-plein-ecran";

type DocTransition = Document & {
  startViewTransition?: (maj: () => void) => { finished: Promise<void> };
};

/** Applique (ou retire) le plein écran : un repère sur <html> (barres et outils s'effacent). */
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
  // (Pas le plein écran du navigateur : sur Android, il affiche à chaque fois un long message par-dessus le
  // texte. Le mode de l'appli suffit : barres et outils s'effacent, l'heure du téléphone reste visible.)
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

  // Le bouton de sortie s'efface après 3 s de lecture ; un toucher sur l'écran le fait revenir.
  const [discret, setDiscret] = useState(false);
  useEffect(() => {
    if (!actif) return;
    let minuteur = window.setTimeout(() => setDiscret(true), 3000);
    const reveiller = () => {
      setDiscret(false);
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(() => setDiscret(true), 3000);
    };
    document.addEventListener("pointerdown", reveiller, { passive: true });
    return () => {
      window.clearTimeout(minuteur);
      document.removeEventListener("pointerdown", reveiller);
    };
  }, [actif]);

  return actif ? (
    <button
      type="button"
      className={discret ? "coran-sortir-plein-ecran discret" : "coran-sortir-plein-ecran"}
      onClick={() => basculer(false)}
      aria-label="Quitter le plein écran"
    >
      <Minimize size={16} aria-hidden="true" />
      <span aria-hidden="true">Quitter</span>
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
