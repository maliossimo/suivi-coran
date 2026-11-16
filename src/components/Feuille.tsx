"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useFermerAuRetour } from "./retour";

/**
 * Nombre de feuilles ouvertes : le défilement de la page n'est rendu qu'à la
 * fermeture de la dernière (une feuille peut en ouvrir une autre).
 */
let ouvertes = 0;
let defilementGarde = 0;

/**
 * Bloque le défilement de la page derrière une feuille.
 * `overflow: hidden` ne suffit pas sur iPhone : on fige le document à sa position
 * puis on la rend telle quelle à la fermeture.
 */
export function bloquerDefilement(): () => void {
  if (ouvertes++ === 0) {
    defilementGarde = window.scrollY;
    const corps = document.body.style;
    corps.position = "fixed";
    corps.top = `-${defilementGarde}px`;
    corps.left = "0";
    corps.right = "0";
    document.documentElement.classList.add("defilement-bloque");
  }
  return () => {
    if (--ouvertes > 0) return;
    const corps = document.body.style;
    corps.position = "";
    corps.top = "";
    corps.left = "";
    corps.right = "";
    document.documentElement.classList.remove("defilement-bloque");
    window.scrollTo({ top: defilementGarde, behavior: "instant" });
  };
}

/**
 * Feuille qui monte du bas de l'écran (panneau de réglages, choix…).
 * Fenêtre modale native : le reste de la page est inerte, Échap ferme,
 * le focus revient au bouton qui l'a ouverte. Le contenu défile seul.
 * Elle monte avec un léger ressort, et se ferme aussi en la tirant vers le bas par sa poignée.
 */
export function Feuille({
  ouverte,
  onFermer,
  titre,
  children,
  pied,
}: {
  ouverte: boolean;
  onFermer: () => void;
  titre: string;
  children: ReactNode;
  /** Boutons d'action collés en bas de la feuille. */
  pied?: ReactNode;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const contenu = useRef<HTMLDivElement>(null);
  /** Ouverture : le doigt d'un appui long se relève juste après, sur le voile. */
  const ouverteA = useRef(0);
  /** Le doigt s'est posé sur le voile depuis l'ouverture (sinon, le « clic » vient du geste d'avant). */
  const appuiSurVoile = useRef(false);
  /** Le doigt s'est posé dans la feuille depuis son ouverture. */
  const appuiDepuisOuverture = useRef(false);
  const idTitre = useId();
  useFermerAuRetour(ouverte, onFermer);
  /** Glisser la feuille vers le bas par son en-tête pour la fermer. */
  const tire = useRef<{ y: number; t: number; dy: number; id: number } | null>(null);

  const suivre = (dy: number | null, relache = false) => {
    const el = contenu.current;
    if (!el) return;
    el.classList.toggle("feuille-tiree", dy !== null && !relache);
    el.classList.toggle("feuille-relachee", relache);
    if (dy === null) el.style.removeProperty("transform");
    else el.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };

  useEffect(() => {
    const d = dialogue.current;
    if (!d || !ouverte) return;
    if (!d.open) d.showModal();
    ouverteA.current = Date.now();
    appuiSurVoile.current = false;
    appuiDepuisOuverture.current = false;
    // Le focus va sur la feuille elle-même : pas de clavier qui surgit, pas de bouton surligné.
    contenu.current?.focus({ preventScroll: true });
    const debloquer = bloquerDefilement();
    return () => {
      debloquer();
      if (d.open) d.close();
    };
  }, [ouverte]);

  if (!ouverte) return null;
  return (
    <dialog
      ref={dialogue}
      className="feuille"
      aria-labelledby={idTitre}
      onCancel={(e) => {
        e.preventDefault();
        onFermer();
      }}
      // Toucher le voile (en dehors du contenu) ferme la feuille : seulement un toucher commencé
      // sur le voile après l'ouverture (le doigt d'un appui long qui se relève ne compte pas).
      onPointerDownCapture={() => {
        appuiDepuisOuverture.current = true;
      }}
      onPointerDown={(e) => {
        appuiSurVoile.current = e.target === e.currentTarget;
      }}
      // Le doigt d'un appui long se relève sur la feuille qui vient de s'ouvrir : le « clic » qui suit
      // n'appuie sur aucun bouton (il viendrait du geste d'avant, pas d'un choix).
      onClickCapture={(e) => {
        if (!appuiDepuisOuverture.current && e.detail > 0) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && appuiSurVoile.current && Date.now() - ouverteA.current > 400)
          onFermer();
        appuiSurVoile.current = false;
      }}
    >
      <div className="feuille-contenu" ref={contenu} tabIndex={-1}>
        <header
          className="feuille-entete"
          onPointerDown={(e) => {
            if (e.button !== 0 || (e.target instanceof Element && e.target.closest("button, a, input")))
              return;
            tire.current = { y: e.clientY, t: Date.now(), dy: 0, id: e.pointerId };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const t = tire.current;
            if (!t || t.id !== e.pointerId) return;
            // Vers le haut, la feuille résiste (elle est déjà en place).
            const dy = e.clientY - t.y;
            t.dy = dy > 0 ? dy : dy * 0.15;
            suivre(t.dy);
          }}
          onPointerUp={(e) => {
            const t = tire.current;
            tire.current = null;
            if (!t || t.id !== e.pointerId) return;
            const vitesse = t.dy / Math.max(1, Date.now() - t.t);
            const hauteur = contenu.current?.offsetHeight ?? 400;
            if (t.dy > Math.min(140, hauteur * 0.3) || (t.dy > 30 && vitesse > 0.6)) {
              // Assez tirée : elle descend jusqu'en bas, puis se ferme.
              suivre(hauteur, true);
              window.setTimeout(() => {
                suivre(null);
                onFermer();
              }, 200);
            } else {
              // Pas assez : elle revient en place avec un petit rebond.
              suivre(0, true);
              window.setTimeout(() => suivre(null), 380);
            }
          }}
          onPointerCancel={() => {
            tire.current = null;
            suivre(null);
          }}
        >
          <span className="feuille-poignee" aria-hidden="true" />
          <h2 id={idTitre}>{titre}</h2>
          <button type="button" className="feuille-fermer" onClick={() => onFermer()} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="feuille-corps">{children}</div>
        {pied ? <footer className="feuille-pied">{pied}</footer> : null}
      </div>
    </dialog>
  );
}
