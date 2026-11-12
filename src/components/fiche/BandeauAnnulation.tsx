"use client";

import { annulerSuppression, DELAI_ANNULATION_MS, useSuppressions } from "./suppressions";

/** « Séance du 11 nov. supprimée · Annuler », quelques secondes après une suppression. */
export function BandeauAnnulation() {
  const suppressions = useSuppressions();
  if (suppressions.length === 0) return null;
  return (
    <div className="bandeau-annulation-zone" aria-live="polite">
      {suppressions.map((s) => (
        <div key={s.cle} className="bandeau-annulation" role="status">
          <span>{s.libelle}</span>
          <button type="button" onClick={() => annulerSuppression(s.cle)}>
            Annuler
          </button>
          <span
            className="bandeau-annulation-temps"
            aria-hidden="true"
            style={{ animationDuration: `${DELAI_ANNULATION_MS}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
