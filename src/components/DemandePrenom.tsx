"use client";

import { useEffect, useState, useTransition } from "react";
import { actionMonNom } from "@/app/actions/compte";
import { Feuille } from "./Feuille";

const CLE = "prenom-demande-plus-tard";

/**
 * Le compte n'a pas de prénom (« Sans nom » dans le journal) : on le demande une fois.
 * « Plus tard » ne le redemande plus sur cet appareil.
 */
export function DemandePrenom() {
  const [ouverte, setOuverte] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    try {
      if (localStorage.getItem(CLE) === "1") return;
    } catch {
      // stockage indisponible : on demande
    }
    const t = setTimeout(() => setOuverte(true), 800);
    return () => clearTimeout(t);
  }, []);

  const plusTard = () => {
    try {
      localStorage.setItem(CLE, "1");
    } catch {
      // sans stockage : redemandé à la prochaine ouverture
    }
    setOuverte(false);
  };

  return (
    <Feuille ouverte={ouverte} titre="Comment t’appelles-tu ?" onFermer={plusTard}>
      <form
        className="formulaire demande-prenom"
        onSubmit={(e) => {
          e.preventDefault();
          demarrer(async () => {
            setErreur(null);
            const r = await actionMonNom({ prenom, nom });
            if (r.ok) setOuverte(false);
            else setErreur(r.erreur ?? "Enregistrement impossible.");
          });
        }}
      >
        <p className="carte-graphique-sous">Ton nom s’affiche dans l’appli à la place de « Sans nom ».</p>
        <label>
          Prénom
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            autoComplete="given-name"
            maxLength={60}
            required
          />
        </label>
        <label>
          Nom <small>(facultatif)</small>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoComplete="family-name"
            maxLength={60}
          />
        </label>
        {erreur ? (
          <p role="alert" className="message-erreur">
            {erreur}
          </p>
        ) : null}
        <div className="demande-prenom-actions">
          <button type="button" className="bouton-secondaire" onClick={plusTard}>
            Plus tard
          </button>
          <button type="submit" className="bouton" disabled={enCours || !prenom.trim()}>
            Enregistrer
          </button>
        </div>
      </form>
    </Feuille>
  );
}
