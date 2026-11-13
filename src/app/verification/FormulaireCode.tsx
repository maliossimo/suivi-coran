"use client";

import { useActionState } from "react";
import { actionDeconnexion } from "@/app/actions/auth";
import { actionEnvoyerCode, actionValiderCode, type EtatCode } from "@/app/actions/codeAdmin";
import { AntiRobot } from "@/components/AntiRobot";

export function FormulaireCode({ email }: { email: string }) {
  const [envoi, envoyer, enEnvoi] = useActionState<EtatCode, FormData>(actionEnvoyerCode, {});
  const [saisie, valider, enValidation] = useActionState<EtatCode, FormData>(actionValiderCode, {});
  const erreur = saisie.erreur ?? envoi.erreur;

  return (
    <>
      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {envoi.envoye ? (
        <form action={valider} className="formulaire" noValidate>
          <p className="message-info" role="status">
            Code envoyé à <strong>{email}</strong>. Il arrive en quelques secondes (regarde aussi les
            indésirables).
          </p>
          <div className="champ">
            <label htmlFor="code">Code reçu par e-mail</label>
            <input
              id="code"
              name="code"
              className="champ-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              placeholder="123456"
              autoFocus
              required
            />
          </div>
          <button className="bouton" type="submit" disabled={enValidation}>
            {enValidation ? "Vérification…" : "Valider"}
          </button>
        </form>
      ) : null}

      <form action={envoyer} className="formulaire" noValidate>
        {envoi.envoye ? null : (
          <p className="carte-graphique-sous">
            Un code va être envoyé à <strong>{email}</strong>.
          </p>
        )}
        <AntiRobot />
        <button
          className={envoi.envoye ? "lien-discret bouton-lien" : "bouton"}
          type="submit"
          disabled={enEnvoi}
        >
          {enEnvoi ? "Envoi…" : envoi.envoye ? "Renvoyer un code" : "Recevoir le code par e-mail"}
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
