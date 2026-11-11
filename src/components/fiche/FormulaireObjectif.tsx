"use client";

import { Check, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { actionEnregistrerObjectif } from "@/app/actions/fiche";
import type { Objectif, StatutObjectif, TypeSeance } from "@/domain/fiche";

const STATUTS: { valeur: StatutObjectif; libelle: string }[] = [
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "atteint", libelle: "Atteint" },
  { valeur: "non_atteint", libelle: "Non atteint" },
];

/**
 * Objectif de la semaine ou du mois. Changer le statut d'un objectif existant
 * s'affiche tout de suite et s'enregistre en arrière-plan (sans attendre le serveur).
 */
export function FormulaireObjectif({
  titre,
  objectif,
  eleveId,
  type,
  mois,
  semaine,
  retour,
}: {
  titre: string;
  objectif: Objectif | null;
  eleveId: string;
  type: TypeSeance;
  mois: string;
  semaine: string;
  retour: string;
}) {
  const [statut, setStatut] = useState<StatutObjectif>(objectif?.statut ?? "en_cours");
  const [enCours, demarrer] = useTransition();
  const formulaire = useRef<HTMLFormElement>(null);
  const id = `objectif-${semaine || "mois"}`;

  function envoyer(donnees: FormData) {
    demarrer(() => actionEnregistrerObjectif(donnees));
  }

  function choisir(valeur: StatutObjectif) {
    setStatut(valeur);
    // Objectif déjà écrit : le nouveau statut part tout de suite.
    if (objectif && formulaire.current) {
      const donnees = new FormData(formulaire.current);
      donnees.set("statut", valeur);
      envoyer(donnees);
    }
  }

  return (
    <form ref={formulaire} action={envoyer} className="objectif" aria-busy={enCours}>
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mois" value={mois} />
      <input type="hidden" name="semaine" value={semaine} />
      <label htmlFor={id} className="objectif-titre">
        {titre}
      </label>
      <input
        id={id}
        name="description"
        defaultValue={objectif?.description ?? ""}
        placeholder="ex. Apprendre Al-Mulk, versets 1 à 15"
        maxLength={300}
        required
      />
      <fieldset className="objectif-statut">
        <legend className="visuellement-cache">Statut</legend>
        {STATUTS.map((s) => (
          <label key={s.valeur} className={`statut statut-${s.valeur}`}>
            <input
              type="radio"
              name="statut"
              value={s.valeur}
              checked={statut === s.valeur}
              onChange={() => choisir(s.valeur)}
            />
            {s.valeur === "atteint" ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : null}
            {s.valeur === "non_atteint" ? <X size={14} strokeWidth={2.6} aria-hidden="true" /> : null}
            {s.libelle}
          </label>
        ))}
      </fieldset>
      <button type="submit" className="bouton-secondaire" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
