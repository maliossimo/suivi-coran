"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { actionRenommerEtablissement, actionSupprimerEtablissement } from "@/app/actions/admin";
import type { EtatSaisie } from "@/app/actions/fiche";
import { confirmationValide } from "@/domain/classe";
import type { EtablissementUsage } from "@/domain/usage";

const JOURS = ["", "lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

/** Un établissement : voir la classe, renommer, supprimer (vide seulement, en retapant son nom). */
export function LigneEtablissement({
  id,
  nom,
  maitres,
  eleves,
  comptes,
  activite,
  classes = [],
}: {
  id: string;
  nom: string;
  maitres: number;
  eleves: number;
  /** Tous les comptes rattachés, archivés compris. */
  comptes: number;
  /** Activité récente (élèves actifs, séances à voir…). */
  activite?: EtablissementUsage;
  /** Classes en cours de l'établissement. */
  classes?: { id: string; nom: string; jours: number[]; cheikhs: { nom: string }[]; nbMembres: number }[];
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
      {activite ? (
        <div className="ligne-etablissement-activite">
          <span className="jauge-activite" aria-hidden="true">
            <span
              style={{
                width: `${eleves ? Math.min(100, Math.round((activite.elevesActifs7j / eleves) * 100)) : 0}%`,
              }}
            />
          </span>
          <span>
            {activite.elevesActifs7j} actif{activite.elevesActifs7j > 1 ? "s" : ""} sur 7 j ·{" "}
            {activite.seances30j} séances en 30 j
          </span>
          {activite.aVoir ? <span className="pastille-etat etat-valide">{activite.aVoir} à voir</span> : null}
          {activite.sansSaisie7j ? (
            <span className="pastille-etat etat-a-ecouter">{activite.sansSaisie7j} sans saisie</span>
          ) : null}
          {activite.sansLecture ? (
            <span className="pastille-etat etat-a-ecouter">{activite.sansLecture} lecture à choisir</span>
          ) : null}
        </div>
      ) : null}
      <div className="classes-etablissement">
        <span className="classes-etablissement-titre">
          {classes.length ? `Classes (${classes.length})` : "Aucune classe pour l’instant"}
        </span>
        {classes.length ? (
          <ul>
            {classes.map((c) => (
              <li key={c.id}>
                <Link href={`/presences/${c.id}`} className="classe-carte">
                  <b>{c.nom}</b>
                  <span>
                    {c.cheikhs.length ? c.cheikhs.map((m) => m.nom).join(", ") : "Sans Cheikh"} ·{" "}
                    {c.nbMembres} élève{c.nbMembres > 1 ? "s" : ""}
                    {c.jours.length ? ` · ${c.jours.map((j) => JOURS[j]).join(", ")}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href={`/presences/nouvelle?etablissement=${id}`} className="lien-discret">
          + Nouvelle classe
        </Link>
      </div>
      <div className="ligne-etablissement-actions">
        <Link href={`/maitre?classe=${id}`} className="lien-discret">
          Voir les élèves
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
