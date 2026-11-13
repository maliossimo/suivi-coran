"use client";

import { Play, X } from "lucide-react";
import { useState } from "react";
import { Feuille } from "@/components/Feuille";
import { resumeMemoriser, type Passage, type Repetition } from "@/domain/coran";
import { Choix } from "./Controles";

const FOIS_VERSET = [1, 2, 3, 5, 10];
const FOIS_PASSAGE = [1, 2, 3, 5, 0];

/**
 * Feuille « Mémoriser un passage ». Les choix restent un brouillon :
 * rien ne change dans la lecture avant « Écouter ».
 */
interface Proprietes {
  onFermer: () => void;
  nbVersets: number;
  /** Passage proposé à l'ouverture. */
  depart: Passage;
  repetitionDepart: Repetition;
  passageActif: boolean;
  onEcouter: (passage: Passage, repetition: Repetition) => void;
  onEffacer: () => void;
}

export function MemoriserCoran({ ouverte, ...p }: Proprietes & { ouverte: boolean }) {
  // Monté à chaque ouverture : le brouillon repart du passage proposé.
  return ouverte ? <Brouillon {...p} /> : null;
}

function Brouillon({
  onFermer,
  nbVersets,
  depart,
  repetitionDepart,
  passageActif,
  onEcouter,
  onEffacer,
}: Proprietes) {
  const [passage, setPassage] = useState(depart);
  const [repetition, setRepetition] = useState(repetitionDepart);
  const numeros = Array.from({ length: nbVersets }, (_, i) => i + 1);
  const nb = passage.au - passage.du + 1;

  return (
    <Feuille
      ouverte
      onFermer={onFermer}
      titre="Mémoriser un passage"
      pied={
        <>
          {passageActif ? (
            <button type="button" className="bouton-secondaire" onClick={onEffacer}>
              <X size={16} aria-hidden="true" />
              Toute la sourate
            </button>
          ) : null}
          <button type="button" className="bouton" onClick={() => onEcouter(passage, repetition)}>
            <Play size={16} aria-hidden="true" />
            Écouter
          </button>
        </>
      }
    >
      <div className="coran-passage">
        <label className="coran-reglage">
          <span>Du verset</span>
          <select
            value={passage.du}
            onChange={(e) => {
              const du = Number(e.target.value);
              setPassage((p) => ({ du, au: Math.max(du, p.au) }));
            }}
          >
            {numeros.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="coran-reglage">
          <span>Au verset</span>
          <select
            value={passage.au}
            onChange={(e) => {
              const au = Number(e.target.value);
              setPassage((p) => ({ du: Math.min(au, p.du), au }));
            }}
          >
            {numeros.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Choix
        libelle="Répéter chaque verset"
        valeurs={FOIS_VERSET}
        valeur={repetition.verset}
        afficher={(v) => `${v}×`}
        onChange={(v) => setRepetition((r) => ({ ...r, verset: v }))}
      />
      <Choix
        libelle={nb > 1 ? "Puis répéter tout le passage" : "Répéter le tout"}
        valeurs={FOIS_PASSAGE}
        valeur={repetition.passage}
        afficher={(v) => (v === 0 ? "∞" : `${v}×`)}
        onChange={(v) => setRepetition((r) => ({ ...r, passage: v }))}
      />
      <p className="coran-resume-memoriser">{resumeMemoriser(passage, repetition)}</p>
    </Feuille>
  );
}
