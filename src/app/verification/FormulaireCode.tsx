"use client";

import { useActionState } from "react";
import { actionDeconnexion } from "@/app/actions/auth";
import type { EtatSaisie } from "@/app/actions/fiche";
import { actionVerifierCode } from "@/app/actions/securite";

export function FormulaireCode() {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionVerifierCode, {});

  return (
    <>
      <form action={action} className="formulaire" noValidate>
        {etat.erreur ? (
          <p className="message-erreur" role="alert">
            {etat.erreur}
          </p>
        ) : null}
        <div className="champ">
          <label htmlFor="code">Code</label>
          <input
            id="code"
            name="code"
            className="champ-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            placeholder="123 456"
            autoFocus
            required
          />
        </div>
        <button className="bouton" type="submit" disabled={enCours}>
          {enCours ? "Vérification…" : "Valider"}
        </button>
      </form>
      <form action={actionDeconnexion}>
        <button type="submit" className="lien-discret bouton-lien">
          Se déconnecter
        </button>
      </form>
    </>
  );
}
