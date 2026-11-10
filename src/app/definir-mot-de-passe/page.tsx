"use client";

import { useActionState } from "react";
import { actionDefinirMotDePasse, type EtatFormulaire } from "@/app/actions/auth";
import { CadreAuth } from "@/components/CadreAuth";

/** Atteinte après le lien d'invitation ou de réinitialisation (session déjà ouverte). */
export default function PageDefinirMotDePasse() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionDefinirMotDePasse, {});

  return (
    <CadreAuth
      titre="Choisis ton mot de passe"
      sousTitre="10 caractères minimum. Tu t'en serviras à chaque connexion."
    >
      <form action={action} className="formulaire" noValidate>
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
          Enregistrer
        </button>
      </form>
    </CadreAuth>
  );
}
