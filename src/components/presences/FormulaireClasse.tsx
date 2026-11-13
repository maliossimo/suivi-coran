"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { actionCreerClasse, actionModifierClasse } from "@/app/actions/presences";
import type { EtatSaisie } from "@/app/actions/fiche";
import { JOURS } from "@/domain/presences";

/** Créer ou modifier une classe : nom, jours de cours, Cheikh(s). */
export function FormulaireClasse({
  classe,
  etablissements,
  etablissementId,
  maitres,
}: {
  classe: { id: string; nom: string; jours: number[]; archivee: boolean; cheikhs: string[] } | null;
  etablissements: { id: string; nom: string }[];
  etablissementId: string | null;
  maitres: { id: string; nom: string }[];
}) {
  const router = useRouter();
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(
    classe ? actionModifierClasse : actionCreerClasse,
    {},
  );

  return (
    <form action={action} className="formulaire" noValidate>
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      {classe ? <input type="hidden" name="id" value={classe.id} /> : null}
      {!classe ? (
        <div className="champ">
          <label htmlFor="etablissement">Établissement</label>
          <select
            id="etablissement"
            name="etablissement"
            defaultValue={etablissementId ?? ""}
            onChange={(e) => router.replace(`/presences/nouvelle?etablissement=${e.target.value}`)}
          >
            {etablissements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="champ">
        <label htmlFor="nom">Nom de la classe</label>
        <input
          id="nom"
          name="nom"
          maxLength={60}
          placeholder="Coran, Fiqh…"
          defaultValue={classe?.nom ?? ""}
          required
        />
      </div>
      <fieldset className="champ choix-jours">
        <legend>Jours de cours</legend>
        <div>
          {JOURS.map((j) => (
            <label key={j.n}>
              <input type="checkbox" name="jours" value={j.n} defaultChecked={classe?.jours.includes(j.n)} />
              <span>{j.court}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="champ choix-cheikhs">
        <legend>Cheikh{maitres.length > 1 ? "s" : ""} de la classe</legend>
        {maitres.length ? (
          maitres.map((m) => (
            <label key={m.id}>
              <input
                type="checkbox"
                name="cheikhs"
                value={m.id}
                defaultChecked={classe ? classe.cheikhs.includes(m.id) : maitres.length === 1}
              />
              <span>{m.nom}</span>
            </label>
          ))
        ) : (
          <small>Aucun Cheikh dans cet établissement pour l’instant.</small>
        )}
      </fieldset>
      {classe ? (
        <label className="case-a-cocher">
          <input type="checkbox" name="archivee" defaultChecked={classe.archivee} />
          <span>Classe terminée (archivée)</span>
        </label>
      ) : null}
      <button className="bouton" type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : classe ? "Enregistrer" : "Créer la classe"}
      </button>
    </form>
  );
}
