"use client";

import { useEffect } from "react";

/**
 * Démarrage instantané du Coran : la police du Mushaf (≈ 90 Ko) est demandée quand le téléphone ne
 * fait rien d'autre, dès la première page ouverte. En arrivant sur le Coran, elle est déjà là : pas de
 * texte qui « saute » d'une police à l'autre.
 */
export function Prechargement({ lecture = "hafs" }: { lecture?: "hafs" | "warsh" }) {
  useEffect(() => {
    const fichier = lecture === "warsh" ? "/polices/warsh.10.woff2" : "/polices/hafs.18.woff2";
    const charger = () => {
      // Déjà dans le cache HTTP après la première fois : ne coûte alors rien.
      if (document.fonts?.check?.(`16px "KFGQPC ${lecture === "warsh" ? "Warsh" : "Hafs"}"`)) return;
      void fetch(fichier, { priority: "low" } as RequestInit).catch(() => undefined);
    };
    const rappel =
      window.requestIdleCallback?.(charger, { timeout: 4000 }) ?? window.setTimeout(charger, 2500);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(rappel);
      else window.clearTimeout(rappel);
    };
  }, [lecture]);
  return null;
}
