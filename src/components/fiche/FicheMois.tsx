import Link from "next/link";
import { Suspense } from "react";
import { actionEnregistrerObjectif } from "@/app/actions/fiche";
import {
  cleMois,
  decalerMois,
  formaterDuree,
  libelleJourCourt,
  libelleMois,
  libelleMoisCourt,
  LIBELLE_TYPE,
  moisAutour,
  premierJour,
  TYPES_SEANCE,
  type JourFiche,
  type Objectif,
  type TypeSeance,
} from "@/domain/fiche";
import { creerReferentiel, libellePassage, type Referentiel } from "@/domain/versets";
import type { Fiche } from "@/services/fiche";
import { SectionBilan } from "./SectionBilan";

/**
 * Fiche du mois d'un élève (semaines 1 à 5). Utilisée par l'élève (/eleve)
 * et par le maître (/maitre/eleves/[id]) : seul le chemin de base change.
 * Un mois à venir sert à préparer les objectifs ; un mois en cours ou passé
 * montre les séances et se termine par le bilan du mois.
 */
export function FicheMois({
  fiche,
  eleveId,
  base,
  vueMaitre = false,
}: {
  fiche: Fiche;
  eleveId: string;
  base: string;
  vueMaitre?: boolean;
}) {
  const ref = creerReferentiel(fiche.sourates);
  const cle = cleMois(fiche.mois);
  const lien = (mois: string, type: TypeSeance) => `${base}?mois=${mois}&type=${type}`;
  const retour = lien(cle, fiche.type);
  const aVenir = fiche.position === "futur";
  const raccourcis = moisAutour(fiche.moisCourant, 2, 4);

  return (
    <>
      <nav className="mois" aria-label="Changer de mois">
        <Link
          className="mois-fleche"
          href={lien(cleMois(decalerMois(fiche.mois, -1)), fiche.type)}
          aria-label="Mois précédent"
        >
          ‹
        </Link>
        <h2 className="mois-titre">{libelleMois(fiche.mois)}</h2>
        <Link
          className="mois-fleche"
          href={lien(cleMois(decalerMois(fiche.mois, 1)), fiche.type)}
          aria-label="Mois suivant"
        >
          ›
        </Link>
      </nav>

      <nav className="mois-raccourcis" aria-label="Aller à un mois">
        {raccourcis.map((m) => {
          const c = cleMois(m);
          const courant = c === cleMois(fiche.moisCourant);
          return (
            <Link
              key={c}
              href={lien(c, fiche.type)}
              className={courant ? "mois-puce mois-puce-courant" : "mois-puce"}
              aria-current={c === cle ? "page" : undefined}
            >
              {courant ? "Ce mois" : libelleMoisCourt(m, fiche.moisCourant.annee)}
            </Link>
          );
        })}
      </nav>

      <nav className="onglets" aria-label="Type de séance">
        {TYPES_SEANCE.map((t) => (
          <Link
            key={t}
            href={lien(cle, t)}
            className="onglet"
            aria-current={t === fiche.type ? "page" : undefined}
          >
            {LIBELLE_TYPE[t]}
          </Link>
        ))}
      </nav>

      {aVenir ? (
        <section className="bandeau-avenir">
          <h3>Mois à venir</h3>
          <p>
            Prépare {vueMaitre ? "les objectifs de l’élève" : "tes objectifs"} à l’avance : un par semaine et
            un pour le mois. Les séances se saisissent le jour même.
          </p>
        </section>
      ) : (
        <div className="tuiles">
          <div className="tuile">
            <strong>{formaterDuree(fiche.totalMinutes)}</strong>
            <span>ce mois-ci</span>
          </div>
          <div className="tuile">
            <strong>{fiche.joursTravailles}</strong>
            <span>
              jour{fiche.joursTravailles > 1 ? "s" : ""} travaillé{fiche.joursTravailles > 1 ? "s" : ""}
            </span>
          </div>
          <div className="tuile">
            <strong>
              {fiche.semaines.filter((s) => s.objectif?.statut === "atteint").length} /{" "}
              {fiche.semaines.filter((s) => s.objectif).length}
            </strong>
            <span>objectifs atteints</span>
          </div>
        </div>
      )}

      <div className="semaines">
        {fiche.semaines.map((semaine) => (
          <section key={semaine.numero} className="semaine" aria-labelledby={`s${semaine.numero}`}>
            <header className="semaine-entete">
              <h3 id={`s${semaine.numero}`}>Semaine {semaine.numero}</h3>
              <span>
                {libelleJourCourt(semaine.jours[0]!.date)} → {libelleJourCourt(semaine.jours.at(-1)!.date)} ·{" "}
                {aVenir ? `${semaine.jours.length} jours` : formaterDuree(semaine.totalMinutes)}
              </span>
            </header>
            {aVenir ? null : (
              <ul className="jours">
                {semaine.jours.map((jour) => (
                  <li key={jour.date}>
                    <LigneJour
                      jour={jour}
                      lien={`${base}/seance?date=${jour.date}&type=${fiche.type}`}
                      refs={ref}
                    />
                  </li>
                ))}
              </ul>
            )}
            <FormulaireObjectif
              titre="Objectif de la semaine"
              objectif={semaine.objectif}
              eleveId={eleveId}
              type={fiche.type}
              mois={premierJour(fiche.mois)}
              semaine={String(semaine.numero)}
              retour={retour}
            />
          </section>
        ))}
      </div>

      <section className="semaine">
        <header className="semaine-entete">
          <h3>Objectif du mois</h3>
        </header>
        <FormulaireObjectif
          titre="Objectif du mois"
          objectif={fiche.objectifMensuel}
          eleveId={eleveId}
          type={fiche.type}
          mois={premierJour(fiche.mois)}
          semaine=""
          retour={retour}
        />
      </section>

      {aVenir ? null : (
        <section className="semaine bilan" aria-labelledby="bilan-titre">
          <header className="semaine-entete">
            <h3 id="bilan-titre">Bilan du mois · {LIBELLE_TYPE[fiche.type].toLowerCase()}</h3>
          </header>
          <ul className="bilan-chiffres">
            <li>
              <strong>{formaterDuree(fiche.totalMinutes)}</strong> de travail
            </li>
            <li>
              <strong>{fiche.joursTravailles}</strong> jour{fiche.joursTravailles > 1 ? "s" : ""}
            </li>
            <li>
              <strong>{fiche.versetsTravailles}</strong> verset{fiche.versetsTravailles > 1 ? "s" : ""}{" "}
              {fiche.type === "apprentissage" ? "appris" : "révisés"}
            </li>
            <li>
              <strong>
                {fiche.semaines.filter((s) => s.objectif?.statut === "atteint").length +
                  (fiche.objectifMensuel?.statut === "atteint" ? 1 : 0)}
              </strong>{" "}
              objectif(s) atteint(s)
            </li>
          </ul>
          {fiche.position === "courant" ? (
            <p className="bilan-aide">
              {vueMaitre
                ? "Le bilan se remplit en fin de mois, avec l’élève."
                : "Remplis ton bilan en fin de mois : ton maître le lira."}
            </p>
          ) : null}
          <Suspense key={`${cle}-${fiche.type}`} fallback={<div className="squelette squelette-bilan" />}>
            <SectionBilan eleveId={eleveId} type={fiche.type} mois={fiche.mois} vueMaitre={vueMaitre} />
          </Suspense>
        </section>
      )}
    </>
  );
}

