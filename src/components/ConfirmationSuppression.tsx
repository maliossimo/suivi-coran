"use client";

import { useActionState, useRef, useState } from "react";
import { actionSupprimerEleve } from "@/app/actions/classe";
import type { EtatSaisie } from "@/app/actions/fiche";
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
  const fenetre = useRef<HTMLDialogElement>(null);
  const [saisie, setSaisie] = useState("");
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionSupprimerEleve, {});
  const valide = confirmationValide(prenom, saisie);

  return (
    <>
      <button type="button" className="bouton-danger" onClick={() => fenetre.current?.showModal()}>
        Supprimer définitivement
      </button>

      <dialog
        ref={fenetre}
        className="fenetre"
        aria-labelledby="suppression-titre"
        onClose={() => setSaisie("")}
      >
        <form action={action} className="fenetre-contenu">
          <input type="hidden" name="eleveId" value={eleveId} />
          <h2 id="suppression-titre">
            Supprimer {prenom} {nom} ?
          </h2>
          <p>
            Toutes ses données seront <strong>effacées définitivement</strong> : séances, passages, objectifs,
            bilans, commentaires et son compte de connexion. <strong>Il n’y a pas de retour possible.</strong>
          </p>
          <p className="fenetre-note">
            Si l’élève quitte simplement la classe, garde-le archivé : son historique reste consultable.
          </p>

          <div className="champ">
            <label htmlFor="confirmation">
              Pour confirmer, tape son prénom : <strong>{prenom}</strong>
            </label>
            <input
              id="confirmation"
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

          <div className="fenetre-actions">
            <button type="button" className="bouton-secondaire" onClick={() => fenetre.current?.close()}>
              Annuler
            </button>
            <button type="submit" className="bouton-danger" disabled={!valide || enCours}>
              {enCours ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
