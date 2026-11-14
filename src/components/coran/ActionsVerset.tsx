"use client";

import { Bookmark, BookOpenText, Play, Repeat, Repeat1, Settings2 } from "lucide-react";
import { Feuille } from "@/components/Feuille";
import type { EtatExplication } from "./explications";
import { ReciterVerset } from "./ReciterVerset";
import { VerifierRecitation } from "./VerifierRecitation";

export type ModeVerset = "actions" | "explication";

/**
 * Un verset touché : ce qu'on peut en faire (écouter, répéter, mémoriser, marque-page,
 * se réciter). Appui long : son explication en français, directement.
 */
export function ActionsVerset({
  cle,
  mode,
  onMode,
  onFermer,
  lecture,
  suivi,
  memorisation,
  explication,
  marque,
  adresseRecitateur,
  texteVerset,
  onEcouter,
  onRepeter,
  onMemoriser,
  onMarque,
  onReglages,
  onAvantEnregistrement,
}: {
  /** « sourate:verset » ; null : feuille fermée. */
  cle: string | null;
  mode: ModeVerset;
  onMode: (mode: ModeVerset) => void;
  onFermer: () => void;
  lecture: string;
  /** Le récitateur suit le texte verset par verset. */
  suivi: boolean;
  /** Vue sourate : répéter et mémoriser sont possibles. */
  memorisation: boolean;
  explication: EtatExplication | null;
  marque: boolean;
  /** Fichier du récitateur pour ce verset (comparer sa récitation). */
  adresseRecitateur: string | null;
  /** Texte du verset choisi (vérifier sa récitation mot à mot). */
  texteVerset: string | null;
  onEcouter: (cle: string) => void;
  onRepeter: (cle: string) => void;
  onMemoriser: (cle: string) => void;
  onMarque: (cle: string) => void;
  onReglages: () => void;
  onAvantEnregistrement: () => void;
}) {
  const verset = cle ? Number(cle.split(":")[1]) : 0;
  return (
    <Feuille ouverte={cle !== null} onFermer={onFermer} titre={verset ? `Verset ${verset}` : "Basmala"}>
      {cle ? (
        <>
          <div className="actions-verset-rapides">
            {suivi ? (
              <button type="button" onClick={() => onEcouter(cle)}>
                <Play size={20} aria-hidden="true" />
                <span>Écouter d’ici</span>
              </button>
            ) : null}
            {suivi && memorisation && verset ? (
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
            {verset ? (
              <>
                <button
                  type="button"
                  aria-pressed={mode === "explication"}
                  onClick={() => onMode(mode === "explication" ? "actions" : "explication")}
                >
                  <BookOpenText size={20} aria-hidden="true" />
                  <span>Explication</span>
                </button>
                <button
                  type="button"
                  aria-pressed={marque}
                  className={marque ? "marque" : undefined}
                  onClick={() => onMarque(cle)}
                >
                  <Bookmark size={20} aria-hidden="true" />
                  <span>{marque ? "Marqué" : "Marque-page"}</span>
                </button>
              </>
            ) : null}
            {!suivi ? (
              <button type="button" onClick={onReglages}>
                <Settings2 size={20} aria-hidden="true" />
                <span>Récitateur verset par verset</span>
              </button>
            ) : null}
          </div>

          {mode === "explication" && explication ? <Explication etat={explication} /> : null}
          {mode === "actions" && verset ? (
            <ReciterVerset
              key={cle}
              lecture={lecture}
              cle={cle}
              adresseRecitateur={adresseRecitateur}
              onAvantEnregistrement={onAvantEnregistrement}
            />
          ) : null}
          {mode === "actions" && verset && texteVerset ? (
            <VerifierRecitation
              key={cle}
              sourate={Number(cle.split(":")[0])}
              verset={verset}
              lecture={lecture === "warsh" ? "warsh" : "hafs"}
              texteVerset={texteVerset}
              onAvantEcoute={onAvantEnregistrement}
            />
          ) : null}
        </>
      ) : null}
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
