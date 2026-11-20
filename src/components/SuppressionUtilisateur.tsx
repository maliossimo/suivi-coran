"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { actionSupprimerUtilisateur } from "@/app/actions/admin";
import type { EtatSaisie } from "@/app/actions/fiche";
import { Feuille } from "@/components/Feuille";
import { confirmationValide } from "@/domain/classe";
import type { Role } from "@/domain/roles";

/**
 * Admin : supprimer définitivement un élève ou un maître, après avoir retapé
 * son prénom (ou son nom si le prénom est vide).
 */
export function SuppressionUtilisateur({
  id,
  prenom,
  nom,
  role,
}: {
  id: string;
  prenom: string;
  nom: string;
  role: Exclude<Role, "admin">;
}) {
  const [ouverte, setOuverte] = useState(false);
  const idFormulaire = useId();
  const [saisie, setSaisie] = useState("");
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionSupprimerUtilisateur, {});
  const attendu = prenom || nom;
  const valide = confirmationValide(attendu, saisie);
  const champ = `${idFormulaire}-confirmation`;
  const fermer = () => {
    setOuverte(false);
    setSaisie("");
  };

  useEffect(() => {
    if (etat.enregistre) {
      setOuverte(false);
      setSaisie("");
    }
  }, [etat]);

  return (
    <>
      <button type="button" className="lien-action lien-action-danger" onClick={() => setOuverte(true)}>
        Supprimer
      </button>
      <Feuille
        ouverte={ouverte}
        onFermer={fermer}
        titre={`Supprimer ${`${prenom} ${nom}`.trim() || "ce compte"} ?`}
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
          <input type="hidden" name="id" value={id} />
          {role === "eleve" ? (
            <p>
              Le compte de l’élève et <strong>toutes ses données</strong> seront effacés : séances, passages,
              objectifs, bilans et commentaires. <strong>Il n’y a pas de retour possible.</strong>
            </p>
          ) : (
            <p>
              Le compte du Cheikh sera effacé, ainsi que <strong>ses commentaires</strong>. Ses élèves restent
              inscrits dans l’établissement avec tout leur suivi.{" "}
              <strong>Il n’y a pas de retour possible.</strong>
            </p>
          )}
          <div className="champ">
            <label htmlFor={champ}>
              Pour confirmer, tape : <strong>{attendu}</strong>
            </label>
            <input
              id={champ}
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
