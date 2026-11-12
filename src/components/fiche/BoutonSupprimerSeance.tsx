"use client";

import { useRouter } from "next/navigation";
import { actionSupprimerSeanceFond } from "@/app/actions/fiche";
import { effacerBrouillon } from "./brouillon";
import { cleSeance } from "./cleSeance";
import { programmerSuppression } from "./suppressions";

/** Supprime la séance… après quelques secondes, le temps de pouvoir annuler. */
export function BoutonSupprimerSeance({
  eleveId,
  date,
  type,
  retour,
  libelleJour,
}: {
  eleveId: string;
  date: string;
  type: string;
  retour: string;
  libelleJour: string;
}) {
  const router = useRouter();
  return (
    <div className="zone-suppression">
      <button
        type="button"
        className="bouton-danger"
        onClick={() => {
          const cle = cleSeance(eleveId, date, type);
          const form = new FormData();
          form.set("eleveId", eleveId);
          form.set("date", date);
          form.set("type", type);
          effacerBrouillon(cle);
          programmerSuppression(cle, `Séance du ${libelleJour} supprimée`, () =>
            actionSupprimerSeanceFond(form),
          );
          router.push(retour);
        }}
      >
        Supprimer cette séance
      </button>
    </div>
  );
}
