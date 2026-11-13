"use client";

import { useCallback, useEffect, useState } from "react";
import { basculerMarquePage, estMarque, lireMarquePages, type MarquePage } from "@/domain/coran";

const CLE = "coran-marque-pages";
const EVENEMENT = "coran-marque-pages";

function lire(): MarquePage[] {
  try {
    return lireMarquePages(JSON.parse(localStorage.getItem(CLE) ?? "[]"));
  } catch {
    return [];
  }
}

/** Marque-pages du Coran, gardés sur le téléphone et partagés entre les écrans ouverts. */
export function useMarquePages() {
  const [liste, setListe] = useState<MarquePage[]>([]);

  useEffect(() => {
    const relire = () => setListe(lire());
    relire();
    window.addEventListener("storage", relire);
    window.addEventListener(EVENEMENT, relire);
    return () => {
      window.removeEventListener("storage", relire);
      window.removeEventListener(EVENEMENT, relire);
    };
  }, []);

  /** Ajoute ou retire ; renvoie vrai si le verset est maintenant marqué. */
  const basculer = useCallback((v: Omit<MarquePage, "ajouteLe">): boolean => {
    const nouvelle = basculerMarquePage(lire(), v, new Date().toISOString());
    try {
      localStorage.setItem(CLE, JSON.stringify(nouvelle));
    } catch {
      // stockage indisponible : le marque-page vaut pour cette visite
    }
    setListe(nouvelle);
    window.dispatchEvent(new Event(EVENEMENT));
    return estMarque(nouvelle, v);
  }, []);

  return { liste, basculer };
}
