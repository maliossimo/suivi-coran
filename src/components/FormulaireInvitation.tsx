"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionInviterEleve, actionInviterMaitre, type EtatInvitation } from "@/app/actions/classe";

/** Invitation d'un élève (par son maître) ou d'un maître (par l'admin). */
export function FormulaireInvitation({
  cible,
  etablissements = [],
}: {
  cible: "eleve" | "maitre";
  etablissements?: { id: string; nom: string }[];
}) {
  const [etat, action, enCours] = useActionState<EtatInvitation, FormData>(
    cible === "eleve" ? actionInviterEleve : actionInviterMaitre,
    {},
  );
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.envoye) formulaire.current?.reset();
  }, [etat]);

  return (
    <form ref={formulaire} action={action} className="bloc formulaire" noValidate>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      {etat.envoye ? (
        <p className="message-info" role="status">
          Invitation envoyée à <strong>{etat.envoye}</strong>.
        </p>
      ) : null}
      <div className="champs-duo">
        <div className="champ">
          <label htmlFor="prenom">Prénom</label>
          <input id="prenom" name="prenom" autoComplete="off" maxLength={60} required />
        </div>
        <div className="champ">
          <label htmlFor="nom">Nom</label>
          <input id="nom" name="nom" autoComplete="off" maxLength={60} required />
        </div>
      </div>
      <div className="champ">
        <label htmlFor="email">
          Adresse e-mail {cible === "eleve" ? "de l’élève (ou d’un parent)" : "du maître"}
        </label>
        <input id="email" name="email" type="email" autoComplete="off" required />
      </div>
      {cible === "maitre" ? (
        <div className="champ">
          <label htmlFor="etablissementId">Établissement</label>
          <select
            id="etablissementId"
            name="etablissementId"
            className="champ-select"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choisir…
            </option>
            {etablissements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer l’invitation"}
      </button>
    </form>
  );
}
