"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Pincer à deux doigts sur le texte : `onPas(+1)` en écartant, `onPas(-1)` en resserrant, une fois par cran
 * (environ 15 % d'écart), pour que la taille change pendant le geste, sans attendre de lâcher. Le navigateur ne
 * zoome pas la page entière pendant ce temps (les barres restent nettes et à leur place).
 */
export function usePincement(zone: RefObject<HTMLElement | null>, onPas: (pas: 1 | -1) => void) {
  const rappel = useRef(onPas);
  useEffect(() => {
    rappel.current = onPas;
  });
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    let reference = 0;
    const ecart = (e: TouchEvent) => {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const debut = (e: TouchEvent) => {
      if (e.touches.length === 2) reference = ecart(e);
    };
    const mouvement = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !reference) return;
      e.preventDefault();
      const rapport = ecart(e) / reference;
      if (rapport > 1.15) {
        reference = ecart(e);
        rappel.current(1);
      } else if (rapport < 0.87) {
        reference = ecart(e);
        rappel.current(-1);
      }
    };
    const fin = (e: TouchEvent) => {
      if (e.touches.length < 2) reference = 0;
    };
    el.addEventListener("touchstart", debut, { passive: true });
    el.addEventListener("touchmove", mouvement, { passive: false });
    el.addEventListener("touchend", fin, { passive: true });
    el.addEventListener("touchcancel", fin, { passive: true });
    return () => {
      el.removeEventListener("touchstart", debut);
      el.removeEventListener("touchmove", mouvement);
      el.removeEventListener("touchend", fin);
      el.removeEventListener("touchcancel", fin);
    };
  }, [zone]);
}
