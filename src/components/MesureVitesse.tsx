"use client";

import { useReportWebVitals } from "next/web-vitals";
import { actionMesureVitesse } from "@/app/actions/mesures";

const SUIVIES = new Set(["LCP", "INP", "CLS", "FCP", "TTFB"]);
/** Une visite sur deux est mesurée (tirage à l'ouverture). */
const MESUREE = typeof window !== "undefined" && Math.random() < 0.5;

/**
 * Vitesse réelle : les temps d'affichage mesurés sur le téléphone (Core Web Vitals) partent, anonymes,
 * vers l'administration. Une visite sur deux seulement, pour rester léger.
 */
export function MesureVitesse() {
  useReportWebVitals((m) => {
    if (!MESUREE || !SUIVIES.has(m.name)) return;
    actionMesureVitesse({ page: window.location.pathname, metrique: m.name, valeur: m.value }).catch(
      () => undefined,
    );
  });
  return null;
}
