"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { actionCommenter, type EtatSaisie } from "@/app/actions/fiche";

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
  /** Le commentaire s'affiche tout de suite, avant même la réponse du serveur. */
  const [enEnvoi, setEnEnvoi] = useState<string | null>(null);

  useEffect(() => {
    if (enCours) return;
    if (etat.erreur) {
      // Échec : le texte revient dans le champ, rien n'est perdu.
      const champ = formulaire.current?.elements.namedItem("texte");
      if (enEnvoi && champ instanceof HTMLTextAreaElement && !champ.value) champ.value = enEnvoi;
    }
    setEnEnvoi(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement à la fin d'un envoi
  }, [enCours, etat]);

  return (
    <form
      ref={formulaire}
      action={action}
      onSubmit={(e) => {
        const texte = new FormData(e.currentTarget).get("texte");
        if (typeof texte === "string" && texte.trim()) {
          setEnEnvoi(texte.trim());
          // Vidé après la lecture du formulaire par l'action (au tour suivant).
          setTimeout(() => {
            const champ = formulaire.current?.elements.namedItem("texte");
            if (champ instanceof HTMLTextAreaElement) champ.value = "";
          }, 0);
        }
      }}
      className="bloc bloc-commentaire"
    >
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="cible" value={cible} />
      <input type="hidden" name="cibleId" value={cibleId} />
      <label htmlFor={id} className="bloc-titre">
        Commentaire
      </label>
      {enEnvoi ? (
        <p className="commentaire-en-envoi" aria-live="polite">
          <span>{enEnvoi}</span>
          <small>envoi…</small>
        </p>
      ) : null}
      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <textarea
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
        Envoyer à l’élève
      </button>
    </form>
  );
}
