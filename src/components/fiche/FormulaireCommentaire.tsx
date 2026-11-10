"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionCommenter, type EtatSaisie } from "@/app/actions/fiche";

/** Commentaire du maître sur une séance (visible par l'élève). */
export function FormulaireCommentaire({ eleveId, seanceId }: { eleveId: string; seanceId: string }) {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionCommenter, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!enCours && !etat.erreur) formulaire.current?.reset();
  }, [enCours, etat]);

  return (
    <form ref={formulaire} action={action} className="bloc bloc-commentaire">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="seanceId" value={seanceId} />
      <label htmlFor="texte" className="bloc-titre">
        Commenter pour l’élève
      </label>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <textarea
        id="texte"
        name="texte"
        className="champ-texte"
        rows={2}
        maxLength={1000}
        placeholder="Encouragements, consignes, correction de prononciation…"
        required
      />
      <button type="submit" className="bouton-secondaire" disabled={enCours}>
        {enCours ? "Envoi…" : "Publier le commentaire"}
      </button>
    </form>
  );
}
