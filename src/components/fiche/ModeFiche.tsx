"use client";

import { useEffect } from "react";
import type { TypeSeance } from "@/domain/fiche";

/** Couleur de la barre d'état du téléphone en mode révision (la même que l'en-tête). */
const BARRE_REVISION = "#6b4a10";

/**
 * Repère de la fiche ouverte. En révision, toute l'appli passe à l'or (CSS :root:has(.mode-revision)) :
 * le repère est rendu par le serveur, la couleur est donc juste dès le premier affichage. La barre
 * d'état du téléphone (theme-color) suit, et reprend sa couleur en quittant la page.
 */
export function ModeFiche({ type }: { type: TypeSeance }) {
  useEffect(() => {
    if (type !== "revision") return;
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const avant = metas.map((m) => m.content);
    for (const m of metas) m.content = BARRE_REVISION;
    return () => metas.forEach((m, i) => (m.content = avant[i] ?? m.content));
  }, [type]);
  return (
    <span
      className={type === "revision" ? "mode-fiche mode-revision" : "mode-fiche"}
      data-type={type}
      hidden
    />
  );
}
