"use client";

import { useRouter } from "next/navigation";
import { actionSupprimerSeanceFond } from "@/app/actions/fiche";
import { effacerBrouillon } from "./brouillon";
import { cleSeance } from "./cleSeance";
import { retirer } from "./enregistrementsEnAttente";
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
    <button
      type="button"
      className="menu-plus-item menu-plus-danger"
      onClick={() => {
        const cle = cleSeance(eleveId, date, type);
        const form = new FormData();
        form.set("eleveId", eleveId);
        form.set("date", date);
        form.set("type", type);
        effacerBrouillon(cle);
        retirer(cle); // plus d'envoi en attente ni d'échec affiché pour une séance supprimée
        programmerSuppression(cle, `Séance du ${libelleJour} supprimée`, () =>
          actionSupprimerSeanceFond(form),
        );
        router.push(retour);
      }}
    >
      Supprimer cette séance
      <small>Tu pourras annuler pendant quelques secondes.</small>
    </button>
  );
}
