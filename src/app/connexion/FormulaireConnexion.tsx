"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actionConnexion, type EtatFormulaire } from "@/app/actions/auth";

export function FormulaireConnexion({ erreurInitiale }: { erreurInitiale?: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionConnexion, {
    erreur: erreurInitiale,
  });

  return (
    <form action={action} className="carte" noValidate>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <div className="champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
      </div>
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
      <Link href="/connexion/oubli" style={{ alignSelf: "center", fontSize: 14, padding: 8 }}>
        Mot de passe oublié ?
      </Link>
    </form>
  );
}
