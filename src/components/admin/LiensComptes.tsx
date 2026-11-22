"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionLierCompte } from "@/app/actions/comptesLies";
import type { EtatSaisie } from "@/app/actions/fiche";

/** Lier ton compte administrateur à un autre compte (par exemple ton compte élève). */
export function FormulaireLienCompte() {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionLierCompte, {});
  const formulaire = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (etat.enregistre) formulaire.current?.reset();
  }, [etat]);
  return (
    <form ref={formulaire} action={action} className="bloc formulaire" noValidate>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <div className="champ">
        <label htmlFor="email-lien">Adresse e-mail de l’autre compte</label>
        <input id="email-lien" name="email" type="email" autoComplete="off" required />
      </div>
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Liaison…" : "Lier ce compte au mien"}
      </button>
    </form>
  );
}
