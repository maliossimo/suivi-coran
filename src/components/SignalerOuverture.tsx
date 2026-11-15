"use client";

import { useEffect } from "react";

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
      // Avec l'appareil (identifiant tiré au hasard, gardé sur le téléphone) : un nouveau est signalé
      // à l'admin. En arrière-plan, hors de la file de navigation.
      let appareil: string | null = null;
      try {
        appareil = localStorage.getItem("appareil-id");
        if (!appareil) {
          appareil = crypto.randomUUID();
          localStorage.setItem("appareil-id", appareil);
        }
      } catch {
        // stockage indisponible : pas de suivi d'appareil
      }
      void fetch("/api/ouverture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appareil }),
        keepalive: true,
      }).catch(() => undefined);
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
