"use client";

import { useReportWebVitals } from "next/web-vitals";

const SUIVIES = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
/** Une visite sur deux est mesurée (tirage à l'ouverture). */
const MESUREE = typeof window !== "undefined" && Math.random() < 0.5;
let attente: { page: string; metrique: string; valeur: number }[] = [];
let minuterie: ReturnType<typeof setTimeout> | null = null;

/** Envoi groupé, en arrière-plan (sendBeacon), sans jamais gêner la navigation. */
function envoyer() {
  minuterie = null;
  if (!attente.length) return;
  const corps = JSON.stringify(attente.slice(0, 10));
  attente = [];
  const blob = new Blob([corps], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/vitesse", blob)) {
    void fetch("/api/vitesse", { method: "POST", body: corps, keepalive: true }).catch(() => undefined);
  }
}

/**
 * Vitesse réelle : les temps d'affichage mesurés sur le téléphone (Core Web Vitals) partent, anonymes,
 * vers l'administration.
 */
export function MesureVitesse() {
  useReportWebVitals((m) => {
    if (!MESUREE || !SUIVIES.has(m.name)) return;
    attente.push({ page: window.location.pathname, metrique: m.name, valeur: m.value });
    if (!minuterie) minuterie = setTimeout(envoyer, 5000);
    if (document.visibilityState === "hidden") envoyer();
  });
  return null;
}
