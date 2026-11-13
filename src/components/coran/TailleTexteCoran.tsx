"use client";

import { useEffect, useState } from "react";

const CLE = "taille-coran";
const TAILLES = [22, 26, 30, 34, 40];

/** Agrandir / réduire le texte du Coran (réglage gardé sur l'appareil). */
export function TailleTexteCoran() {
  const [index, setIndex] = useState(2);

  useEffect(() => {
    try {
      const i = Number(localStorage.getItem(CLE));
      if (Number.isInteger(i) && i >= 0 && i < TAILLES.length) setIndex(i);
    } catch {
      // stockage indisponible : taille par défaut
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--taille-coran", `${TAILLES[index]}px`);
    try {
      localStorage.setItem(CLE, String(index));
    } catch {
      // stockage indisponible
    }
  }, [index]);

  return (
    <div className="coran-taille" dir="ltr" lang="fr">
      <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} aria-label="Texte plus petit">
        A−
      </button>
      <button
        type="button"
        onClick={() => setIndex((i) => Math.min(TAILLES.length - 1, i + 1))}
        aria-label="Texte plus grand"
      >
        A+
      </button>
    </div>
  );
}
