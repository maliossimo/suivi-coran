"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

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
function bloquerDefilement(): () => void {
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
  const idTitre = useId();

  useEffect(() => {
    const d = dialogue.current;
    if (!d || !ouverte) return;
    if (!d.open) d.showModal();
    ouverteA.current = Date.now();
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
      // Toucher le voile (en dehors du contenu) ferme la feuille.
      onClick={(e) => {
        if (e.target === e.currentTarget && Date.now() - ouverteA.current > 400) onFermer();
      }}
    >
      <div className="feuille-contenu" ref={contenu} tabIndex={-1}>
        <header className="feuille-entete">
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
