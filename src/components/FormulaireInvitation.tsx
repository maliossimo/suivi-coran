"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { actionInviterEleve, actionInviterMaitre, type EtatInvitation } from "@/app/actions/classe";
import { Selecteur } from "./Selecteur";

/** Invitation d'un élève (par son maître) ou d'un maître (par l'admin). */
export function FormulaireInvitation({
  cible,
  etablissements = [],
  etablissementId,
  classeId,
  classes = [],
}: {
  cible: "eleve" | "maitre";
  etablissements?: { id: string; nom: string }[];
  /** Admin qui invite un élève : la classe choisie en haut de la page. */
  etablissementId?: string;
  /** Cheikh : classe que rejoint l'élève invité. */
  classeId?: string;
  /** Admin qui invite un Cheikh : classes en cours, au choix selon l'établissement. */
  classes?: { id: string; nom: string; etablissementId: string }[];
}) {
  const [etat, action, enCours] = useActionState<EtatInvitation, FormData>(
    cible === "eleve" ? actionInviterEleve : actionInviterMaitre,
    {},
  );
  const formulaire = useRef<HTMLFormElement>(null);
  const [etab, setEtab] = useState("");
  const [classe, setClasse] = useState("");
  const classesEtab = classes.filter((c) => c.etablissementId === etab);

  useEffect(() => {
    if (etat.envoye) {
      formulaire.current?.reset();
      setClasse("");
    }
  }, [etat]);

  return (
    <form ref={formulaire} action={action} className="bloc formulaire" noValidate>
      {etablissementId ? <input type="hidden" name="etablissementId" value={etablissementId} /> : null}
      {classeId ? <input type="hidden" name="classe" value={classeId} /> : null}
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
          Adresse e-mail {cible === "eleve" ? "de l’élève (ou d’un parent)" : "du Cheikh"}
        </label>
        <input id="email" name="email" type="email" autoComplete="off" required />
      </div>
      {cible === "maitre" ? (
        <div className="champ">
          <label htmlFor="etablissementId">Établissement</label>
          <Selecteur
            id="etablissementId"
            titre="Établissement"
            name="etablissementId"
            valeur={etab}
            onChange={(v) => {
              setEtab(v);
              setClasse("");
            }}
            options={etablissements.map((e) => ({ valeur: e.id, libelle: e.nom }))}
          />
        </div>
      ) : null}
      {cible === "maitre" && etab ? (
        <div className="champ">
          <label htmlFor="classe">Classe</label>
          {classesEtab.length ? (
            <Selecteur
              id="classe"
              titre="Classe"
              name="classe"
              valeur={classe}
              onChange={setClasse}
              vide="Aucune classe pour l’instant"
              options={[
                { valeur: "", libelle: "Aucune classe pour l’instant" },
                ...classesEtab.map((c) => ({ valeur: c.id, libelle: c.nom })),
              ]}
            />
          ) : (
            <p className="carte-graphique-sous">
              Pas encore de classe dans cet établissement : crée-la depuis sa carte, plus haut.
            </p>
          )}
        </div>
      ) : null}
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer l’invitation"}
      </button>
    </form>
  );
}
