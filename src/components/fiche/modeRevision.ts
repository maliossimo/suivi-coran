/**
 * Mode révision : toute l'appli passe à l'or (voir globals.css, « Mode révision »).
 * - le repère .mode-revision, posé par le serveur dans la page, donne la couleur au chargement ;
 * - au toucher d'un onglet, data-mode-force sur <html> donne la nouvelle couleur tout de suite,
 *   sans attendre la page ; la nouvelle fiche le retire en s'affichant.
 */
import type { TypeSeance } from "@/domain/fiche";

/** Barre d'état du téléphone (theme-color) : la couleur de l'en-tête, en clair et en sombre. */
const BARRE_ETAT: Record<TypeSeance, { clair: string; sombre: string }> = {
  apprentissage: { clair: "#174D3B", sombre: "#0F3A2C" },
  revision: { clair: "#6B4A10", sombre: "#4A3410" },
};

/** Au-delà, la force est retirée quoi qu'il arrive (navigation annulée, page jamais arrivée). */
const DUREE_MAX_FORCE_MS = 10_000;
let minuteur: number | undefined;

function lireForce(): TypeSeance | null {
  const f = document.documentElement.dataset.modeForce;
  return f === "revision" || f === "apprentissage" ? f : null;
}

export function colorerBarreEtat(type: TypeSeance): void {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = meta.media.includes("dark") ? BARRE_ETAT[type].sombre : BARRE_ETAT[type].clair;
  }
}

/** Au toucher : la couleur de la fiche choisie, tout de suite. */
export function forcerMode(type: TypeSeance): void {
  document.documentElement.dataset.modeForce = type;
  colorerBarreEtat(type);
  window.clearTimeout(minuteur);
  minuteur = window.setTimeout(() => delete document.documentElement.dataset.modeForce, DUREE_MAX_FORCE_MS);
}

/** La fiche `type` est affichée : sa couleur vient maintenant de la page. Rend la couleur à appliquer. */
export function arriveeFiche(type: TypeSeance): TypeSeance {
  const force = lireForce();
  if (force === type) {
    delete document.documentElement.dataset.modeForce;
    window.clearTimeout(minuteur);
    return type;
  }
  // Un autre onglet a été touché entre-temps : sa couleur reste jusqu'à son arrivée.
  return force ?? type;
}

/** En quittant une fiche de révision (vers une autre page) : la barre d'état redevient verte. */
export function departFiche(type: TypeSeance): void {
  if (type === "revision" && lireForce() !== "revision") colorerBarreEtat("apprentissage");
}
