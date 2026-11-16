"use client";

import { BookOpenText, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { LIBELLE_ETAT, type EtatSourate } from "@/domain/carte";
import { libelleJourCourt } from "@/domain/fiche";

export interface CaseGrille {
  numero: number;
  nomLatin: string;
  nomAr: string;
  nbVersets: number;
  etat: EtatSourate;
  pourcentage: number;
  derniereActivite: string | null;
  aFaireVoir: boolean;
}

/**
 * Les 114 sourates de la carte : toucher une case ouvre sa fiche juste en dessous
 * (état, part apprise, dernière fois travaillée), avec « Lire » et « Réviser » en un toucher.
 */
export function GrilleCarte({
  cases,
  base,
  aujourdhui,
}: {
  cases: CaseGrille[];
  /** Racine des pages de l'élève : « /eleve » ou « /maitre/eleves/{id} ». */
  base: string;
  aujourdhui: string;
}) {
  const [choisie, setChoisie] = useState<number | null>(null);
  const c = choisie === null ? null : cases.find((x) => x.numero === choisie);

  return (
    <>
      <ol className="carte-grille">
        {cases.map((x, i) => {
          const description = `${x.numero}. ${x.nomLatin} (${x.nomAr}) — ${LIBELLE_ETAT[x.etat]}${
            x.etat === "en_cours" ? `, ${x.pourcentage} %` : ""
          }${x.aFaireVoir ? ", pas encore écouté en entier par le Cheikh" : ""}`;
          return (
            <li
              key={x.numero}
              className={`carte-case carte-${x.etat}${x.aFaireVoir ? " carte-a-voir" : ""}${
                choisie === x.numero ? " est-choisie" : ""
              }`}
              // Les 114 cases apparaissent en vague, d'Al-Fatiha à An-Nas.
              style={{ "--i": i } as CSSProperties}
            >
              <button
                type="button"
                className="carte-case-bouton"
                title={description}
                aria-label={description}
                aria-expanded={choisie === x.numero}
                aria-controls="carte-detail"
                onClick={() => setChoisie(choisie === x.numero ? null : x.numero)}
              >
                <span aria-hidden="true">{x.numero}</span>
              </button>
              {x.etat === "en_cours" ? (
                <span className="carte-jauge" style={{ height: `${x.pourcentage}%` }} aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div id="carte-detail" aria-live="polite">
        {c ? (
          <div className={`carte-detail carte-detail-${c.etat}`} key={c.numero}>
            <div className="carte-detail-tete">
              <span className={`carte-pastille carte-${c.etat}`} aria-hidden="true" />
              <b>
                {c.numero}. {c.nomLatin}
              </b>
              <span className="arabe" lang="ar">
                {c.nomAr}
              </span>
              <button
                type="button"
                className="carte-detail-fermer"
                aria-label="Fermer"
                onClick={() => setChoisie(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="carte-detail-infos">
              <strong>{LIBELLE_ETAT[c.etat]}</strong>
              {c.etat === "vide" ? null : ` · ${c.pourcentage} % de ${c.nbVersets} versets`}
              {c.derniereActivite
                ? ` · dernière fois le ${libelleJourCourt(c.derniereActivite)}`
                : c.etat === "vide"
                  ? ` · ${c.nbVersets} versets`
                  : null}
            </p>
            {c.etat === "vide" ? null : (
              <span className="carte-detail-jauge" aria-hidden="true">
                <span style={{ width: `${c.pourcentage}%` }} />
              </span>
            )}
            {c.aFaireVoir ? (
              <p className="carte-detail-note">Une partie n’a pas encore été écoutée par le Cheikh.</p>
            ) : null}
            <div className="carte-detail-actions">
              {base === "/eleve" ? (
                <Link className="bouton-secondaire" href={`/eleve/coran/lire?sourate=${c.numero}`}>
                  <BookOpenText size={17} aria-hidden="true" />
                  Lire
                </Link>
              ) : null}
              {c.etat === "vide" ? null : (
                <Link
                  className="bouton"
                  href={`${base}/seance?date=${aujourdhui}&type=revision&passage=${c.numero}:1-${c.nbVersets}`}
                >
                  <RotateCcw size={17} aria-hidden="true" />
                  Réviser cette sourate
                </Link>
              )}
            </div>
          </div>
        ) : (
          <p className="carte-detail-aide">Touche une sourate pour voir où tu en es.</p>
        )}
      </div>
    </>
  );
}
