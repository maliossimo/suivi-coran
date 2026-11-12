"use client";

import { useActionState } from "react";
import type { EtatSaisie } from "@/app/actions/fiche";
import { actionRejoindre } from "@/app/actions/rejoindre";
import { AntiRobot } from "@/components/AntiRobot";

/** Création de compte élève après avoir scanné le QR code de la classe. */
export function FormulaireRejoindre({ code }: { code: string }) {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionRejoindre, {});
  return (
    <form action={action} className="formulaire" noValidate>
      <input type="hidden" name="code" value={code} />
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <div className="formulaire-deux">
        <div className="champ">
          <label htmlFor="prenom">Prénom</label>
          <input id="prenom" name="prenom" autoComplete="given-name" required maxLength={60} />
        </div>
        <div className="champ">
          <label htmlFor="nom">Nom</label>
          <input id="nom" name="nom" autoComplete="family-name" required maxLength={60} />
        </div>
      </div>
      <div className="champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </div>
      <div className="champ">
        <label htmlFor="motDePasse">Mot de passe (10 caractères minimum)</label>
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
      <AntiRobot />
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Création du compte…" : "Créer mon compte"}
      </button>
    </form>
  );
}
