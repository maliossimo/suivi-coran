"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionCreerEtablissement } from "@/app/actions/admin";
import type { EtatSaisie } from "@/app/actions/fiche";

export function FormulaireEtablissement() {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionCreerEtablissement, {});
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!enCours && !etat.erreur) formulaire.current?.reset();
  }, [enCours, etat]);

  return (
    <form ref={formulaire} action={action} className="formulaire-ligne">
      <label htmlFor="nomEtablissement" className="visuellement-cache">
        Nom du nouvel établissement
      </label>
      <input
        id="nomEtablissement"
        name="nom"
        placeholder="Nom du nouvel établissement"
        maxLength={120}
        required
      />
      <button type="submit" className="bouton-secondaire" disabled={enCours}>
        Créer
      </button>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
    </form>
  );
}
