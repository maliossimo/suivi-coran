"use client";

import { useEffect } from "react";
import type { TypeSeance } from "@/domain/fiche";
import { arriveeFiche, colorerBarreEtat, departFiche } from "./modeRevision";

/**
 * Repère de la fiche ouverte. En révision, toute l'appli passe à l'or (CSS « Mode révision ») :
 * le repère est rendu par le serveur, la couleur est donc juste dès le premier affichage. La barre
 * d'état du téléphone (theme-color) suit, et redevient verte en quittant la révision.
 */
export function ModeFiche({ type }: { type: TypeSeance }) {
  useEffect(() => {
    colorerBarreEtat(arriveeFiche(type));
    return () => departFiche(type);
  }, [type]);
  return <span className={type === "revision" ? "mode-fiche mode-revision" : "mode-fiche"} hidden />;
}
