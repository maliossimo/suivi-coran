"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bulles d'information des graphiques : toucher (ou survoler, ou atteindre au clavier) une barre,
 * un point ou une case marqué `data-bulle` affiche sa valeur juste au-dessus. Toucher ailleurs la ferme.
 */
export function ZoneBulles({ children }: { children: ReactNode }) {
  const zone = useRef<HTMLDivElement>(null);
  const [bulle, setBulle] = useState<{ x: number; y: number; texte: string; cle: string } | null>(null);

  const montrer = (cible: EventTarget | null) => {
    const z = zone.current;
    const el = cible instanceof Element ? cible.closest("[data-bulle]") : null;
    if (!z || !el || !z.contains(el)) return setBulle(null);
    const r = el.getBoundingClientRect();
    const rz = z.getBoundingClientRect();
    // La bulle reste dans le cadre du graphique, même pour la première ou la dernière barre.
    const x = Math.min(Math.max(r.left + r.width / 2 - rz.left, 70), Math.max(70, rz.width - 70));
    setBulle({
      x,
      y: Math.max(r.top - rz.top, 0),
      texte: el.getAttribute("data-bulle") ?? "",
      cle: `${r.left},${r.top}`,
    });
  };

  useEffect(() => {
    if (!bulle) return;
    const fermer = (e: PointerEvent) => {
      if (!zone.current?.contains(e.target as Node)) setBulle(null);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBulle(null);
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [bulle]);

  return (
    <div
      ref={zone}
      className="zone-bulles"
      onClick={(e) => montrer(e.target)}
      onFocus={(e) => montrer(e.target)}
      onPointerOver={(e) => {
        if (e.pointerType === "mouse") montrer(e.target);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setBulle(null);
      }}
    >
      {children}
      {bulle ? (
        <span
          key={bulle.cle}
          className="bulle-graphique"
          role="status"
          style={{ left: bulle.x, top: bulle.y }}
        >
          {bulle.texte}
        </span>
      ) : null}
    </div>
  );
}
