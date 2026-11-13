"use client";

import { useEffect } from "react";
import { actionOuverture } from "@/app/actions/ouverture";

const CLE = "derniere-ouverture";
const INTERVALLE = 15 * 60 * 1000;

/**
 * Note l'utilisation de l'appli : à l'ouverture et à chaque retour sur l'appli
 * (même déjà connectée), au plus une fois par quart d'heure.
 */
export function SignalerOuverture() {
  useEffect(() => {
    const signaler = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const derniere = Number(localStorage.getItem(CLE) ?? 0);
        if (Date.now() - derniere < INTERVALLE) return;
        localStorage.setItem(CLE, String(Date.now()));
      } catch {
        // stockage indisponible : la base limite de toute façon à une ouverture par quart d'heure
      }
      actionOuverture().catch(() => undefined);
    };
    signaler();
    document.addEventListener("visibilitychange", signaler);
    window.addEventListener("pageshow", signaler);
    return () => {
      document.removeEventListener("visibilitychange", signaler);
      window.removeEventListener("pageshow", signaler);
    };
  }, []);
  return null;
}
