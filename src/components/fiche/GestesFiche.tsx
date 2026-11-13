"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { relancerEnAttente } from "./enregistrementsEnAttente";

/** Distance minimale (px) d'un glissement, et rapport horizontal / vertical exigé. */
const SEUIL_GLISSER = 70;
const SEUIL_TIRER = 90;

/** Zones où un glissement ne doit pas changer de page (champs, tableaux qui défilent). */
function zoneIgnoree(el: EventTarget | null): boolean {
  return (
    el instanceof Element &&
    Boolean(el.closest("input, textarea, select, [contenteditable], .tableau-defilant, [data-pas-de-geste]"))
  );
}

/**
 * Gestes de la fiche, comme dans une appli :
 * - glisser à gauche / à droite : mois suivant / précédent ;
 * - glisser sur la barre des onglets : apprentissage ↔ révision ;
 * - appli installée : tirer vers le bas en haut de page pour rafraîchir.
 * Le contenu arrive en glissant dans le sens du geste.
 */
export function GestesFiche({
  moisPrecedent,
  moisSuivant,
  ongletGauche,
  ongletDroite,
  cleFiche,
  children,
}: {
  moisPrecedent: string;
  moisSuivant: string;
  /** Onglet à gauche (apprentissage) et à droite (révision) ; null pour l'onglet affiché. */
  ongletGauche: string | null;
  ongletDroite: string | null;
  /** Mois + type affichés : le contenu se remonte (et s'anime) quand ils changent. */
  cleFiche: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const depart = useRef<{ x: number; y: number; t: number; onglets: boolean; haut: boolean } | null>(null);
  const [tire, setTire] = useState(0);
  const [rafraichit, demarrer] = useTransition();
  const [sens, setSens] = useState<"gauche" | "droite" | null>(null);

  useEffect(() => {
    const installee = window.matchMedia("(display-mode: standalone)").matches;

    const debut = (e: TouchEvent) => {
      if (e.touches.length !== 1 || zoneIgnoree(e.target)) {
        depart.current = null;
        return;
      }
      const t = e.touches[0]!;
      depart.current = {
        x: t.clientX,
        y: t.clientY,
        t: Date.now(),
        onglets: e.target instanceof Element && Boolean(e.target.closest(".onglets")),
        haut: installee && window.scrollY <= 0,
      };
    };
    const mouvement = (e: TouchEvent) => {
      const d = depart.current;
      if (!d?.haut) return;
      const t = e.touches[0]!;
      const dy = t.clientY - d.y;
      const dx = Math.abs(t.clientX - d.x);
      setTire(dy > 0 && dy > dx ? Math.min(dy, 140) : 0);
    };
    const fin = (e: TouchEvent) => {
      const d = depart.current;
      depart.current = null;
      setTire(0);
      if (!d) return;
      const t = e.changedTouches[0]!;
      const dx = t.clientX - d.x;
      const dy = t.clientY - d.y;

      if (d.haut && dy > SEUIL_TIRER && dy > Math.abs(dx) * 1.5) {
        demarrer(() => router.refresh());
        relancerEnAttente();
        return;
      }
      if (Math.abs(dx) < SEUIL_GLISSER || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - d.t > 800) return;
      if (window.getSelection()?.toString()) return;

      // Doigt vers la gauche : on avance (mois suivant, onglet de droite).
      const cible = d.onglets ? (dx < 0 ? ongletDroite : ongletGauche) : dx < 0 ? moisSuivant : moisPrecedent;
      if (!cible) return;
      setSens(dx < 0 ? "gauche" : "droite");
      navigator.vibrate?.(8);
      router.push(cible, { scroll: false });
    };

    window.addEventListener("touchstart", debut, { passive: true });
    window.addEventListener("touchmove", mouvement, { passive: true });
    window.addEventListener("touchend", fin, { passive: true });
    const annule = () => {
      depart.current = null;
      setTire(0);
    };
    window.addEventListener("touchcancel", annule);
    return () => {
      window.removeEventListener("touchstart", debut);
      window.removeEventListener("touchmove", mouvement);
      window.removeEventListener("touchend", fin);
      window.removeEventListener("touchcancel", annule);
    };
  }, [router, moisPrecedent, moisSuivant, ongletGauche, ongletDroite]);

  const visible = tire > 10 || rafraichit;
  return (
    <>
      <div
        className={visible ? "tirer-rafraichir visible" : "tirer-rafraichir"}
        style={tire ? { transform: `translate(-50%, ${Math.min(tire / 2, 60)}px)` } : undefined}
        aria-hidden={!rafraichit}
        role="status"
      >
        <RefreshCw
          size={18}
          aria-hidden="true"
          className={rafraichit ? "tourne" : undefined}
          style={rafraichit ? undefined : { transform: `rotate(${tire * 2.5}deg)` }}
        />
        {rafraichit ? <span className="visuellement-cache">Mise à jour…</span> : null}
      </div>
      <div
        key={cleFiche}
        className={sens ? `fiche-gestes arrivee-${sens}` : "fiche-gestes"}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setSens(null);
        }}
      >
        {children}
      </div>
    </>
  );
}
