"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actionMotDePasseOublie, type EtatFormulaire } from "@/app/actions/auth";
import { CadreAuth } from "@/components/CadreAuth";

export default function PageMotDePasseOublie() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionMotDePasseOublie, {});

  return (
    <CadreAuth
      titre="Mot de passe oublié"
      sousTitre="Saisis ton adresse : tu recevras un lien pour en choisir un nouveau."
    >
      <form action={action} className="formulaire" noValidate>
        {etat.erreur ? (
          <p className="message-erreur" role="alert">
            {etat.erreur}
          </p>
        ) : null}
        {etat.info ? (
          <p className="message-info" role="status">
            {etat.info}
          </p>
        ) : null}
        <div className="champ">
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <button className="bouton" type="submit" disabled={enCours}>
          Recevoir un lien
        </button>
        <Link href="/connexion" className="lien-discret lien-centre">
          ← Retour à la connexion
        </Link>
      </form>
    </CadreAuth>
  );
}
