"use client";

import { Play, Repeat, Repeat1, Settings2 } from "lucide-react";
import { Feuille } from "@/components/Feuille";

/**
 * Ce qu'on peut faire d'un verset touché : l'écouter à partir de là,
 * le répéter en boucle ou commencer à mémoriser à partir de lui.
 */
export function ActionsVerset({
  cle,
  onFermer,
  suivi,
  memorisation,
  onEcouter,
  onRepeter,
  onMemoriser,
  onReglages,
}: {
  /** « sourate:verset » ; null : feuille fermée. */
  cle: string | null;
  onFermer: () => void;
  /** Le récitateur suit le texte verset par verset. */
  suivi: boolean;
  /** Vue sourate : répéter et mémoriser sont possibles. */
  memorisation: boolean;
  onEcouter: (cle: string) => void;
  onRepeter: (cle: string) => void;
  onMemoriser: (cle: string) => void;
  onReglages: () => void;
}) {
  const verset = cle ? Number(cle.split(":")[1]) : 0;
  return (
    <Feuille ouverte={cle !== null} onFermer={onFermer} titre={verset ? `Verset ${verset}` : "Basmala"}>
      {suivi && cle ? (
        <div className="actions-verset">
          <button type="button" onClick={() => onEcouter(cle)}>
            <Play size={20} aria-hidden="true" />
            <span>
              <b>Écouter à partir d’ici</b>
              <small>La récitation continue jusqu’à la fin.</small>
            </span>
          </button>
          {memorisation && verset ? (
            <>
              <button type="button" onClick={() => onRepeter(cle)}>
                <Repeat1 size={20} aria-hidden="true" />
                <span>
                  <b>Répéter ce verset en boucle</b>
                  <small>Pour l’apprendre par cœur. Pause pour arrêter.</small>
                </span>
              </button>
              <button type="button" onClick={() => onMemoriser(cle)}>
                <Repeat size={20} aria-hidden="true" />
                <span>
                  <b>Mémoriser à partir d’ici…</b>
                  <small>Choisir les versets et le nombre de répétitions.</small>
                </span>
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="actions-verset">
          <p className="carte-graphique-sous">
            Ce récitateur lit la sourate d’un seul tenant : le texte ne suit pas et on ne peut pas partir d’un
            verset. Choisis un récitateur « le texte suit la récitation ».
          </p>
          <button type="button" onClick={onReglages}>
            <Settings2 size={20} aria-hidden="true" />
            <span>
              <b>Changer de récitateur</b>
            </span>
          </button>
        </div>
      )}
    </Feuille>
  );
}
