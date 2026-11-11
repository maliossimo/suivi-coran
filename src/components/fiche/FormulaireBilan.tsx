"use client";

import { Check, RotateCcw } from "lucide-react";
import { useActionState } from "react";
import { actionEnregistrerBilan, type EtatSaisie } from "@/app/actions/fiche";
import type { Bilan, TypeSeance } from "@/domain/fiche";

/** Bilan de fin de mois : ce qui est acquis, ce qui reste à renforcer. */
export function FormulaireBilan({
  eleveId,
  type,
  mois,
  bilan,
  vueMaitre,
}: {
  eleveId: string;
  type: TypeSeance;
  mois: string;
  bilan: Bilan | null;
  vueMaitre: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionEnregistrerBilan, {});

  return (
    <form action={action} className="bilan-formulaire">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mois" value={mois} />

      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}

      <label className="bilan-champ">
        <span className="bilan-etiquette bilan-etiquette-acquis">
          <Check size={15} strokeWidth={2.6} aria-hidden="true" /> Bien mémorisé
        </span>
        <textarea
          name="bienMemorise"
          className="champ-texte"
          rows={3}
          maxLength={1000}
          defaultValue={bilan?.bienMemorise ?? ""}
          placeholder={
            vueMaitre ? "Ce que l'élève maîtrise ce mois-ci…" : "ex. Al-Mulk en entier, règles du noun sakin"
          }
        />
      </label>

      <label className="bilan-champ">
        <span className="bilan-etiquette bilan-etiquette-renfort">
          <RotateCcw size={15} strokeWidth={2.4} aria-hidden="true" /> À renforcer
        </span>
        <textarea
          name="aRenforcer"
          className="champ-texte"
          rows={3}
          maxLength={1000}
          defaultValue={bilan?.aRenforcer ?? ""}
          placeholder={vueMaitre ? "Ce qu'il faut retravailler…" : "ex. Versets 20 à 30, les madd"}
        />
      </label>

      <div className="bilan-actions">
        <button type="submit" className="bouton-secondaire" disabled={enCours}>
          {enCours ? "Enregistrement…" : bilan ? "Mettre à jour le bilan" : "Enregistrer le bilan"}
        </button>
      </div>
    </form>
  );
}
