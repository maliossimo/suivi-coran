"use client";

import { Download } from "lucide-react";
/** Ouvre l'impression du navigateur, d'où l'on choisit « Enregistrer en PDF ». */
export function BoutonImprimer() {
  return (
    <button type="button" className="bouton" onClick={() => window.print()}>
      <Download size={18} aria-hidden="true" />
      Télécharger en PDF
    </button>
  );
}
