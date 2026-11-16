"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { relancerEnAttente } from "./fiche/enregistrementsEnAttente";
import { retoursActives } from "./retourSensoriel";

const SEUIL_TIRER = 90;

/**
 * Appli installée : tirer la page vers le bas tout en haut de l'écran la met à jour, sur tous les onglets
 * (dans le navigateur, son propre geste fait déjà la même chose). La fiche a le sien, avec ses gestes de
 * mois et d'onglets : ici, on la laisse faire. Rien pendant qu'une fenêtre est ouverte.
 */
export function TirerPourRafraichir() {
  const router = useRouter();
  const [tire, setTire] = useState(0);
  const [rafraichit, demarrer] = useTransition();
  const depart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    const debut = (e: TouchEvent) => {
      const cible = e.target instanceof Element ? e.target : null;
      const ignore =
        e.touches.length !== 1 ||
        window.scrollY > 0 ||
        document.querySelector(".fiche-gestes, dialog[open]") !== null ||
        Boolean(cible?.closest("input, textarea, select, [contenteditable], .coran-lecteur, .reciter"));
      depart.current = ignore ? null : { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
    };
    const mouvement = (e: TouchEvent) => {
      const d = depart.current;
      if (!d) return;
      const t = e.touches[0]!;
      const dy = t.clientY - d.y;
      setTire(dy > 0 && dy > Math.abs(t.clientX - d.x) && window.scrollY <= 0 ? Math.min(dy, 140) : 0);
    };
    const fin = (e: TouchEvent) => {
      const d = depart.current;
      depart.current = null;
      setTire(0);
      if (!d) return;
      const t = e.changedTouches[0]!;
      const dy = t.clientY - d.y;
      if (dy > SEUIL_TIRER && dy > Math.abs(t.clientX - d.x) * 1.5 && window.scrollY <= 0) {
        if (retoursActives()) navigator.vibrate?.(8);
        demarrer(() => router.refresh());
        relancerEnAttente();
      }
    };
    const annule = () => {
      depart.current = null;
      setTire(0);
    };
    window.addEventListener("touchstart", debut, { passive: true });
    window.addEventListener("touchmove", mouvement, { passive: true });
    window.addEventListener("touchend", fin, { passive: true });
    window.addEventListener("touchcancel", annule);
    return () => {
      window.removeEventListener("touchstart", debut);
      window.removeEventListener("touchmove", mouvement);
      window.removeEventListener("touchend", fin);
      window.removeEventListener("touchcancel", annule);
    };
  }, [router]);

  const visible = tire > 10 || rafraichit;
  return (
    <div
      className={visible ? "tirer-rafraichir visible" : "tirer-rafraichir"}
      style={tire ? { transform: `translate(-50%, ${Math.min(tire / 2, 60)}px)` } : undefined}
      aria-hidden={!rafraichit}
      role="status"
    >
      {/* L'étoile du logo se dessine à mesure qu'on tire, puis tourne pendant la mise à jour. */}
      <svg
        viewBox="0 0 200 200"
        width="24"
        height="24"
        aria-hidden="true"
        className={rafraichit ? "tirer-etoile tourne" : "tirer-etoile"}
        style={
          rafraichit
            ? undefined
            : ({
                "--trace": Math.max(0, 1 - tire / SEUIL_TIRER),
                transform: `rotate(${tire * 1.5}deg)`,
              } as CSSProperties)
        }
      >
        <rect x="34" y="34" width="132" height="132" pathLength={1} />
        <rect x="34" y="34" width="132" height="132" transform="rotate(45 100 100)" pathLength={1} />
      </svg>
      {rafraichit ? <span className="visuellement-cache">Mise à jour…</span> : null}
    </div>
  );
}
