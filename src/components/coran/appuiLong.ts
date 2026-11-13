"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";
import { retoursActives } from "@/components/retourSensoriel";

/** Durée d'un appui long (ms) et tolérance de mouvement du doigt (px). */
const DELAI = 480;
const TOLERANCE = 10;

const cleSous = (cible: EventTarget | null): string | null =>
  cible instanceof Element ? (cible.closest("[data-cle]")?.getAttribute("data-cle") ?? null) : null;

/**
 * Toucher et appui long sur les versets, par délégation : un seul jeu d'écouteurs
 * sur le texte, quel que soit le nombre de versets. Défiler annule l'appui long ;
 * l'appui long n'ouvre ni la sélection du texte ni le menu « copier ».
 */
export function useAppuiLong(onToucher: (cle: string) => void, onAppuiLong: (cle: string) => void) {
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const declenche = useRef(false);

  const annuler = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
    depart.current = null;
  };

  return {
    onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      const cle = cleSous(e.target);
      if (!cle) return;
      annuler();
      declenche.current = false;
      depart.current = { x: e.clientX, y: e.clientY };
      minuterie.current = setTimeout(() => {
        minuterie.current = null;
        declenche.current = true;
        if (retoursActives()) navigator.vibrate?.(15);
        onAppuiLong(cle);
      }, DELAI);
    },
    onPointerMove(e: PointerEvent) {
      const d = depart.current;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > TOLERANCE) annuler();
    },
    onPointerUp: annuler,
    onPointerCancel: annuler,
    onPointerLeave: annuler,
    onClick(e: MouseEvent) {
      // Le clic qui suit un appui long ne doit pas ouvrir aussi les actions.
      if (declenche.current) {
        declenche.current = false;
        return;
      }
      const cle = cleSous(e.target);
      if (cle) onToucher(cle);
    },
    onContextMenu(e: MouseEvent) {
      if (cleSous(e.target)) e.preventDefault();
    },
  };
}
