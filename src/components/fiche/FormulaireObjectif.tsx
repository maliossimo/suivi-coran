"use client";

import { Check, Clock, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { actionEnregistrerObjectif } from "@/app/actions/fiche";
import { ContenuBoutonEnregistrer } from "@/components/ContenuBoutonEnregistrer";
import type { Objectif, StatutObjectif, TypeSeance } from "@/domain/fiche";

const STATUTS: { valeur: StatutObjectif; libelle: string }[] = [
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "atteint", libelle: "Atteint" },
  { valeur: "non_atteint", libelle: "Non atteint" },
];

const LONGUEUR_MAX = 300;
/** À partir de là, un compteur « 245/300 » apparaît. */
const SEUIL_COMPTEUR = 240;

/**
 * Objectif de la semaine ou du mois. Le texte s'écrit dans une zone qui grandit avec lui (rien n'est
 * coupé) et s'enregistre tout seul en quittant le champ ; changer le statut d'un objectif existant
 * s'affiche tout de suite et s'enregistre en arrière-plan (sans attendre le serveur).
 */
export function FormulaireObjectif({
  titre,
  objectif,
  eleveId,
  type,
  mois,
  semaine,
  retour,
  titreVisible = true,
}: {
  titre: string;
  /** Faux quand un titre identique est déjà affiché juste au-dessus (le libellé reste lu par les lecteurs d'écran). */
  titreVisible?: boolean;
  objectif: Objectif | null;
  eleveId: string;
  type: TypeSeance;
  mois: string;
  semaine: string;
  retour: string;
}) {
  const [statut, setStatut] = useState<StatutObjectif>(objectif?.statut ?? "en_cours");
  const [enCours, demarrer] = useTransition();
  const formulaire = useRef<HTMLFormElement>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const id = `objectif-${semaine || "mois"}`;
  // Texte déjà enregistré : sert à ne renvoyer que ce qui a changé.
  const enregistre = useRef(objectif?.description ?? "");
  const [longueur, setLongueur] = useState((objectif?.description ?? "").length);
  const [modifie, setModifie] = useState(false);

  // La zone prend la hauteur de son texte (au chargement, à la frappe, quand la largeur change).
  function ajuster() {
    const el = zone.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }
  useEffect(() => {
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  function envoyer(donnees: FormData) {
    enregistre.current = String(donnees.get("description") ?? "").trim();
    setModifie(false);
    demarrer(() => actionEnregistrerObjectif(donnees));
  }

  // En quittant le champ : le texte changé part tout seul (jamais un texte vide : l'objectif existant est gardé).
  function enregistrerAuto() {
    const texte = zone.current?.value.trim() ?? "";
    if (!formulaire.current || !texte || texte === enregistre.current) return;
    envoyer(new FormData(formulaire.current));
  }

  function choisir(valeur: StatutObjectif) {
    setStatut(valeur);
    // Objectif déjà écrit : le nouveau statut part tout de suite.
    if (objectif && formulaire.current) {
      const donnees = new FormData(formulaire.current);
      donnees.set("statut", valeur);
      envoyer(donnees);
    }
  }

  return (
    <form
      ref={formulaire}
      action={envoyer}
      className="objectif"
      aria-busy={enCours}
      data-modifie={modifie ? "" : undefined}
    >
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mois" value={mois} />
      <input type="hidden" name="semaine" value={semaine} />
      <label htmlFor={id} className={titreVisible ? "objectif-titre" : "visuellement-cache"}>
        {titre}
      </label>
      <textarea
        ref={zone}
        id={id}
        name="description"
        rows={1}
        defaultValue={objectif?.description ?? ""}
        placeholder="ex. Apprendre Al-Mulk, versets 1 à 15"
        enterKeyHint="done"
        autoCapitalize="sentences"
        maxLength={LONGUEUR_MAX}
        required
        onInput={(e) => {
          setLongueur(e.currentTarget.value.length);
          setModifie(e.currentTarget.value.trim() !== enregistre.current);
          ajuster();
        }}
        onKeyDown={(e) => {
          // Un objectif tient en une phrase : « Entrée » valide au lieu d'ajouter une ligne.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        onBlur={enregistrerAuto}
      />
      {longueur >= SEUIL_COMPTEUR ? (
        <p className="objectif-compteur" aria-live="polite">
          {longueur}/{LONGUEUR_MAX}
        </p>
      ) : null}
      <fieldset className="objectif-statut">
        <legend className="visuellement-cache">Statut</legend>
        {STATUTS.map((s) => (
          <label key={s.valeur} className={`statut statut-${s.valeur}`}>
            <input
              type="radio"
              name="statut"
              value={s.valeur}
              checked={statut === s.valeur}
              onChange={() => choisir(s.valeur)}
            />
            {s.valeur === "en_cours" ? <Clock size={14} strokeWidth={2.2} aria-hidden="true" /> : null}
            {s.valeur === "atteint" ? <Check size={14} strokeWidth={2.6} aria-hidden="true" /> : null}
            {s.valeur === "non_atteint" ? <X size={14} strokeWidth={2.6} aria-hidden="true" /> : null}
            {s.libelle}
          </label>
        ))}
      </fieldset>
      <button type="submit" className="bouton-secondaire" disabled={enCours}>
        <ContenuBoutonEnregistrer enCours={enCours} libelle="Enregistrer" />
      </button>
    </form>
  );
}
