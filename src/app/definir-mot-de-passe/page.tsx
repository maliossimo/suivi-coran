"use client";

import { useActionState } from "react";
import { actionDefinirMotDePasse, type EtatFormulaire } from "@/app/actions/auth";
import { EnteteApp } from "@/components/EnteteApp";

/** Atteinte après le lien d'invitation ou de réinitialisation (session déjà ouverte). */
export default function PageDefinirMotDePasse() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionDefinirMotDePasse, {});

  return (
    <main className="page-centree">
      <EnteteApp sousTitre="Choisis ton mot de passe" />
      <form action={action} className="carte" noValidate>
        {etat.erreur ? (
          <p className="message-erreur" role="alert">
            {etat.erreur}
          </p>
        ) : null}
        <div className="champ">
          <label htmlFor="motDePasse">Nouveau mot de passe (10 caractères minimum)</label>
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
    </main>
  );
}
