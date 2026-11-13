"use client";

import { Check, ChevronDown, Search, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { normaliserLatin } from "@/domain/recherche";
import { Feuille } from "./Feuille";

export interface OptionSelecteur {
  valeur: string;
  libelle: string;
  /** Seconde ligne, plus discrète. */
  detail?: string;
  /** Texte arabe aligné à droite (nom de sourate…). */
  arabe?: string;
  /** Pastille avant le libellé (numéro de sourate…). */
  prefixe?: string;
  /** Titre de section ; les options d'un même groupe se suivent. */
  groupe?: string;
  desactive?: boolean;
}

export interface Favoris {
  valeurs: ReadonlySet<string>;
  basculer: (valeur: string) => void;
}

type Recherche = boolean | ((options: readonly OptionSelecteur[], texte: string) => OptionSelecteur[]);

/** Au-delà, une recherche est proposée d'office. */
const SEUIL_RECHERCHE = 10;

function filtrer(options: readonly OptionSelecteur[], texte: string): OptionSelecteur[] {
  const q = normaliserLatin(texte);
  if (!q) return [...options];
  return options.filter((o) =>
    normaliserLatin(`${o.prefixe ?? ""} ${o.libelle} ${o.detail ?? ""}`).includes(q),
  );
}

/**
 * Remplace la liste déroulante du navigateur : un champ qui ouvre une feuille
 * avec de grandes lignes faciles à toucher, la recherche si la liste est longue,
 * et des favoris (étoile) quand c'est utile.
 *
 * Contrôlé (`valeur` + `onChange`) ou non (`defaultValue`) ; avec `name`, la valeur
 * part avec le formulaire, et `soumettre` envoie le formulaire dès le choix.
 */
export function Selecteur({
  titre,
  options,
  valeur: valeurControlee,
  defaultValue = "",
  onChange,
  avantChoix,
  name,
  id,
  required = false,
  vide = "Choisir…",
  soumettre = false,
  recherche,
  placeholderRecherche = "Chercher…",
  focusRecherche = false,
  disposition = "liste",
  favoris,
  compact = false,
  className,
  apercu,
}: {
  titre: string;
  options: readonly OptionSelecteur[];
  valeur?: string;
  defaultValue?: string;
  onChange?: (valeur: string) => void;
  /** Dernière vérification avant de choisir (confirmation…) ; false : on ne change rien. */
  avantChoix?: (valeur: string) => boolean;
  name?: string;
  id?: string;
  required?: boolean;
  /** Texte du champ quand rien n'est choisi. */
  vide?: string;
  soumettre?: boolean;
  recherche?: Recherche;
  placeholderRecherche?: string;
  /** Le clavier s'ouvre tout de suite (quand on cherche plus qu'on ne fait défiler). */
  focusRecherche?: boolean;
  disposition?: "liste" | "grille";
  favoris?: Favoris;
  compact?: boolean;
  className?: string;
  /** Contenu du champ à la place du libellé de l'option choisie. */
  apercu?: (option: OptionSelecteur | undefined) => ReactNode;
}) {
  const [interne, setInterne] = useState(defaultValue);
  const valeur = valeurControlee ?? interne;
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [manque, setManque] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLDivElement>(null);

  const choisie = options.find((o) => o.valeur === valeur);
  const avecRecherche = recherche ?? options.length > SEUIL_RECHERCHE;
  const resultats = useMemo(() => {
    if (!avecRecherche || !texte.trim()) return [...options];
    return typeof avecRecherche === "function" ? avecRecherche(options, texte) : filtrer(options, texte);
  }, [avecRecherche, options, texte]);

  // Favoris en tête (hors recherche), puis les groupes dans l'ordre des options.
  const sections = useMemo(() => {
    const res: { titre: string | null; options: OptionSelecteur[] }[] = [];
    const favorites = favoris && !texte.trim() ? resultats.filter((o) => favoris.valeurs.has(o.valeur)) : [];
    if (favorites.length) res.push({ titre: "Favoris", options: favorites });
    for (const o of resultats) {
      if (favorites.includes(o)) continue;
      const g = o.groupe ?? null;
      const derniere = res.at(-1);
      if (derniere && derniere.titre === g) derniere.options.push(o);
      else res.push({ titre: g, options: [o] });
    }
    return res;
  }, [favoris, resultats, texte]);

  // Formulaire envoyé sans choix obligatoire : on ouvre la feuille au lieu d'envoyer.
  useEffect(() => {
    const form = bouton.current?.form;
    if (!form || !required) return;
    const verifier = (e: SubmitEvent) => {
      if (valeur) return;
      e.preventDefault();
      setManque(true);
      setOuvert(true);
    };
    form.addEventListener("submit", verifier);
    return () => form.removeEventListener("submit", verifier);
  }, [required, valeur]);

  // À l'ouverture : l'option choisie est visible.
  useEffect(() => {
    if (!ouvert) return;
    liste.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
    if (focusRecherche) champ.current?.focus();
  }, [ouvert, focusRecherche]);

  const choisir = (v: string) => {
    if (avantChoix && !avantChoix(v)) return;
    setOuvert(false);
    setTexte("");
    setManque(false);
    if (v === valeur) return;
    if (valeurControlee === undefined) setInterne(v);
    onChange?.(v);
    if (soumettre && name) {
      const form = bouton.current?.form;
      const cache = form?.elements.namedItem(name);
      if (cache instanceof HTMLInputElement) cache.value = v;
      form?.requestSubmit();
    }
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={valeur} /> : null}
      <button
        ref={bouton}
        id={id}
        type="button"
        className={[
          "selecteur",
          compact ? "selecteur-compact" : "",
          choisie ? "" : "selecteur-vide",
          manque ? "selecteur-manque" : "",
          className ?? "",
        ].join(" ")}
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        aria-label={`${titre} : ${choisie?.libelle ?? vide}`}
      >
        <span className="selecteur-texte">
          {apercu ? (
            apercu(choisie)
          ) : choisie ? (
            <>
              {choisie.prefixe ? `${choisie.prefixe}. ` : ""}
              {choisie.libelle}
              {choisie.arabe ? (
                <span className="selecteur-arabe" lang="ar" dir="rtl">
                  {" "}
                  {choisie.arabe}
                </span>
              ) : null}
            </>
          ) : (
            vide
          )}
        </span>
        {favoris && choisie && favoris.valeurs.has(choisie.valeur) ? (
          <Star size={15} className="selecteur-etoile-champ" aria-label="Favori" />
        ) : null}
        <ChevronDown size={18} aria-hidden="true" />
      </button>

      <Feuille
        ouverte={ouvert}
        onFermer={() => {
          setOuvert(false);
          setTexte("");
        }}
        titre={titre}
      >
        {avecRecherche ? (
          <label className="selecteur-recherche">
            <Search size={17} aria-hidden="true" />
            <input
              ref={champ}
              type="search"
              inputMode="search"
              autoComplete="off"
              enterKeyHint="go"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const premiere = resultats.find((o) => !o.desactive);
                if (premiere) choisir(premiere.valeur);
              }}
              placeholder={placeholderRecherche}
              aria-label={`Chercher : ${titre}`}
            />
          </label>
        ) : null}
        {favoris && !favoris.valeurs.size && !texte ? (
          <p className="selecteur-astuce">
            <Star size={14} aria-hidden="true" /> Touche l’étoile pour garder tes favoris en haut de la liste.
          </p>
        ) : null}
        <div ref={liste} className="selecteur-sections">
          {sections.map((s, i) => (
            <section key={`${s.titre ?? ""}-${i}`} className="selecteur-section">
              {s.titre ? <h3>{s.titre}</h3> : null}
              <ul
                className={disposition === "grille" ? "selecteur-grille" : "selecteur-liste"}
                role="listbox"
                aria-label={s.titre ?? titre}
              >
                {s.options.map((o) => {
                  const actuelle = o.valeur === valeur;
                  const favori = favoris?.valeurs.has(o.valeur) ?? false;
                  return (
                    <li key={o.valeur} className="selecteur-ligne">
                      <button
                        type="button"
                        role="option"
                        aria-selected={actuelle}
                        disabled={o.desactive}
                        className="selecteur-option"
                        onClick={() => choisir(o.valeur)}
                      >
                        {o.prefixe && disposition === "liste" ? (
                          <span className="selecteur-prefixe">{o.prefixe}</span>
                        ) : null}
                        <span className="selecteur-option-texte">
                          <span>{o.libelle}</span>
                          {o.detail ? <small>{o.detail}</small> : null}
                        </span>
                        {o.arabe ? (
                          <span className="selecteur-arabe" lang="ar" dir="rtl">
                            {o.arabe}
                          </span>
                        ) : null}
                        {actuelle && disposition === "liste" ? (
                          <Check size={18} className="selecteur-coche" aria-hidden="true" />
                        ) : null}
                      </button>
                      {favoris ? (
                        <button
                          type="button"
                          className={favori ? "selecteur-favori actif" : "selecteur-favori"}
                          onClick={() => favoris.basculer(o.valeur)}
                          aria-pressed={favori}
                          aria-label={
                            favori ? `Retirer ${o.libelle} des favoris` : `Ajouter ${o.libelle} aux favoris`
                          }
                        >
                          <Star size={19} aria-hidden="true" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {resultats.length === 0 ? <p className="selecteur-astuce">Rien ne correspond.</p> : null}
        </div>
      </Feuille>
    </>
  );
}
