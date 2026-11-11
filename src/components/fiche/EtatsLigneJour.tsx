"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { actionValiderSeance } from "@/app/actions/fiche";
import { useEnAttente } from "./enregistrementsEnAttente";

/** « Enregistrement… » puis rien (ou « Non enregistrée ») sur la ligne du jour. */
export function EtatEnregistrement({ cle }: { cle: string }) {
  const e = useEnAttente(cle);
  if (!e) return null;
  return e.etat === "envoi" ? (
    <span className="pastille-envoi">Enregistrement…</span>
  ) : (
    <span className="pastille-echec">Non enregistrée · touche pour reprendre</span>
  );
}

/** Le Cheikh valide la séance telle quelle, sans l'ouvrir. */
export function BoutonValider({ seanceId, eleveId }: { seanceId: string; eleveId: string }) {
  const [valide, setValide] = useState(false);
  const [, demarrer] = useTransition();

  if (valide) {
    return (
      <span className="bouton-valider bouton-valider-ok" role="status" aria-label="Séance validée">
        <Check size={18} strokeWidth={2.6} aria-hidden="true" />
      </span>
    );
  }
  return (
    <button
      type="button"
      className="bouton-valider"
      aria-label="Valider la séance : tout est bon"
      title="Tout est bon : valider"
      onClick={() => {
        setValide(true); // affichage immédiat, la base suit
        demarrer(async () => {
          const form = new FormData();
          form.set("seanceId", seanceId);
          form.set("eleveId", eleveId);
          const r = await actionValiderSeance(form).catch(() => ({ ok: false as const }));
          if (!r.ok) setValide(false);
        });
      }}
    >
      <Check size={16} strokeWidth={2.6} aria-hidden="true" />
      Vu
    </button>
  );
}
