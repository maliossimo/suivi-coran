"use client";

import { useLinkStatus } from "next/link";

/**
 * Petit point qui pulse dans un lien pendant le chargement de sa page :
 * l'écran actuel reste affiché, et l'on voit que le clic a été pris en compte.
 */
export function IndicateurLien() {
  const { pending } = useLinkStatus();
  return <span className={pending ? "indicateur-lien actif" : "indicateur-lien"} aria-hidden="true" />;
}
