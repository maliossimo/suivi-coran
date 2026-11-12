"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actionConnexion, type EtatFormulaire } from "@/app/actions/auth";
import { AntiRobot } from "@/components/AntiRobot";

export function FormulaireConnexion({ erreurInitiale }: { erreurInitiale?: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(actionConnexion, {
    erreur: erreurInitiale,
  });

  return (
    <form action={action} className="formulaire" noValidate>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <div className="champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="prenom@exemple.fr"
          required
        />
      </div>
      <div className="champ">
        <div className="champ-ligne">
          <label htmlFor="motDePasse">Mot de passe</label>
          <Link href="/connexion/oubli" className="lien-discret">
            Mot de passe oublié ?
          </Link>
        </div>
        <input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
      </div>
      <AntiRobot />
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
