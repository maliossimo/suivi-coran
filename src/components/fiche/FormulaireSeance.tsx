"use client";

import { useActionState, useState } from "react";
import type { Seance, TypeSeance } from "@/domain/fiche";
import type { Passage } from "@/domain/versets";
import { actionEnregistrerSeance, type EtatSaisie } from "@/app/actions/fiche";

export interface SourateOption {
  numero: number;
  nomLatin: string;
  nomAr: string;
  nbVersets: number;
}

const PAS = 5;
const DUREES_RAPIDES = [10, 15, 20, 30, 45, 60];

export function FormulaireSeance({
  eleveId,
  retour,
  date,
  type,
  initiale,
  suggestion = null,
  vueMaitre = false,
  sourates,
  libelleBouton = "Enregistrer la séance",
}: {
  eleveId: string;
  retour: string;
  date: string;
  type: TypeSeance;
  initiale: Seance | null;
  suggestion?: Passage | null;
  vueMaitre?: boolean;
  sourates: SourateOption[];
  libelleBouton?: string;
}) {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionEnregistrerSeance, {});
  const [duree, setDuree] = useState<number>(initiale?.dureeMin ?? 0);
  const [passages, setPassages] = useState<Passage[]>(initiale?.passages ?? []);

  const nbVersets = (numero: number) => sourates.find((s) => s.numero === numero)?.nbVersets ?? 1;
  const nomSourate = (numero: number) => sourates.find((s) => s.numero === numero);
  const libelleSuggestion = suggestion
    ? `${nomSourate(suggestion.sourateDebut)?.nomLatin ?? ""} · ${suggestion.versetDebut} → ${suggestion.versetFin}`
    : "";

  function modifier(index: number, champ: keyof Passage, valeur: number) {
    setPassages((liste) =>
      liste.map((p, i) => {
        if (i !== index) return p;
        const suivant = { ...p, [champ]: valeur };
        // Quand on change la sourate de début, la fin suit (cas le plus courant).
        if (champ === "sourateDebut" && p.sourateFin === p.sourateDebut) {
          suivant.sourateFin = valeur;
          suivant.versetDebut = 1;
          suivant.versetFin = nbVersets(valeur);
        }
        return suivant;
      }),
    );
  }

  function ajouter() {
    const derniere = passages.at(-1);
    const numero = derniere ? derniere.sourateFin : 1;
    setPassages((l) => [
      ...l,
      { sourateDebut: numero, versetDebut: 1, sourateFin: numero, versetFin: nbVersets(numero) },
    ]);
  }

  const optionsSourates = sourates.map((s) => (
    <option key={s.numero} value={s.numero}>
      {s.numero}. {s.nomLatin} — {s.nomAr}
    </option>
  ));

  return (
    <form action={action} className="formulaire seance-formulaire" noValidate>
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="passages" value={JSON.stringify(passages)} />

      {etat.erreur ? (
        <p className="message-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}

      <section className="bloc">
        <label htmlFor="dureeMin" className="bloc-titre">
          Durée
        </label>
        <div className="compteur">
          <button
            type="button"
            className="compteur-bouton"
            aria-label={`Moins ${PAS} minutes`}
            onClick={() => setDuree((d) => Math.max(0, d - PAS))}
          >
            −
          </button>
          <div className="compteur-valeur">
            <input
              id="dureeMin"
              name="dureeMin"
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              value={duree}
              onChange={(e) => setDuree(Math.max(0, Math.min(600, Number(e.target.value) || 0)))}
            />
            <span>min</span>
          </div>
          <button
            type="button"
            className="compteur-bouton"
            aria-label={`Plus ${PAS} minutes`}
            onClick={() => setDuree((d) => Math.min(600, d + PAS))}
          >
            +
          </button>
        </div>
        <div className="durees-rapides" role="group" aria-label="Durées rapides">
          {DUREES_RAPIDES.map((m) => (
            <button
              key={m}
              type="button"
              className="duree-rapide"
              aria-pressed={duree === m}
              onClick={() => setDuree(m)}
            >
              {m} min
            </button>
          ))}
        </div>
      </section>

      <section className="bloc">
        <div className="bloc-entete">
          <h2 className="bloc-titre">{type === "revision" ? "Passages révisés" : "Passages appris"}</h2>
        </div>
        {passages.length === 0 && suggestion ? (
          <button type="button" className="suggestion" onClick={() => setPassages([suggestion])}>
            <span className="suggestion-titre">
              {type === "revision"
                ? "Réviser la suite"
                : vueMaitre
                  ? "Suite du dernier passage"
                  : "Continuer là où tu t’étais arrêté"}
            </span>
            <span className="suggestion-passage">
              {libelleSuggestion}{" "}
              <span lang="ar" dir="rtl">
                {nomSourate(suggestion.sourateDebut)?.nomAr}
              </span>
            </span>
            <span className="suggestion-action">Ajouter ›</span>
          </button>
        ) : null}
        {passages.length === 0 && !suggestion ? (
          <p className="bloc-vide">Aucun passage pour l’instant.</p>
        ) : null}
        {passages.map((p, i) => (
          <fieldset key={i} className="passage">
            <legend className="visuellement-cache">Passage {i + 1}</legend>
            <div className="passage-ligne">
              <label className="champ passage-sourate">
                <span>Sourate</span>
                <select
                  value={p.sourateDebut}
                  onChange={(e) => modifier(i, "sourateDebut", Number(e.target.value))}
                >
                  {optionsSourates}
                </select>
              </label>
              <button
                type="button"
                className="passage-retirer"
                aria-label={`Retirer le passage ${i + 1}`}
                onClick={() => setPassages((l) => l.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
            <div className="passage-versets">
              <label className="champ">
                <span>Du verset</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={nbVersets(p.sourateDebut)}
                  value={p.versetDebut}
                  onChange={(e) => modifier(i, "versetDebut", Number(e.target.value))}
                />
              </label>
              <label className="champ">
                <span>Au verset</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={nbVersets(p.sourateFin)}
                  value={p.versetFin}
                  onChange={(e) => modifier(i, "versetFin", Number(e.target.value))}
                />
              </label>
            </div>
            <label className="champ">
              <span>Jusqu’à la sourate</span>
              <select
                value={p.sourateFin}
                onChange={(e) => modifier(i, "sourateFin", Number(e.target.value))}
              >
                {optionsSourates}
              </select>
            </label>
          </fieldset>
        ))}
        <button type="button" className="bouton-ajout" onClick={ajouter} disabled={passages.length >= 20}>
          + Ajouter un passage
        </button>
      </section>

      <section className="bloc">
        <label htmlFor="tajwid" className="bloc-titre">
          Tajwid travaillé <small>(facultatif)</small>
        </label>
        <input
          id="tajwid"
          name="tajwid"
          className="champ-texte"
          defaultValue={initiale?.tajwid ?? ""}
          placeholder="ex. Noun sakin : idhar et idgham"
          maxLength={1000}
        />
      </section>

      <section className="bloc">
        <label htmlFor="noteLibre" className="bloc-titre">
          Note libre <small>(facultatif)</small>
        </label>
        <textarea
          id="noteLibre"
          name="noteLibre"
          className="champ-texte"
          rows={3}
          defaultValue={initiale?.noteLibre ?? ""}
          placeholder={
            vueMaitre
              ? "Remarque sur la séance : difficulté, point à reprendre…"
              : "Ce que tu veux noter : une difficulté, une question…"
          }
          maxLength={2000}
        />
      </section>

      <div className="barre-enregistrer">
        <button className="bouton" type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : libelleBouton}
        </button>
      </div>
    </form>
  );
}
