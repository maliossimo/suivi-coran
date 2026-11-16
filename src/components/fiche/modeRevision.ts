/**
 * Mode révision : toute l'appli passe à l'or (voir globals.css, « Mode révision »).
 * - le repère .mode-revision, posé par le serveur dans la page, donne la couleur au chargement ;
 * - au toucher d'un onglet, data-mode-force sur <html> donne la nouvelle couleur tout de suite,
 *   sans attendre la page ; la nouvelle fiche le retire en s'affichant.
 */
import type { TypeSeance } from "@/domain/fiche";

/** Barre d'état du téléphone (theme-color) : la couleur de l'en-tête, en clair et en sombre. */
const BARRE_ETAT = {
  revision: { clair: "#6B4A10", sombre: "#4A3410" },
} as const;

/** Au-delà, la force est retirée quoi qu'il arrive (navigation annulée, page jamais arrivée). */
const DUREE_MAX_FORCE_MS = 10_000;
let minuteur: number | undefined;

function lireForce(): TypeSeance | null {
  const f = document.documentElement.dataset.modeForce;
  return f === "revision" || f === "apprentissage" ? f : null;
}

/** Notre propre balise, placée en tête : le navigateur prend la première qui convient. */
const ID_BALISE = "theme-color-fiche";

function sombre(): boolean {
  const theme = document.documentElement.dataset.theme;
  return theme === "sombre" || (theme !== "clair" && matchMedia("(prefers-color-scheme: dark)").matches);
}

/**
 * Barre d'état du téléphone. Les balises theme-color de Next sont réécrites par Next à chaque
 * navigation : la révision ajoute donc sa propre balise, en tête du document, et l'apprentissage la
 * retire (les balises de Next reprennent la main).
 */
export function colorerBarreEtat(type: TypeSeance): void {
  let balise = document.getElementById(ID_BALISE) as HTMLMetaElement | null;
  if (type === "apprentissage") {
    balise?.remove();
    return;
  }
  if (!balise) {
    balise = document.createElement("meta");
    balise.id = ID_BALISE;
    balise.name = "theme-color";
  }
  // Toujours la première balise theme-color du document.
  if (document.head.firstElementChild !== balise) document.head.prepend(balise);
  balise.content = sombre() ? BARRE_ETAT.revision.sombre : BARRE_ETAT.revision.clair;
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
