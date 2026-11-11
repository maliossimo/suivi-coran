"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionChangerMotDePasse, type EtatFormulaire } from "@/app/actions/auth";

/** Changement de mot de passe depuis « Mon compte ». */
export function FormulaireMotDePasse() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionChangerMotDePasse, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.ok) formulaire.current?.reset();
  }, [etat]);

  return (
    <form ref={formulaire} action={action} className="formulaire" noValidate>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <div className="champ">
        <label htmlFor="motDePasse">Nouveau mot de passe</label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>
      <div className="champ">
        <label htmlFor="confirmation">Confirme le mot de passe</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required />
      </div>
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Changer mon mot de passe"}
      </button>
    </form>
  );
}
