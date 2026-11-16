"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

const CLE_VISITES = "pages-vues";
const CLE_DEFILEMENT = "defilement-pages";

function lireJson<T>(stockage: Storage, cle: string, defaut: T): T {
  try {
    return (JSON.parse(stockage.getItem(cle) ?? "null") as T | null) ?? defaut;
  } catch {
    return defaut;
  }
}

function ecrireJson(stockage: Storage, cle: string, valeur: unknown): void {
  try {
    stockage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage indisponible : l'appli marche quand même, sans ce confort
  }
}

/** Retour ou avance (bouton du téléphone, geste) : la page reprend là où on l'avait laissée. */
let retourHistorique = false;

/**
 * Confort de toute l'appli, sans rien afficher :
 * - page déjà vue pendant cette visite : pas d'animation d'entrée (`html[data-revisite]`), elle s'affiche net ;
 * - retour en arrière : la position de défilement est rendue (même si le contenu arrive un peu après) ;
 * - iPhone : l'état « appuyé » (:active) s'affiche dès que le doigt touche ;
 * - champs : « Suivant » passe au champ d'après, et le champ reste visible au-dessus du clavier.
 */
export function Fluidite() {
  const chemin = usePathname();

  useEffect(() => {
    // Sans écouteur tactile, Safari n'applique pas :active au toucher.
    const rien = () => undefined;
    document.addEventListener("touchstart", rien, { passive: true });
    const surRetour = () => {
      retourHistorique = true;
    };
    window.addEventListener("popstate", surRetour);

    // Champs : « Suivant » sur le clavier passe au champ d'après (au lieu d'envoyer le formulaire).
    const surTouche = (e: KeyboardEvent) => {
      const champ = e.target;
      if (e.key !== "Enter" || !(champ instanceof HTMLInputElement) || champ.enterKeyHint !== "next") return;
      const champs = [
        ...(champ.form ?? document).querySelectorAll<HTMLElement>(
          "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])",
        ),
      ].filter((c) => c.offsetParent !== null);
      const suivant = champs[champs.indexOf(champ) + 1];
      if (!suivant) return;
      e.preventDefault();
      suivant.focus();
    };
    // Le champ où l'on écrit reste visible au-dessus du clavier.
    const vue = window.visualViewport;
    const garderVisible = () => {
      const champ = document.activeElement;
      if (!vue || !(champ instanceof HTMLInputElement || champ instanceof HTMLTextAreaElement)) return;
      const r = champ.getBoundingClientRect();
      if (r.bottom > vue.height - 12 || r.top < 0)
        champ.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    document.addEventListener("keydown", surTouche);
    vue?.addEventListener("resize", garderVisible);
    return () => {
      document.removeEventListener("touchstart", rien);
      window.removeEventListener("popstate", surRetour);
      document.removeEventListener("keydown", surTouche);
      vue?.removeEventListener("resize", garderVisible);
    };
  }, []);

  // Avant l'affichage de la nouvelle page : déjà vue pendant cette visite ? Elle s'affiche sans animation.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const vues = lireJson<string[]>(sessionStorage, CLE_VISITES, []);
    if (vues.includes(chemin)) html.dataset.revisite = "";
    else {
      delete html.dataset.revisite;
      ecrireJson(sessionStorage, CLE_VISITES, [...vues, chemin].slice(-60));
    }
  }, [chemin]);

  // Position de défilement : retenue pour chaque page, rendue au retour en arrière.
  useEffect(() => {
    const cle = () => `${location.pathname}${location.search}`;
    const positions = lireJson<Record<string, number>>(sessionStorage, CLE_DEFILEMENT, {});
    let image = 0;
    let essais = 0;
    if (retourHistorique) {
      const cible = positions[cle()];
      // Le contenu peut arriver un peu après la page : on réessaie tant que la page est trop courte.
      const rendre = () => {
        if (cible === undefined) return;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max >= cible - 2 || essais++ > 60) {
          window.scrollTo({ top: Math.min(cible, Math.max(0, max)), behavior: "instant" });
          return;
        }
        image = requestAnimationFrame(rendre);
      };
      rendre();
    }
    retourHistorique = false;
    let attente = 0;
    const retenir = () => {
      window.clearTimeout(attente);
      attente = window.setTimeout(() => {
        const toutes = lireJson<Record<string, number>>(sessionStorage, CLE_DEFILEMENT, {});
        toutes[cle()] = Math.round(window.scrollY);
        ecrireJson(sessionStorage, CLE_DEFILEMENT, toutes);
      }, 120);
    };
    window.addEventListener("scroll", retenir, { passive: true });
    return () => {
      cancelAnimationFrame(image);
      window.clearTimeout(attente);
      window.removeEventListener("scroll", retenir);
    };
  }, [chemin]);

  return null;
}
