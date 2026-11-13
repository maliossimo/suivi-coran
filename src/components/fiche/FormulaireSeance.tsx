"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { EtatCheikh, Seance, TypeSeance } from "@/domain/fiche";
import { dateCourte } from "@/domain/format";
import { premierChevauchement, type Passage } from "@/domain/versets";
import { actionEnregistrerSeanceFond } from "@/app/actions/fiche";
import { ChoixSourate } from "./ChoixSourate";
import { ecrireBrouillon, effacerBrouillon, lireBrouillon, memeSaisie, type Brouillon } from "./brouillon";
import { cleSeance, lireEnAttente, preparerEnvoi } from "./enregistrementsEnAttente";
import { retourSensoriel } from "@/components/retourSensoriel";
import { PastilleCheikh } from "./PastilleCheikh";

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
const DUREES_RAPIDES = [10, 15, 20, 30];

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
  libelleBouton = "Enregistrer",
  replie = false,
  apresPassages = null,
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
  /** Saisie résumée en une ligne, avec un bouton « Modifier » (vue du Cheikh). */
  replie?: boolean;
  /** Affiché entre les passages et la note (le mot du Cheikh, côté élève). */
  apresPassages?: ReactNode;
}) {
  const router = useRouter();
  const cle = cleSeance(eleveId, date, type);
  // Un enregistrement en arrière-plan a échoué ou attend le réseau : on reprend la saisie
  // telle quelle. (En cas de conflit, c'est le brouillon qui la propose, à côté de la version en base.)
  const [reprise] = useState(() => {
    const e = lireEnAttente(cle);
    return (e?.etat === "erreur" && !e.conflit) || e?.etat === "attente" ? e : undefined;
  });
  // La séance telle qu'elle est en base à l'ouverture : la base refusera d'écraser
  // une version modifiée entre-temps (saisie hors ligne, Cheikh, autre téléphone).
  const attendu = initiale
    ? { dureeMin: initiale.dureeMin, noteLibre: initiale.noteLibre, passages: initiale.passages }
    : null;
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Tant que la page n'est pas prête (téléphone lent), le bouton reste inactif :
  // sinon le navigateur enverrait le formulaire « à l'ancienne » et rien ne serait enregistré.
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  const [duree, setDuree] = useState<number>(reprise?.saisie.dureeMin ?? initiale?.dureeMin ?? 0);
  const [passages, setPassages] = useState<Passage[]>(() => {
    if (reprise) return reprise.saisie.passages;
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
  const [note, setNote] = useState<string>(reprise?.saisie.noteLibre ?? initiale?.noteLibre ?? "");
  // Saisie dépliée d'office s'il reste quelque chose à renvoyer.
  const [deplie, setDeplie] = useState(!replie || reprise !== undefined);
  // Durée hors des choix rapides : le compteur s'affiche (« Autre »).
  const [autre, setAutre] = useState(() => duree > 0 && !DUREES_RAPIDES.includes(duree));
  const [noteOuverte, setNoteOuverte] = useState(false);
  const champNote = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (noteOuverte) champNote.current?.focus();
  }, [noteOuverte]);
  // Un seul passage ouvert à la fois ; les autres tiennent sur une ligne.
  const [ouvert, setOuvert] = useState<number | null>(null);

  // Brouillon : ce qui était tapé avant de quitter la page est retrouvé.
  const depart = useRef<Brouillon>({ dureeMin: duree, passages, noteLibre: note });
  const [brouillonCharge, setBrouillonCharge] = useState(false);
  const [brouillonRetrouve, setBrouillonRetrouve] = useState(false);
  useEffect(() => {
    if (!reprise) {
      const b = lireBrouillon(cle);
      if (b && !memeSaisie(b, depart.current)) {
        setDuree(b.dureeMin);
        setPassages(b.passages);
        setNote(b.noteLibre);
        setAutre(b.dureeMin > 0 && !DUREES_RAPIDES.includes(b.dureeMin));
        setBrouillonRetrouve(true);
        setDeplie(true);
      }
    }
    setBrouillonCharge(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, à l'ouverture
  }, []);
  useEffect(() => {
    if (!brouillonCharge) return;
    const saisie = { dureeMin: duree, passages, noteLibre: note };
    if (memeSaisie(saisie, depart.current)) effacerBrouillon(cle);
    else ecrireBrouillon(cle, saisie);
  }, [brouillonCharge, cle, duree, passages, note]);

  function oublierBrouillon() {
    effacerBrouillon(cle);
    setDuree(depart.current.dureeMin);
    setPassages(depart.current.passages);
    setNote(depart.current.noteLibre);
    setOuvert(null);
    setBrouillonRetrouve(false);
  }

  const [erreurLocale, setErreurLocale] = useState<string | null>(
    reprise ? `Séance non enregistrée : ${reprise.erreur ?? "réessaie."}` : null,
  );

  const nbVersets = (numero: number) => sourates.find((s) => s.numero === numero)?.nbVersets ?? 1;
  const nomSourate = (numero: number) => sourates.find((s) => s.numero === numero);
  const libelleSuggestion = suggestion
    ? `${nomSourate(suggestion.sourateDebut)?.nomLatin ?? ""} · ${suggestion.versetDebut} → ${suggestion.versetFin}`
    : "";

  function modifier(index: number, champ: Exclude<keyof Passage, "corrige" | "valide">, valeur: number) {
    setPassages((liste) =>
      liste.map((p, i) => {
        if (i !== index) return p;
        // Un passage modifié n'est plus « écouté » ni « validé » par le Cheikh.
        const suivant: Passage = { ...p, [champ]: valeur, corrige: false, valide: false };
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
    setOuvert(passages.length);
  }

  function retirer(index: number) {
    setPassages((l) => l.filter((_, j) => j !== index));
    setOuvert(null);
  }

  /** « Al-Mulk 1 → 10 » : le passage sur une ligne. */
  function libelleCourt(p: Passage): string {
    const debut = nomSourate(p.sourateDebut)?.nomLatin ?? `Sourate ${p.sourateDebut}`;
    if (p.sourateFin === p.sourateDebut) return `${debut} ${p.versetDebut || "?"} → ${p.versetFin || "?"}`;
    const fin = nomSourate(p.sourateFin)?.nomLatin ?? `Sourate ${p.sourateFin}`;
    return `${debut} ${p.versetDebut || "?"} → ${fin} ${p.versetFin || "?"}`;
  }

  /**
   * Vérifie les passages avant l'envoi : rien n'est perdu, l'élève corrige sur place.
   * Renvoie le message et le passage à rouvrir.
   */
  function verifier(): [string, number | null] | null {
    for (const [i, p] of passages.entries()) {
      const n = `Passage ${i + 1}`;
      if (!p.versetDebut || !p.versetFin) return [`${n} : indique le verset de début et de fin.`, i];
      if (p.versetDebut > nbVersets(p.sourateDebut))
        return [
          `${n} : la sourate ${nomSourate(p.sourateDebut)?.nomLatin ?? ""} n’a que ${nbVersets(p.sourateDebut)} versets.`,
          i,
        ];
      if (p.versetFin > nbVersets(p.sourateFin))
        return [
          `${n} : la sourate ${nomSourate(p.sourateFin)?.nomLatin ?? ""} n’a que ${nbVersets(p.sourateFin)} versets.`,
          i,
        ];
      if (p.sourateFin < p.sourateDebut || (p.sourateFin === p.sourateDebut && p.versetFin < p.versetDebut))
        return [
          `${n} : la fin est avant le début (verset ${p.versetFin} avant le verset ${p.versetDebut}).`,
          i,
        ];
    }
    const doublon = premierChevauchement(passages);
    if (doublon) {
      return [
        `Les passages ${doublon[0] + 1} et ${doublon[1] + 1} se répètent ou se chevauchent : garde-en un seul.`,
        null,
      ];
    }
    return null;
  }

  // Envoi manuel : on évite la remise à zéro automatique du formulaire par React,
  // qui ramenait les listes de sourates sur Al-Fatiha et effaçait la note en cas d'erreur.
  function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const probleme = verifier();
    setErreurLocale(probleme?.[0] ?? null);
    if (probleme) {
      if (probleme[1] !== null) setOuvert(probleme[1]);
      const formulaire = e.currentTarget;
      requestAnimationFrame(() =>
        formulaire.querySelector(".message-erreur")?.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
      return;
    }
    // Enregistrement instantané : retour immédiat sur la fiche (déjà en mémoire),
    // l'envoi continue en arrière-plan ; la ligne du jour affiche « Enregistrement… ».
    const donnees = new FormData(e.currentTarget);
    setEnvoiEnCours(true);
    retourSensoriel();
    // Le brouillon reste jusqu'à la confirmation de la base (voir brouillon.ts).
    ecrireBrouillon(cle, { dureeMin: duree, passages, noteLibre: note }, true, attendu);
    preparerEnvoi(cle, { dureeMin: duree, passages, noteLibre: note }, () =>
      actionEnregistrerSeanceFond(donnees),
    );
    // Sans réseau, la page précédente (déjà chargée) se réaffiche sans rien demander au serveur.
    if (!navigator.onLine && window.history.length > 1) router.back();
    else router.push(retour);
  }

  const etatPassage = (p: Passage): EtatCheikh => (p.valide ? "valide" : p.corrige ? "ecoute" : "partielle");

  if (!deplie) {
    return (
      <section className="seance-resume" aria-label="Saisie de l’élève">
        <div className="seance-resume-texte">
          <small>Saisi par l’élève</small>
          <strong>
            {[duree ? `${duree} min` : null, ...passages.map(libelleCourt)].filter(Boolean).join(" · ") ||
              "Rien de saisi"}
          </strong>
          {note ? <p>« {note} »</p> : null}
        </div>
        <button type="button" className="bouton-doux" onClick={() => setDeplie(true)}>
          Modifier
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={envoyer} className="formulaire seance-formulaire" noValidate>
      {brouillonRetrouve ? (
        <div className="bandeau-brouillon" role="status">
          <span>Brouillon retrouvé : ta saisie précédente n’était pas enregistrée.</span>
          <button type="button" className="bouton-lien" onClick={oublierBrouillon}>
            Effacer
          </button>
        </div>
      ) : null}
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="passages" value={JSON.stringify(passages)} />
      <input type="hidden" name="attendu" value={JSON.stringify(attendu)} />

      {erreurLocale ? (
        <p className="message-erreur" role="alert">
          {erreurLocale}
        </p>
      ) : null}

      <section className="seance-section">
        <h2 className="seance-section-titre">Durée</h2>
        <div className="durees-rapides" role="group" aria-label="Durée">
          {DUREES_RAPIDES.map((m) => (
            <button
              key={m}
              type="button"
              className="duree-rapide"
              aria-pressed={!autre && duree === m}
              onClick={() => {
                setAutre(false);
                setDuree(m);
              }}
            >
              {m} min
            </button>
          ))}
          <button
            type="button"
            className="duree-rapide duree-autre"
            aria-pressed={autre}
            onClick={() => setAutre(true)}
          >
            Autre
          </button>
        </div>
        {autre ? (
          <div className="compteur">
            <button
              type="button"
              className="compteur-bouton"
              aria-label={`Moins ${PAS} minutes`}
              onClick={() => setDuree((d) => Math.max(0, d - PAS))}
            >
              −
            </button>
            <label className="compteur-valeur">
              <span className="visuellement-cache">Durée en minutes</span>
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
              <span aria-hidden="true">min</span>
            </label>
            <button
              type="button"
              className="compteur-bouton"
              aria-label={`Plus ${PAS} minutes`}
              onClick={() => setDuree((d) => Math.min(600, d + PAS))}
            >
              +
            </button>
          </div>
        ) : (
          <input type="hidden" id="dureeMin" name="dureeMin" value={duree ? String(duree) : ""} />
        )}
      </section>

      <section className="seance-section">
        <h2 className="seance-section-titre">
          {type === "revision" ? "Passages révisés" : "Passages appris"}
        </h2>
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
        <div className="liste-passages">
          {passages.map((p, i) =>
            ouvert === i ? (
              <fieldset key={i} className="passage">
                <legend className="visuellement-cache">Passage {i + 1}</legend>
                <div className="passage-ligne">
                  <div className="passage-sourate">
                    <ChoixSourate
                      libelle="Sourate"
                      valeur={p.sourateDebut}
                      sourates={sourates}
                      onChoix={(n) => modifier(i, "sourateDebut", n)}
                    />
                  </div>
                  <button
                    type="button"
                    className="passage-retirer"
                    aria-label={`Retirer le passage ${i + 1}`}
                    onClick={() => retirer(i)}
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
                {/* Cas rare : le passage déborde sur la sourate suivante. Masqué tant qu'il ne sert pas. */}
                {p.sourateFin !== p.sourateDebut ? (
                  <ChoixSourate
                    libelle="Jusqu’à la sourate"
                    valeur={p.sourateFin}
                    sourates={sourates}
                    onChoix={(n) => modifier(i, "sourateFin", n)}
                  />
                ) : p.sourateDebut < 114 ? (
                  <button
                    type="button"
                    className="bouton-lien passage-plusieurs"
                    onClick={() => {
                      modifier(i, "sourateFin", p.sourateDebut + 1);
                      modifier(i, "versetFin", 1);
                    }}
                  >
                    Le passage continue sur la sourate suivante ?
                  </button>
                ) : null}
                <button type="button" className="passage-fermer" onClick={() => setOuvert(null)}>
                  OK
                </button>
              </fieldset>
            ) : (
              <button
                key={i}
                type="button"
                className="passage-resume"
                aria-label={`Modifier le passage ${i + 1} : ${libelleCourt(p)}`}
                onClick={() => setOuvert(i)}
              >
                <span className="passage-resume-nom">
                  {libelleCourt(p)}{" "}
                  <span lang="ar" dir="rtl">
                    {nomSourate(p.sourateDebut)?.nomAr}
                  </span>
                  {p.valide && p.valideLe ? <small>validé le {dateCourte(p.valideLe)}</small> : null}
                </span>
                {/* L'élève voit où en est chaque passage ; le Cheikh a ses boutons au-dessus. */}
                {initiale?.corrigee && !vueMaitre ? <PastilleCheikh etat={etatPassage(p)} /> : null}
                <ChevronDown size={18} aria-hidden="true" className="passage-resume-fleche" />
              </button>
            ),
          )}
          <button type="button" className="passage-ajout" onClick={ajouter} disabled={passages.length >= 20}>
            + Ajouter un passage
          </button>
        </div>
      </section>

      {apresPassages}

      {/* Le tajwid n'est plus saisi ; une ancienne valeur est conservée telle quelle. */}
      <input type="hidden" name="tajwid" value={initiale?.tajwid ?? ""} />

      {noteOuverte || note ? (
        <section className="seance-section">
          <label htmlFor="noteLibre" className="seance-section-titre">
            Note
          </label>
          <textarea
            id="noteLibre"
            name="noteLibre"
            className="champ-texte"
            rows={2}
            value={note}
            ref={champNote}
            onChange={(e) => setNote(e.target.value)}
            placeholder={vueMaitre ? "Difficulté, point à reprendre…" : "Une difficulté, une question…"}
            maxLength={2000}
          />
        </section>
      ) : (
        <>
          <input type="hidden" name="noteLibre" value="" />
          <button type="button" className="bouton-lien note-ajout" onClick={() => setNoteOuverte(true)}>
            + Ajouter une note
          </button>
        </>
      )}

      <div className="barre-enregistrer">
        <button className="bouton" type="submit" disabled={!pret || envoiEnCours}>
          {envoiEnCours ? "Enregistrement…" : libelleBouton}
        </button>
      </div>
    </form>
  );
}
