"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/** Copie (ou partage, sur téléphone) le lien d'inscription de la classe. */
export function CopierLien({ lien, classe }: { lien: string; classe?: string }) {
  const [copie, setCopie] = useState(false);

  async function partager() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Rejoindre la classe",
          text: `Rejoins ${classe ? `la classe ${classe}` : "ma classe"} sur Suivi cours Coran : crée ton compte avec ce lien.`,
          url: lien,
        });
        return;
      }
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } catch {
      // Partage annulé : rien à faire.
    }
  }

  return (
    <button type="button" className="bouton-secondaire" onClick={partager}>
      {copie ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />}
      {copie ? "Lien copié" : "Partager le lien"}
    </button>
  );
}
