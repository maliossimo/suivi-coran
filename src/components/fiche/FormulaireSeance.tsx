"use client";

import { ChevronRight } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { Seance, TypeSeance } from "@/domain/fiche";
import { premierChevauchement, type Passage } from "@/domain/versets";
import { actionEnregistrerSeance, type EtatSaisie } from "@/app/actions/fiche";

export interface SourateOption {
  numero: number;
  nomLatin: string;
  nomAr: string;
  nbVersets: number;
}

const PAS = 5;

/** Garde uniquement les chiffres : « 069 » devient 69, un champ vidé vaut 0 (affiché vide). */
function lireNombre(texte: string): number {
  const chiffres = texte.replace(/\D/g, "").slice(0, 4);
  return chiffres ? Number(chiffres) : 0;
}
const DUREES_RAPIDES = [10, 15, 20, 30, 45, 60];

export function FormulaireSeance({
  eleveId,
  retour,
  date,
  type,
  initiale,
  suggestion = null,
  propose = null,
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
  /** Passage proposé (bouton « Réviser ») : ajouté d'office s'il n'est pas déjà saisi. */
  propose?: Passage | null;
  vueMaitre?: boolean;
  sourates: SourateOption[];
  libelleBouton?: string;
}) {
  const [etat, action, enCours] = useActionState<EtatSaisie, FormData>(actionEnregistrerSeance, {});
  const [duree, setDuree] = useState<number>(initiale?.dureeMin ?? 0);
  const [passages, setPassages] = useState<Passage[]>(() => {
    const existants = initiale?.passages ?? [];
    const dejaLa =
      propose &&
      existants.some(
        (p) =>
          p.sourateDebut === propose.sourateDebut &&
          p.versetDebut === propose.versetDebut &&
          p.sourateFin === propose.sourateFin &&
          p.versetFin === propose.versetFin,
      );
    return propose && !dejaLa ? [...existants, propose] : existants;
  });
  const [erreurLocale, setErreurLocale] = useState<string | null>(null);

  const nbVersets = (numero: number) => sourates.find((s) => s.numero === numero)?.nbVersets ?? 1;
  const nomSourate = (numero: number) => sourates.find((s) => s.numero === numero);
  const libelleSuggestion = suggestion
    ? `${nomSourate(suggestion.sourateDebut)?.nomLatin ?? ""} · ${suggestion.versetDebut} → ${suggestion.versetFin}`
    : "";

  function modifier(index: number, champ: Exclude<keyof Passage, "corrige">, valeur: number) {
    setPassages((liste) =>
      liste.map((p, i) => {
        if (i !== index) return p;
        // Un passage modifié n'est plus « vu par le Cheikh ».
        const suivant: Passage = { ...p, [champ]: valeur, corrige: false };
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

  /** Vérifie les passages avant l'envoi : rien n'est perdu, l'élève corrige sur place. */
  function verifier(): string | null {
    for (const [i, p] of passages.entries()) {
      const n = `Passage ${i + 1}`;
      if (!p.versetDebut || !p.versetFin) return `${n} : indique le verset de début et de fin.`;
      if (p.versetDebut > nbVersets(p.sourateDebut))
        return `${n} : la sourate ${nomSourate(p.sourateDebut)?.nomLatin ?? ""} n’a que ${nbVersets(p.sourateDebut)} versets.`;
      if (p.versetFin > nbVersets(p.sourateFin))
        return `${n} : la sourate ${nomSourate(p.sourateFin)?.nomLatin ?? ""} n’a que ${nbVersets(p.sourateFin)} versets.`;
      if (p.sourateFin < p.sourateDebut || (p.sourateFin === p.sourateDebut && p.versetFin < p.versetDebut))
        return `${n} : la fin est avant le début (verset ${p.versetFin} avant le verset ${p.versetDebut}).`;
    }
    const doublon = premierChevauchement(passages);
    if (doublon) {
      return `Les passages ${doublon[0] + 1} et ${doublon[1] + 1} se répètent ou se chevauchent : garde-en un seul.`;
    }
    return null;
  }

  // Envoi manuel : on évite la remise à zéro automatique du formulaire par React,
  // qui ramenait les listes de sourates sur Al-Fatiha et effaçait la note en cas d'erreur.
  function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const probleme = verifier();
    setErreurLocale(probleme);
    if (probleme) {
      const formulaire = e.currentTarget;
      requestAnimationFrame(() =>
        formulaire.querySelector(".message-erreur")?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
      return;
    }
    const donnees = new FormData(e.currentTarget);
    startTransition(() => action(donnees));
  }

  const optionsSourates = sourates.map((s) => (
    <option key={s.numero} value={s.numero}>
      {s.numero}. {s.nomLatin} — {s.nomAr}
    </option>
  ));

  return (
    <form onSubmit={envoyer} className="formulaire seance-formulaire" noValidate>
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="passages" value={JSON.stringify(passages)} />

      {erreurLocale || etat.erreur ? (
        <p className="message-erreur" role="alert">
          {erreurLocale ?? etat.erreur}
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={duree ? String(duree) : ""}
              placeholder="0"
              onChange={(e) => setDuree(Math.min(600, lireNombre(e.target.value)))}
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
            <span className="suggestion-action">
              Ajouter <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        ) : null}
        {passages.length === 0 && !suggestion ? (
          <p className="bloc-vide">Aucun passage pour l’instant.</p>
        ) : null}
        {passages.map((p, i) => (
          <fieldset key={i} className="passage">
            <legend className="visuellement-cache">Passage {i + 1}</legend>
            {initiale?.corrigee ? (
              p.corrige ? (
                <p className="passage-vu">✓ Vu par le Cheikh</p>
              ) : (
                <p className="passage-vu passage-pas-vu">Pas encore vu par le Cheikh</p>
              )
            ) : null}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={p.versetDebut ? String(p.versetDebut) : ""}
                  onChange={(e) => modifier(i, "versetDebut", lireNombre(e.target.value))}
                />
              </label>
              <label className="champ">
                <span>Au verset</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={p.versetFin ? String(p.versetFin) : ""}
                  onChange={(e) => modifier(i, "versetFin", lireNombre(e.target.value))}
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

      {/* Le tajwid n'est plus saisi ; une ancienne valeur est conservée telle quelle. */}
      <input type="hidden" name="tajwid" value={initiale?.tajwid ?? ""} />

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
