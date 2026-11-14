"use client";

import { useEffect } from "react";
import { actionAppareil } from "@/app/actions/mesures";
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
      // L'appareil (identifiant tiré au hasard, gardé sur le téléphone) : un nouveau est signalé à l'admin.
      try {
        let appareil = localStorage.getItem("appareil-id");
        if (!appareil) {
          appareil = crypto.randomUUID();
          localStorage.setItem("appareil-id", appareil);
        }
        actionAppareil(appareil).catch(() => undefined);
      } catch {
        // stockage indisponible : pas de suivi d'appareil
      }
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
