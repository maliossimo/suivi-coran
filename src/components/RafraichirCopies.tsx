"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** Une page affichée en moins de ce délai après le toucher vient de la copie gardée par le téléphone. */
const AFFICHAGE_INSTANTANE_MS = 250;
/** Retour sur l'appli après au moins ce temps ailleurs : la page affichée est remise à jour. */
const ABSENCE_MS = 30_000;

/**
 * Pages instantanées ET toujours à jour : une page déjà vue s'affiche tout de suite depuis la copie
 * gardée par le téléphone, puis se met à jour toute seule en arrière-plan (ce qu'une autre personne a
 * changé entre-temps apparaît en moins d'une seconde, sans rien toucher). Idem en revenant sur l'appli.
 * Les saisies en cours ne sont pas touchées (seules les données venues du serveur sont remplacées).
 */
export function RafraichirCopies() {
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();
  const toucher = useRef<number | null>(null);
  const retourArriere = useRef(false);
  const premier = useRef(true);
  const cacheeDepuis = useRef<number | null>(null);

  useEffect(() => {
    const surClic = (e: MouseEvent) => {
      const lien = (e.target as Element | null)?.closest?.("a[href]");
      if (lien) toucher.current = performance.now();
    };
    // Précédent / suivant : la page vient toujours de la copie.
    const surRetour = () => {
      retourArriere.current = true;
    };
    const surVisibilite = () => {
      if (document.visibilityState === "hidden") {
        cacheeDepuis.current = Date.now();
        return;
      }
      const absence = cacheeDepuis.current ? Date.now() - cacheeDepuis.current : 0;
      cacheeDepuis.current = null;
      if (absence >= ABSENCE_MS && navigator.onLine) router.refresh();
    };
    document.addEventListener("click", surClic, true);
    window.addEventListener("popstate", surRetour);
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      document.removeEventListener("click", surClic, true);
      window.removeEventListener("popstate", surRetour);
      document.removeEventListener("visibilitychange", surVisibilite);
    };
  }, [router]);

  // Nouvelle page affichée : venue de la copie ? On la remet à jour aussitôt, en arrière-plan.
  useEffect(() => {
    if (premier.current) {
      premier.current = false; // première page : elle arrive fraîche du serveur
      return;
    }
    // Sans toucher de lien (changement de mois, d'onglet…), on ne sait pas : on remet à jour.
    const instantanee =
      retourArriere.current ||
      toucher.current === null ||
      performance.now() - toucher.current < AFFICHAGE_INSTANTANE_MS;
    retourArriere.current = false;
    toucher.current = null;
    if (!instantanee || !navigator.onLine) return;
    const t = setTimeout(() => router.refresh(), 50);
    return () => clearTimeout(t);
  }, [chemin, parametres, router]);

  return null;
}
