"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { actionRenommerEtablissement, actionSupprimerEtablissement } from "@/app/actions/admin";
import type { EtatSaisie } from "@/app/actions/fiche";
import { confirmationValide } from "@/domain/classe";

/** Un établissement : voir la classe, renommer, supprimer (vide seulement, en retapant son nom). */
export function LigneEtablissement({
  id,
  nom,
  maitres,
  eleves,
  comptes,
}: {
  id: string;
  nom: string;
  maitres: number;
  eleves: number;
  /** Tous les comptes rattachés, archivés compris. */
  comptes: number;
}) {
  const [etatNom, renommer, renommage] = useActionState<EtatSaisie, FormData>(
    actionRenommerEtablissement,
    {},
  );
  const [etatSup, supprimer, suppression] = useActionState<EtatSaisie, FormData>(
    actionSupprimerEtablissement,
    {},
  );
  const [confirmation, setConfirmation] = useState("");
  const vide = comptes === 0;

  return (
    <li className="ligne-etablissement">
      <div className="ligne-etablissement-tete">
        <b>{nom}</b>
        <span>
          {maitres} Cheikh{maitres > 1 ? "s" : ""} · {eleves} élève{eleves > 1 ? "s" : ""}
        </span>
      </div>
      <div className="ligne-etablissement-actions">
        <Link href={`/maitre?classe=${id}`} className="lien-discret">
          Voir la classe
        </Link>
        <details>
          <summary className="lien-discret">Renommer</summary>
          <form action={renommer} className="formulaire-ligne">
            <input type="hidden" name="id" value={id} />
            <input name="nom" defaultValue={nom} maxLength={120} required aria-label="Nouveau nom" />
            <button type="submit" className="bouton bouton-auto" disabled={renommage}>
              Enregistrer
            </button>
            {etatNom.erreur ? <p className="message-erreur">{etatNom.erreur}</p> : null}
          </form>
        </details>
        <details>
          <summary className="lien-discret lien-danger">Supprimer</summary>
          {vide ? (
            <form action={supprimer} className="formulaire-ligne">
              <input type="hidden" name="id" value={id} />
              <label className="aide-confirmation">
                Tape <b>{nom}</b> pour confirmer la suppression définitive.
                <input
                  name="confirmation"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                type="submit"
                className="bouton-danger bouton-auto"
                disabled={suppression || !confirmationValide(nom, confirmation)}
              >
                Supprimer l’établissement
              </button>
              {etatSup.erreur ? <p className="message-erreur">{etatSup.erreur}</p> : null}
            </form>
          ) : (
            <p className="aide-confirmation">
              Il reste {comptes} compte{comptes > 1 ? "s" : ""} ici (archivés compris). Déplace-les vers un
              autre établissement (colonne « Établissement » de la liste des utilisateurs) ou supprime-les,
              puis reviens.
            </p>
          )}
        </details>
      </div>
    </li>
  );
}
