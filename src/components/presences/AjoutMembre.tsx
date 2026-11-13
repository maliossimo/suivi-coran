"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { actionAjouterMembre } from "@/app/actions/presences";
import type { EtatSaisie } from "@/app/actions/fiche";
import { Selecteur } from "@/components/Selecteur";

/** Ajouter un élève : un élève de l'appli, ou seulement un nom (élève sans compte). */
export function AjoutMembre({
  classeId,
  eleves,
}: {
  classeId: string;
  eleves: { id: string; nom: string }[];
}) {
  const [mode, setMode] = useState<"nom" | "compte">(eleves.length ? "compte" : "nom");
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionAjouterMembre, {});
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (etat.enregistre) formulaire.current?.reset();
  }, [etat]);

  return (
    <form ref={formulaire} action={action} className="formulaire ajout-membre" noValidate>
      <input type="hidden" name="classe" value={classeId} />
      {eleves.length ? (
        <div className="coran-choix-ligne" role="group" aria-label="Type d’élève">
          <button type="button" aria-pressed={mode === "compte"} onClick={() => setMode("compte")}>
            Élève de l’appli
          </button>
          <button type="button" aria-pressed={mode === "nom"} onClick={() => setMode("nom")}>
            Sans compte
          </button>
        </div>
      ) : null}
      {mode === "compte" ? (
        <div className="champ">
          <label htmlFor="eleve">Élève</label>
          <Selecteur
            // Remonté quand la liste change : l'élève ajouté n'y est plus.
            key={eleves.map((e) => e.id).join()}
            id="eleve"
            titre="Élève"
            name="eleve"
            defaultValue={eleves[0]?.id ?? ""}
            options={eleves.map((e) => ({ valeur: e.id, libelle: e.nom }))}
            placeholderRecherche="Prénom ou nom"
          />
        </div>
      ) : (
        <div className="ajout-membre-noms">
          <div className="champ">
            <label htmlFor="prenom">Prénom</label>
            <input id="prenom" name="prenom" maxLength={60} required autoComplete="off" />
          </div>
          <div className="champ">
            <label htmlFor="nom-membre">Nom (facultatif)</label>
            <input id="nom-membre" name="nom" maxLength={60} autoComplete="off" />
          </div>
        </div>
      )}
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <button className="bouton-secondaire" type="submit" disabled={enCours}>
        {enCours ? "Ajout…" : "+ Ajouter à la classe"}
      </button>
    </form>
  );
}
