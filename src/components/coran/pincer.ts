"use client";

import { useEffect, type RefObject } from "react";

/**
 * Pincer à deux doigts sur le texte du Coran : pendant le geste, le texte grossit à l'œil (simple
 * agrandissement, sans recalcul) ; à la fin, `onFin(facteur)` choisit la vraie taille. Un doigt seul fait
 * défiler normalement.
 */
export function usePincer(zone: RefObject<HTMLElement | null>, onFin: (facteur: number) => void) {
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const doigts = new Map<number, { x: number; y: number }>();
    let depart = 0;
    let facteur = 1;
    const ecart = () => {
      const [a, b] = [...doigts.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const centre = () => {
      const [a, b] = [...doigts.values()];
      const r = el.getBoundingClientRect();
      return a && b ? `${(a.x + b.x) / 2 - r.left}px ${(a.y + b.y) / 2 - r.top}px` : "50% 50%";
    };
    const poser = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size === 2) {
        depart = ecart();
        facteur = 1;
        el.style.transformOrigin = centre();
        el.style.willChange = "transform";
      }
    };
    const bouger = (e: PointerEvent) => {
      if (!doigts.has(e.pointerId)) return;
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (doigts.size !== 2 || !depart) return;
      facteur = Math.min(2.5, Math.max(0.5, ecart() / depart));
      el.style.transform = `scale(${facteur})`;
    };
    const lever = (e: PointerEvent) => {
      if (!doigts.delete(e.pointerId)) return;
      if (doigts.size === 1 && depart) {
        el.style.transform = "";
        el.style.willChange = "";
        const f = facteur;
        depart = 0;
        facteur = 1;
        if (Math.abs(f - 1) > 0.06) onFin(f);
      }
    };
    el.addEventListener("pointerdown", poser);
    el.addEventListener("pointermove", bouger);
    el.addEventListener("pointerup", lever);
    el.addEventListener("pointercancel", lever);
    return () => {
      el.removeEventListener("pointerdown", poser);
      el.removeEventListener("pointermove", bouger);
      el.removeEventListener("pointerup", lever);
      el.removeEventListener("pointercancel", lever);
    };
  }, [zone, onFin]);
}
