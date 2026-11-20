"use client";

import { useActionState, useId, useState } from "react";
import { actionSupprimerEleve } from "@/app/actions/classe";
import type { EtatSaisie } from "@/app/actions/fiche";
import { Feuille } from "@/components/Feuille";
import { confirmationValide } from "@/domain/classe";

/**
 * Bouton « Supprimer définitivement » (élève archivé uniquement) et sa fenêtre
 * de confirmation : il faut retaper le prénom de l'élève pour activer le bouton.
 */
export function ConfirmationSuppression({
  eleveId,
  prenom,
  nom,
}: {
  eleveId: string;
  prenom: string;
  nom: string;
}) {
  const [ouverte, setOuverte] = useState(false);
  const idFormulaire = useId();
  const [saisie, setSaisie] = useState("");
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionSupprimerEleve, {});
  const valide = confirmationValide(prenom, saisie);

  const fermer = () => {
    setOuverte(false);
    setSaisie("");
  };

  return (
    <>
      <button type="button" className="bouton-danger" onClick={() => setOuverte(true)}>
        Supprimer définitivement
      </button>

      <Feuille
        ouverte={ouverte}
        onFermer={fermer}
        titre={`Supprimer ${prenom} ${nom} ?`}
        pied={
          <div className="fenetre-actions">
            <button type="button" className="bouton-secondaire" onClick={fermer}>
              Annuler
            </button>
            <button type="submit" form={idFormulaire} className="bouton-danger" disabled={!valide || enCours}>
              {enCours ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        }
      >
        <form id={idFormulaire} action={action} className="fenetre-contenu">
          <input type="hidden" name="eleveId" value={eleveId} />
          <p>
            Toutes ses données seront <strong>effacées définitivement</strong> : séances, passages, objectifs,
            bilans, commentaires et son compte de connexion. <strong>Il n’y a pas de retour possible.</strong>
          </p>
          <p className="fenetre-note">
            Si l’élève quitte simplement la classe, garde-le archivé : son historique reste consultable.
          </p>

          <div className="champ">
            <label htmlFor={`${idFormulaire}-confirmation`}>
              Pour confirmer, tape son prénom : <strong>{prenom}</strong>
            </label>
            <input
              id={`${idFormulaire}-confirmation`}
              name="confirmation"
              autoComplete="off"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
            />
          </div>

          {etat.erreur ? (
            <p className="message-erreur" role="alert">
              {etat.erreur}
            </p>
          ) : null}
        </form>
      </Feuille>
    </>
  );
}
