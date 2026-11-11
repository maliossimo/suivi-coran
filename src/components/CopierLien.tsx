"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/** Copie (ou partage, sur téléphone) le lien d'inscription de la classe. */
export function CopierLien({ lien }: { lien: string }) {
  const [copie, setCopie] = useState(false);

  async function partager() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Rejoindre la classe", url: lien });
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
