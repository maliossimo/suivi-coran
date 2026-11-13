"use client";

import { useActionState, useEffect, useRef } from "react";
import { actionCommenter, type EtatSaisie } from "@/app/actions/fiche";

/** Mots tout prêts : un toucher les ajoute au commentaire. */
const PHRASES = ["Très bien, continue ainsi.", "Revois les madd.", "Récite plus lentement.", "À reprendre."];

/** Commentaire du maître sur une séance ou un bilan (visible par l'élève). */
export function FormulaireCommentaire({
  eleveId,
  cible,
  cibleId,
}: {
  eleveId: string;
  cible: "seance" | "bilan";
  cibleId: string;
}) {
  const id = `texte-${cible}`;
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionCommenter, {});
  const formulaire = useRef<HTMLFormElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  function ajouterPhrase(phrase: string) {
    const zone = champ.current;
    if (!zone) return;
    zone.value = zone.value.trim() ? `${zone.value.trim()} ${phrase}` : phrase;
    zone.focus();
  }

  useEffect(() => {
    if (!enCours && !etat.erreur) formulaire.current?.reset();
  }, [enCours, etat]);

  return (
    <form ref={formulaire} action={action} className="bloc bloc-commentaire">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="cible" value={cible} />
      <input type="hidden" name="cibleId" value={cibleId} />
      <label htmlFor={id} className="bloc-titre">
        Commentaire
      </label>
      {cible === "seance" ? (
        <div className="phrases-rapides" role="group" aria-label="Phrases toutes prêtes">
          {PHRASES.map((p) => (
            <button key={p} type="button" className="phrase-rapide" onClick={() => ajouterPhrase(p)}>
              {p}
            </button>
          ))}
        </div>
      ) : null}
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <textarea
        ref={champ}
        id={id}
        name="texte"
        className="champ-texte"
        rows={2}
        maxLength={1000}
        placeholder="Un mot pour l’élève…"
        required
      />
      <button
        type="submit"
        className={cible === "seance" ? "bouton" : "bouton-secondaire"}
        disabled={enCours}
      >
        {enCours ? "Envoi…" : "Envoyer à l’élève"}
      </button>
    </form>
  );
}
