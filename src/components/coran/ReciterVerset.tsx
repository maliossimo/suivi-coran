"use client";

import { Mic, Play, Square, Trash2, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { enregistrementPossible, useVoix } from "./voix";

/**
 * « Me réciter » : l'élève s'enregistre sur un verset, puis écoute le récitateur
 * et sa propre voix à la suite pour comparer. Tout reste sur le téléphone.
 */
export function ReciterVerset({
  lecture,
  cle,
  adresseRecitateur,
  onAvantEnregistrement,
}: {
  lecture: string;
  cle: string;
  adresseRecitateur: string | null;
  /** Met la récitation en pause avant d'ouvrir le micro. */
  onAvantEnregistrement: () => void;
}) {
  const v = useVoix(lecture, cle);
  const [possible, setPossible] = useState(false);
  useEffect(() => setPossible(enregistrementPossible()), []);
  const duree = useDuree(v.etat === "enregistrement" ? v.debut : null);

  if (!possible) return null;
  return (
    <section className="reciter-verset" aria-label="Me réciter">
      <h3>
        <Mic size={16} aria-hidden="true" />
        Me réciter
      </h3>
      {v.etat === "enregistrement" ? (
        <button type="button" className="reciter-bouton enregistre" onClick={v.arreter}>
          <Square size={18} aria-hidden="true" />
          <span>Arrêter · {duree}</span>
        </button>
      ) : (
        <div className="reciter-ligne">
          <button
            type="button"
            className="reciter-bouton"
            disabled={v.etat === "autorisation"}
            onClick={() => {
              onAvantEnregistrement();
              void v.commencer();
            }}
          >
            <Mic size={18} aria-hidden="true" />
            <span>{v.voix ? "Recommencer" : "M’enregistrer"}</span>
          </button>
          {v.voix ? (
            <>
              {adresseRecitateur ? (
                <button
                  type="button"
                  className="reciter-bouton principal"
                  onClick={() =>
                    v.etat === "lecture" ? v.arreterLecture() : v.jouer([adresseRecitateur, v.voix!])
                  }
                >
                  {v.etat === "lecture" ? (
                    <Square size={18} aria-hidden="true" />
                  ) : (
                    <Volume2 size={18} aria-hidden="true" />
                  )}
                  <span>{v.etat === "lecture" ? "Arrêter" : "Comparer"}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="reciter-bouton"
                onClick={() => v.jouer([v.voix!])}
                aria-label="Écouter ma voix"
              >
                <Play size={18} aria-hidden="true" />
                <span>Ma voix</span>
              </button>
              <button
                type="button"
                className="reciter-bouton discret"
                onClick={() => void v.effacer()}
                aria-label="Effacer mon enregistrement"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      )}
      {v.erreur ? <p className="reciter-erreur">{v.erreur}</p> : null}
      <p className="reciter-aide">
        {v.voix
          ? adresseRecitateur
            ? "« Comparer » fait entendre le récitateur puis ta voix."
            : "Choisis un récitateur verset par verset pour comparer."
          : "Récite le verset de mémoire : ton enregistrement reste sur ce téléphone."}
      </p>
    </section>
  );
}

/** « 0:07 » depuis `debut`, mis à jour chaque seconde. */
function useDuree(debut: number | null): string {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    if (debut === null) return;
    const id = setInterval(() => setMaintenant(Date.now()), 500);
    return () => clearInterval(id);
  }, [debut]);
  const s = debut === null ? 0 : Math.max(0, Math.floor((maintenant - debut) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
