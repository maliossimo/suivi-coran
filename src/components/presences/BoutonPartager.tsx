"use client";

import { Printer, Share2 } from "lucide-react";

/** Partager le récapitulatif (WhatsApp, e-mail…) ou l'imprimer / l'enregistrer en PDF. */
export function BoutonPartager({ titre, texte }: { titre: string; texte: string }) {
  const partager = async () => {
    if (navigator.share) {
      await navigator.share({ title: titre, text: texte }).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(texte).catch(() => undefined);
      alert("Récapitulatif copié : colle-le dans WhatsApp ou un e-mail.");
    }
  };
  return (
    <div className="boutons-partage">
      <button type="button" className="bouton-secondaire" onClick={() => void partager()}>
        <Share2 size={16} aria-hidden="true" />
        Partager
      </button>
      <button type="button" className="bouton-secondaire" onClick={() => window.print()}>
        <Printer size={16} aria-hidden="true" />
        PDF
      </button>
    </div>
  );
}
