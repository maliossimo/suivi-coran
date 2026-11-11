import { ChevronLeft, ChevronRight, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
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
  type TypeSeance,
} from "@/domain/fiche";
import { creerReferentiel, libellePassage, type Referentiel } from "@/domain/versets";
import type { Fiche } from "@/services/fiche";
import { FormulaireObjectif } from "./FormulaireObjectif";
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
  const semaineCourante =
    fiche.position === "courant"
      ? (fiche.semaines.find((sem) => sem.jours.some((j) => j.aujourdhui))?.numero ?? null)
      : null;

  return (
    <>
      <nav className="mois" aria-label="Changer de mois">
        <Link
          className="mois-fleche"
          prefetch
          href={lien(cleMois(decalerMois(fiche.mois, -1)), fiche.type)}
          aria-label="Mois précédent"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <h2 className="mois-titre">{libelleMois(fiche.mois)}</h2>
        <Link
          className="mois-fleche"
          prefetch
          href={lien(cleMois(decalerMois(fiche.mois, 1)), fiche.type)}
          aria-label="Mois suivant"
        >
          <ChevronRight size={22} aria-hidden="true" />
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
              {courant ? "Ce mois" : majuscule(libelleMoisCourt(m, fiche.moisCourant.annee))}
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
        <ul className="bilan-chiffres resume-mois" aria-label="Résumé du mois">
          <li>
            <strong>{formaterDuree(fiche.totalMinutes)}</strong> de travail
          </li>
          <li>
            <strong>{fiche.joursTravailles}</strong> jour{fiche.joursTravailles > 1 ? "s" : ""}
          </li>
          <li>
            <strong>{fiche.versetsTravailles}</strong> verset{fiche.versetsTravailles > 1 ? "s" : ""}
          </li>
          <li>
            <strong>
              {fiche.semaines.filter((s) => s.objectif?.statut === "atteint").length}/
              {fiche.semaines.filter((s) => s.objectif).length}
            </strong>{" "}
            objectifs
          </li>
        </ul>
      )}

      <div className="fiche-actions">
        <Link href={`${base}/fiche-pdf?mois=${cle}`} className="lien-pdf" prefetch={false}>
          <Download size={18} aria-hidden="true" />
          Fiche du mois en PDF
        </Link>
      </div>

      <div className="semaines">
        {fiche.semaines.map((semaine) => {
          const entete = (
            <>
              <h3 id={`s${semaine.numero}`}>Semaine {semaine.numero}</h3>
              <span>
                {libelleJourCourt(semaine.jours[0]!.date)} → {libelleJourCourt(semaine.jours.at(-1)!.date)} ·{" "}
                {aVenir ? `${semaine.jours.length} jours` : formaterDuree(semaine.totalMinutes)}
              </span>
            </>
          );
          const contenu = (
            <>
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
                key={`${fiche.type}-${semaine.numero}-${semaine.objectif?.statut ?? ""}`}
                titre="Objectif de la semaine"
                objectif={semaine.objectif}
                eleveId={eleveId}
                type={fiche.type}
                mois={premierJour(fiche.mois)}
                semaine={String(semaine.numero)}
                retour={retour}
              />
            </>
          );
          // Mois en cours : les semaines déjà passées sont repliées, la fiche s'ouvre sur la semaine actuelle.
          if (semaineCourante !== null && semaine.numero < semaineCourante) {
            return (
              <details key={semaine.numero} className="semaine semaine-pliable">
                <summary className="semaine-entete">{entete}</summary>
                {contenu}
              </details>
            );
          }
          return (
            <section key={semaine.numero} className="semaine" aria-labelledby={`s${semaine.numero}`}>
              <header className="semaine-entete">{entete}</header>
              {contenu}
            </section>
          );
        })}
      </div>

      <section className="semaine">
        <header className="semaine-entete">
          <h3>Objectif du mois</h3>
        </header>
        <FormulaireObjectif
          key={`${fiche.type}-mois-${fiche.objectifMensuel?.statut ?? ""}`}
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

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function LigneJour({ jour, lien, refs }: { jour: JourFiche; lien: string; refs: Referentiel }) {
  const s = jour.seance;
  const contenu = s
    ? s.passages.map((p) => libellePassage(refs, p)).join(" · ") || "Séance sans passage"
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
        {s?.nbCommentaires ? (
          <span className="pastille-commentaire">
            <MessageCircle size={12} strokeWidth={2.6} aria-hidden="true" />
            Maître
          </span>
        ) : null}
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
