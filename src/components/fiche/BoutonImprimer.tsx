"use client";

/** Ouvre l'impression du navigateur, d'où l'on choisit « Enregistrer en PDF ». */
export function BoutonImprimer() {
  return (
    <button type="button" className="bouton" onClick={() => window.print()}>
      ⬇ Télécharger en PDF
    </button>
  );
}
