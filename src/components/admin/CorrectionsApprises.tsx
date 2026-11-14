"use client";

import { useState, useTransition } from "react";
import { actionRefuserCorrectionTajwid } from "@/app/actions/tajwid";

export interface LigneCorrection {
  lecture: "hafs" | "warsh";
  sourate: number;
  verset: number;
  mot: string;
  regle: string;
  nom: string;
  signalements: number;
  refusee: boolean;
}

/**
 * Ce que la vérification a appris des signalements : ces remarques ne sont plus faites sur ces mots.
 * L'admin peut en refuser une (la remarque revient) ou la rétablir.
 */
export function CorrectionsApprises({ corrections }: { corrections: LigneCorrection[] }) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const basculer = (c: LigneCorrection) =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionRefuserCorrectionTajwid({
        lecture: c.lecture,
        sourate: c.sourate,
        verset: c.verset,
        mot: c.mot,
        regle: c.regle,
        refuser: !c.refusee,
      });
      if (!r.ok) setErreur(r.erreur ?? "Modification impossible.");
    });

  if (corrections.length === 0) {
    return (
      <p className="carte-graphique-sous">
        Rien d’appris pour l’instant : il faut le signalement d’un Cheikh, de l’admin, ou de deux élèves.
      </p>
    );
  }
  return (
    <>
      <p className="carte-graphique-sous">
        Ces remarques ne sont plus faites sur ces mots (signalées par un Cheikh, l’admin ou deux élèves).
      </p>
      <ul className="fil-journal corrections-apprises">
        {corrections.map((c) => (
          <li
            key={`${c.lecture}|${c.sourate}|${c.verset}|${c.mot}|${c.regle}`}
            data-refusee={c.refusee || undefined}
          >
            <span>
              {c.sourate}:{c.verset}{" "}
              <span lang="ar" dir="rtl">
                {c.mot}
              </span>{" "}
              · {c.nom}
              {c.lecture === "warsh" ? " · Warsh" : ""} <small>({c.signalements})</small>
            </span>
            <button
              type="button"
              className="bouton-lien-texte"
              disabled={enCours}
              onClick={() => basculer(c)}
            >
              {c.refusee ? "Rétablir" : "Refuser"}
            </button>
          </li>
        ))}
      </ul>
      {erreur ? (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      ) : null}
    </>
  );
}
