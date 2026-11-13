"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { relancerEnAttente } from "./enregistrementsEnAttente";

/** Distance minimale (px) d'un glissement, et rapport horizontal / vertical exigé. */
const SEUIL_GLISSER = 70;
const SEUIL_TIRER = 90;

type Sens = "gauche" | "droite";

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
  /** Décalage du contenu pendant que le doigt glisse horizontalement. */
  const [glisse, setGlisse] = useState(0);
  /** Départ en cours : le contenu s'efface dans le sens du geste jusqu'à l'arrivée du nouveau mois. */
  const [depart, setDepart] = useState<{ sens: Sens; cle: string } | null>(null);
  const cleRef = useRef(cleFiche);
  cleRef.current = cleFiche;

  const partir = useCallback((sens: Sens) => {
    setDepart({ sens, cle: cleRef.current });
    setGlisse(0);
  }, []);

  // Navigation annulée ou très lente : on ne laisse pas la fiche effacée.
  useEffect(() => {
    if (!depart) return;
    const minuteur = window.setTimeout(() => setDepart(null), 6000);
    return () => window.clearTimeout(minuteur);
  }, [depart]);

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
      if (!d) return;
      const t = e.touches[0]!;
      const dy = t.clientY - d.y;
      const dx = t.clientX - d.x;
      if (d.haut) setTire(dy > 0 && dy > Math.abs(dx) ? Math.min(dy, 140) : 0);
      // Le contenu suit le doigt (avec résistance) quand le geste est horizontal.
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.6) {
        const possible = d.onglets
          ? dx < 0
            ? ongletDroite
            : ongletGauche
          : dx < 0
            ? moisSuivant
            : moisPrecedent;
        setGlisse(possible ? dx * 0.35 : dx * 0.08);
      } else setGlisse(0);
    };
    const fin = (e: TouchEvent) => {
      const d = depart.current;
      depart.current = null;
      setTire(0);
      setGlisse(0);
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
      partir(dx < 0 ? "gauche" : "droite");
      navigator.vibrate?.(8);
      router.push(cible, { scroll: false });
    };

    window.addEventListener("touchstart", debut, { passive: true });
    window.addEventListener("touchmove", mouvement, { passive: true });
    window.addEventListener("touchend", fin, { passive: true });
    const annule = () => {
      depart.current = null;
      setTire(0);
      setGlisse(0);
    };
    window.addEventListener("touchcancel", annule);
    return () => {
      window.removeEventListener("touchstart", debut);
      window.removeEventListener("touchmove", mouvement);
      window.removeEventListener("touchend", fin);
      window.removeEventListener("touchcancel", annule);
    };
  }, [router, partir, moisPrecedent, moisSuivant, ongletGauche, ongletDroite]);

  const visible = tire > 10 || rafraichit;
  // Nouveau contenu arrivé après un départ : il entre par le côté opposé.
  const classe = depart
    ? depart.cle === cleFiche
      ? `fiche-gestes depart-${depart.sens}`
      : `fiche-gestes arrivee-${depart.sens}`
    : glisse
      ? "fiche-gestes glisse"
      : "fiche-gestes";
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
        className={classe}
        style={
          glisse
            ? { transform: `translateX(${glisse}px)`, opacity: 1 - Math.min(Math.abs(glisse) / 400, 0.3) }
            : undefined
        }
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && depart && depart.cle !== cleFiche) setDepart(null);
        }}
        onClickCapture={(e) => {
          // Flèches des mois et onglets : même effet que le glissement.
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
            return;
          const lien = e.target instanceof Element ? e.target.closest<HTMLElement>("a[data-sens]") : null;
          const sens = lien?.dataset.sens;
          if (sens === "gauche" || sens === "droite") partir(sens);
        }}
      >
        {children}
      </div>
    </>
  );
}
