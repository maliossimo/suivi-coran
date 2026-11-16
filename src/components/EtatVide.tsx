import type { ReactNode } from "react";

/**
 * Écran vide illustré par l'étoile à 8 branches du motif de l'app : elle se dessine en or,
 * puis flotte et tourne très lentement (immobile si le téléphone demande de réduire les animations).
 */
export function EtatVide({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <section className="etat-vide">
      <svg viewBox="0 0 96 96" width="88" height="88" aria-hidden="true" className="etat-vide-motif">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          className="etat-vide-etoile"
        >
          <rect x="27" y="27" width="42" height="42" pathLength={1} />
          <rect x="27" y="27" width="42" height="42" transform="rotate(45 48 48)" pathLength={1} />
          <circle cx="48" cy="48" r="10" pathLength={1} />
        </g>
        <circle cx="48" cy="48" r="3.5" className="etat-vide-centre" />
      </svg>
      <h2>{titre}</h2>
      {children ? <div className="etat-vide-texte">{children}</div> : null}
    </section>
  );
}
