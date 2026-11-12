"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { rechercherSourates } from "@/domain/recherche";
import { isolerArabe } from "@/domain/versets";

export interface SourateChoix {
  numero: number;
  nomLatin: string;
  nomAr: string;
}

/**
 * Choix d'une sourate avec recherche : on tape « baq », « 2 » ou « بقرة »
 * au lieu de faire défiler 114 lignes. Ouvre un panneau plein écran sur mobile.
 */
export function ChoixSourate({
  libelle,
  valeur,
  sourates,
  onChoix,
}: {
  libelle: string;
  valeur: number;
  sourates: readonly SourateChoix[];
  onChoix: (numero: number) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const dialogue = useRef<HTMLDialogElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const idListe = useId();
  const actuelle = sourates.find((s) => s.numero === valeur);
  const resultats = useMemo(() => rechercherSourates(sourates, texte), [sourates, texte]);

  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouvert && !d.open) {
      d.showModal();
      // La sourate actuelle est visible à l'ouverture, le champ de recherche prêt.
      d.querySelector(`[data-numero="${valeur}"]`)?.scrollIntoView({ block: "center" });
      champ.current?.focus();
    } else if (!ouvert && d.open) {
      d.close();
    }
  }, [ouvert, valeur]);

  function choisir(numero: number) {
    onChoix(numero);
    setOuvert(false);
    setTexte("");
  }

  return (
    <div className="champ choix-sourate">
      <span>{libelle}</span>
      <button
        type="button"
        className="choix-sourate-bouton"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
      >
        <span className="choix-sourate-texte">
          {actuelle ? (
            <>
              {actuelle.numero}. {actuelle.nomLatin} —{" "}
              <span className="arabe" lang="ar">
                {isolerArabe(actuelle.nomAr)}
              </span>
            </>
          ) : (
            "Choisir une sourate"
          )}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      <dialog
        ref={dialogue}
        className="choix-sourate-panneau"
        aria-label={libelle}
        onClose={() => {
          setOuvert(false);
          setTexte("");
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOuvert(false); // clic sur le fond
        }}
      >
        <div className="choix-sourate-entete">
          <label className="choix-sourate-recherche">
            <Search size={18} aria-hidden="true" />
            <input
              ref={champ}
              type="search"
              inputMode="search"
              autoComplete="off"
              enterKeyHint="go"
              placeholder="Nom ou numéro : baq, 2, بقرة…"
              aria-controls={idListe}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (resultats[0]) choisir(resultats[0].numero);
                }
              }}
            />
          </label>
          <button
            type="button"
            className="choix-sourate-fermer"
            onClick={() => setOuvert(false)}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <ul id={idListe} className="choix-sourate-liste" role="listbox" aria-label="Sourates">
          {resultats.map((s) => (
            <li key={s.numero}>
              <button
                type="button"
                role="option"
                aria-selected={s.numero === valeur}
                data-numero={s.numero}
                className={s.numero === valeur ? "choix-sourate-option actuelle" : "choix-sourate-option"}
                onClick={() => choisir(s.numero)}
              >
                <span className="choix-sourate-numero">{s.numero}</span>
                <span className="choix-sourate-nom">{s.nomLatin}</span>
                <span className="arabe" lang="ar">
                  {isolerArabe(s.nomAr)}
                </span>
              </button>
            </li>
          ))}
          {resultats.length === 0 ? (
            <li className="choix-sourate-vide">Aucune sourate ne correspond.</li>
          ) : null}
        </ul>
      </dialog>
    </div>
  );
}
