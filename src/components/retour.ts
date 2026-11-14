"use client";

import { useEffect, useRef } from "react";

const CLE = "__feuille";
const CLE_USEES = "feuilles-fermees";

/** Entrées d'historique de feuilles fermées à l'écran : un « retour » qui y arrive les saute. */
function usees(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(CLE_USEES) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}
function marquerUsee(marque: string) {
  try {
    const s = [...usees(), marque].slice(-50);
    sessionStorage.setItem(CLE_USEES, JSON.stringify(s));
  } catch {
    // sans stockage : au pire un « retour » de plus
  }
}

let ecouteGlobale = false;
function sauterLesEntreesUsees() {
  if (ecouteGlobale) return;
  ecouteGlobale = true;
  window.addEventListener("popstate", () => {
    const marque = (window.history.state as Record<string, unknown> | null)?.[CLE];
    if (typeof marque === "string" && usees().has(marque)) window.history.back();
  });
}

/**
 * Le geste « retour » du téléphone ferme la feuille (ou la fenêtre plein écran) ouverte au lieu de
 * quitter la page. Chrome sur Android le fait déjà seul (CloseWatcher) : rien à faire. Ailleurs (iPhone),
 * une entrée d'historique est ajoutée à l'ouverture. Fermée à l'écran, la feuille laisse cette entrée,
 * sautée au prochain « retour » : jamais de retour en arrière déclenché par l'appli, qui pourrait
 * annuler une navigation lancée depuis la feuille.
 */
export function useFermerAuRetour(ouvert: boolean, fermer: () => void): void {
  const rappel = useRef(fermer);
  rappel.current = fermer;

  useEffect(() => {
    if (!ouvert || typeof window === "undefined" || "CloseWatcher" in window) return;
    sauterLesEntreesUsees();
    const marque = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const etat = (window.history.state ?? {}) as Record<string, unknown>;
    window.history.pushState({ ...etat, [CLE]: marque }, "");
    let fermee = false;
    const surRetour = () => {
      if (fermee || (window.history.state as Record<string, unknown> | null)?.[CLE] === marque) return;
      fermee = true;
      rappel.current();
    };
    window.addEventListener("popstate", surRetour);
    return () => {
      window.removeEventListener("popstate", surRetour);
      if (!fermee) marquerUsee(marque);
    };
  }, [ouvert]);
}