function LigneJour({ jour, lien, refs }: { jour: JourFiche; lien: string; refs: Referentiel }) {
  const s = jour.seance;
  const contenu = s
    ? [...s.passages.map((p) => libellePassage(refs, p)), ...(s.tajwid ? [`Tajwid : ${s.tajwid}`] : [])].join(
        " · ",
      ) || "Séance sans passage"
    : null;

  const corps = (
    <>
      <span className="jour-nom">
        Jour {jour.numero}
        <small>{libelleJourCourt(jour.date)}</small>
      </span>
      <span className="jour-duree">{s ? formaterDuree(s.dureeMin) : "—"}</span>
      <span className={s ? "jour-contenu" : "jour-contenu jour-vide"}>
        {contenu ?? (jour.futur ? "" : "+ Ajouter")}
        {s?.corrigee ? <span className="pastille-or">Corrigée</span> : null}
        {s?.noteLibre ? <span className="pastille-note">Note</span> : null}
      </span>
    </>
  );

  const classes = ["jour", jour.aujourdhui ? "jour-aujourdhui" : "", jour.futur ? "jour-futur" : ""].join(
    " ",
  );
  if (jour.futur) return <div className={classes}>{corps}</div>;
  return (
    <Link className={classes} href={lien}>
      {corps}
    </Link>
  );
}

const STATUTS = [
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "atteint", libelle: "✓ Atteint" },
  { valeur: "non_atteint", libelle: "✗ Non atteint" },
] as const;

function FormulaireObjectif({
  titre,
  objectif,
  eleveId,
  type,
  mois,
  semaine,
  retour,
}: {
  titre: string;
  objectif: Objectif | null;
  eleveId: string;
  type: TypeSeance;
  mois: string;
  semaine: string;
  retour: string;
}) {
  const id = `objectif-${semaine || "mois"}`;
  return (
    <form action={actionEnregistrerObjectif} className="objectif">
      <input type="hidden" name="eleveId" value={eleveId} />
      <input type="hidden" name="retour" value={retour} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="mois" value={mois} />
      <input type="hidden" name="semaine" value={semaine} />
      <label htmlFor={id} className="objectif-titre">
        {titre}
      </label>
      <input
        id={id}
        name="description"
        defaultValue={objectif?.description ?? ""}
        placeholder="ex. Apprendre Al-Mulk, versets 1 à 15"
        maxLength={300}
        required
      />
      <fieldset className="objectif-statut">
        <legend className="visuellement-cache">Statut</legend>
        {STATUTS.map((s) => (
          <label key={s.valeur} className={`statut statut-${s.valeur}`}>
            <input
              type="radio"
              name="statut"
              value={s.valeur}
              defaultChecked={(objectif?.statut ?? "en_cours") === s.valeur}
            />
            {s.libelle}
          </label>
        ))}
      </fieldset>
      <button type="submit" className="bouton-secondaire">
        Enregistrer
      </button>
    </form>
  );
}
