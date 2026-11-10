"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actionMotDePasseOublie, type EtatFormulaire } from "@/app/actions/auth";
import { EnteteApp } from "@/components/EnteteApp";

export default function PageMotDePasseOublie() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionMotDePasseOublie, {});

  return (
    <main className="page-centree">
      <EnteteApp sousTitre="Mot de passe oublié" />
      <form action={action} className="carte" noValidate>
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
        <Link href="/connexion" style={{ alignSelf: "center", fontSize: 14, padding: 8 }}>
          Retour à la connexion
        </Link>
      </form>
    </main>
  );
}
