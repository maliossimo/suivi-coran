"use client";

import { BookOpenText, Play, Repeat, Repeat1, Settings2 } from "lucide-react";
import { Feuille } from "@/components/Feuille";
import type { EtatExplication } from "./explications";

/**
 * Un verset touché : son explication en français, et ce qu'on peut en faire
 * (l'écouter à partir de là, le répéter en boucle, mémoriser à partir de lui).
 */
export function ActionsVerset({
  cle,
  onFermer,
  suivi,
  memorisation,
  explication,
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
  explication: EtatExplication | null;
  onEcouter: (cle: string) => void;
  onRepeter: (cle: string) => void;
  onMemoriser: (cle: string) => void;
  onReglages: () => void;
}) {
  const verset = cle ? Number(cle.split(":")[1]) : 0;
  return (
    <Feuille ouverte={cle !== null} onFermer={onFermer} titre={verset ? `Verset ${verset}` : "Basmala"}>
      {cle && suivi ? (
        <div className="actions-verset-rapides">
          <button type="button" onClick={() => onEcouter(cle)}>
            <Play size={20} aria-hidden="true" />
            <span>Écouter d’ici</span>
          </button>
          {memorisation && verset ? (
            <>
              <button type="button" onClick={() => onRepeter(cle)}>
                <Repeat1 size={20} aria-hidden="true" />
                <span>En boucle</span>
              </button>
              <button type="button" onClick={() => onMemoriser(cle)}>
                <Repeat size={20} aria-hidden="true" />
                <span>Mémoriser…</span>
              </button>
            </>
          ) : null}
        </div>
      ) : cle ? (
        <div className="actions-verset-rapides">
          <button type="button" onClick={onReglages}>
            <Settings2 size={20} aria-hidden="true" />
            <span>Récitateur verset par verset</span>
          </button>
        </div>
      ) : null}

      {explication ? <Explication etat={explication} /> : null}
    </Feuille>
  );
}

function Explication({ etat }: { etat: EtatExplication }) {
  return (
    <section className="explication-verset" aria-live="polite">
      <h3>
        <BookOpenText size={16} aria-hidden="true" />
        Explication
      </h3>
      {etat.etat === "chargement" ? (
        <div className="explication-attente" aria-label="Chargement de l’explication">
          <span />
          <span />
          <span />
        </div>
      ) : etat.etat === "erreur" ? (
        <p className="carte-graphique-sous">
          Explication indisponible pour l’instant (pas de réseau ?). Elle est gardée sur le téléphone dès
          qu’elle a été lue une fois.
        </p>
      ) : etat.versets.length === 0 ? (
        <p className="carte-graphique-sous">Pas d’explication pour ce verset.</p>
      ) : (
        <>
          {etat.versets.map((v, i) => (
            <div key={i} className="explication-texte">
              <p>{v.texte}</p>
              {v.notes ? <p className="explication-notes">{v.notes}</p> : null}
            </div>
          ))}
          <p className="explication-source">
            {etat.source.titre} ·{" "}
            <a href={etat.source.lien} target="_blank" rel="noopener noreferrer">
              {etat.source.editeur}
            </a>
            {etat.source.version ? ` · version ${etat.source.version}` : ""}
          </p>
        </>
      )}
    </section>
  );
}
