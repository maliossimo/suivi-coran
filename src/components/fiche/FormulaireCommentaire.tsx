"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionCommenter, type EtatSaisie } from "@/app/actions/fiche";

/** Commentaire du maître sur une séance ou un bilan (visible par l'élève). */
export function FormulaireCommentaire({
  eleveId,
  cible,
  cibleId,
}: {
  eleveId: string;
  cible: "seance" | "bilan";
  cibleId: string;
}) {
  const id = `texte-${cible}`;
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionCommenter, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!enCours && !etat.erreur) formulaire.current?.reset();
  }, [enCours, etat]);

  return (
    <form ref={formulaire} action={action} className="bloc bloc-commentaire">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="cible" value={cible} />
      <input type="hidden" name="cibleId" value={cibleId} />
      <label htmlFor={id} className="bloc-titre">
        Commentaire
      </label>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <textarea
        id={id}
        name="texte"
        className="champ-texte"
        rows={2}
        maxLength={1000}
        placeholder="Un mot pour l’élève…"
        required
      />
      <button
        type="submit"
        className={cible === "seance" ? "bouton" : "bouton-secondaire"}
        disabled={enCours}
      >
        {enCours ? "Envoi…" : "Envoyer à l’élève"}
      </button>
    </form>
  );
}
