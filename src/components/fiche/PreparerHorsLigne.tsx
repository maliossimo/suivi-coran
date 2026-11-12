"use client";

import { useEffect } from "react";

const DELAI_MS = 10 * 60 * 1000;

/**
 * Prépare des pages pour la salle de cours qui capte mal : le service worker
 * (public/sw.js) garde la dernière version reçue et la réaffiche sans réseau.
 * Ici : la séance du jour (apprentissage et révision) et l'autre onglet de la fiche.
 * Au plus une demande par page toutes les 10 minutes, et seulement avec du réseau.
 */
export function PreparerHorsLigne({ pages }: { pages: string[] }) {
  const cle = pages.join(" ");
  useEffect(() => {
    if (!navigator.onLine || !navigator.serviceWorker?.controller) return;
    const t = window.setTimeout(() => {
      for (const page of cle.split(" ")) {
        const marque = `hors-ligne:${page}`;
        try {
          const derniere = Number(sessionStorage.getItem(marque) ?? 0);
          if (Date.now() - derniere < DELAI_MS) continue;
          sessionStorage.setItem(marque, String(Date.now()));
        } catch {
          /* stockage indisponible : on prépare quand même */
        }
        fetch(page, { headers: { "X-Suivi-Hors-Ligne": "1" }, credentials: "same-origin" }).catch(() => {});
      }
    }, 2000); // après l'affichage, pour ne pas ralentir la fiche
    return () => window.clearTimeout(t);
  }, [cle]);
  return null;
}
