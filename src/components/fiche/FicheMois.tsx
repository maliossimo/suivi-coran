import { ChevronLeft, ChevronRight, Download, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
  etatCorrection,
  cleMois,
  decalerMois,
  formaterDuree,
  libelleJourCourt,
  libelleMois,
  LIBELLE_TYPE,
  premierJour,
  TYPES_SEANCE,
  type JourFiche,
  type TypeSeance,
} from "@/domain/fiche";
import { creerReferentiel, libellePassage, type Referentiel } from "@/domain/versets";
import type { Fiche } from "@/services/fiche";
import { FormulaireObjectif } from "./FormulaireObjectif";
import { SectionBilan } from "./SectionBilan";
import { cleSeance } from "./cleSeance";
import { BoutonValider, EtatEnregistrement } from "./EtatsLigneJour";
import { GestesFiche } from "./GestesFiche";
import { PreparerHorsLigne } from "./PreparerHorsLigne";
import { IndicateurLien } from "../IndicateurLien";

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
  const semaineCourante =
    fiche.position === "courant"
      ? (fiche.semaines.find((sem) => sem.jours.some((j) => j.aujourdhui))?.numero ?? null)
      : null;

  const aujourdhui = fiche.semaines.flatMap((s) => s.jours).find((j) => j.aujourdhui)?.date;
  const pagesHorsLigne = aujourdhui
    ? [
        `${base}/seance?date=${aujourdhui}&type=apprentissage`,
        `${base}/seance?date=${aujourdhui}&type=revision`,
        lien(cle, fiche.type === "apprentissage" ? "revision" : "apprentissage"),
      ]
    : [];

  return (
    <GestesFiche
      moisPrecedent={lien(cleMois(decalerMois(fiche.mois, -1)), fiche.type)}
      moisSuivant={lien(cleMois(decalerMois(fiche.mois, 1)), fiche.type)}
      ongletGauche={fiche.type === "apprentissage" ? null : lien(cle, "apprentissage")}
      ongletDroite={fiche.type === "revision" ? null : lien(cle, "revision")}
      cleFiche={`${cle}-${fiche.type}`}
    >
      {pagesHorsLigne.length ? <PreparerHorsLigne pages={pagesHorsLigne} /> : null}
      {fiche.premiereFois && !aVenir ? (
        <AccueilPremiereFois
          vueMaitre={vueMaitre}
          saisir={`${base}/seance?date=${aujourdhui ?? premierJour(fiche.mois)}&type=apprentissage`}
          aujourdhui={Boolean(aujourdhui)}
        />
      ) : null}
      <nav className="mois" aria-label="Changer de mois">
        <Link
          className="mois-fleche"
          prefetch
          href={lien(cleMois(decalerMois(fiche.mois, -1)), fiche.type)}
          aria-label="Mois précédent"
          data-sens="droite"
          scroll={false}
        >
          <ChevronLeft size={22} aria-hidden="true" />
          <IndicateurLien />
        </Link>
        <h2 className="mois-titre">{libelleMois(fiche.mois)}</h2>
        <Link
          className="mois-fleche"
          prefetch
          href={lien(cleMois(decalerMois(fiche.mois, 1)), fiche.type)}
          aria-label="Mois suivant"
          data-sens="gauche"
          scroll={false}
        >
          <ChevronRight size={22} aria-hidden="true" />
          <IndicateurLien />
        </Link>
      </nav>

      {cle !== cleMois(fiche.moisCourant) ? (
        <p className="mois-retour">
          <Link
            href={lien(cleMois(fiche.moisCourant), fiche.type)}
            data-sens={cle < cleMois(fiche.moisCourant) ? "gauche" : "droite"}
            scroll={false}
          >
            Revenir à ce mois-ci
            <IndicateurLien />
          </Link>
        </p>
      ) : null}

      <nav className="onglets" aria-label="Type de séance">
        {TYPES_SEANCE.map((t) => (
          <Link
            key={t}
            href={lien(cle, t)}
            className="onglet"
            // L'autre onglet est préparé : le changement est un simple remplacement.
            prefetch={t === fiche.type ? null : true}
            aria-current={t === fiche.type ? "page" : undefined}
            data-sens={t === fiche.type ? undefined : t === "revision" ? "gauche" : "droite"}
            scroll={false}
          >
            {LIBELLE_TYPE[t]}
            <IndicateurLien />
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
            <strong>{fiche.joursTravailles}</strong> jour{fiche.joursTravailles > 1 ? "s" : ""} travaillé
            {fiche.joursTravailles > 1 ? "s" : ""}
          </li>
          <li>
            <strong>{fiche.versetsTravailles}</strong> verset{fiche.versetsTravailles > 1 ? "s" : ""}
          </li>
          {fiche.semaines.some((s) => s.objectif) ? (
            <li>
              <strong>
                {fiche.semaines.filter((s) => s.objectif?.statut === "atteint").length}/
                {fiche.semaines.filter((s) => s.objectif).length}
              </strong>{" "}
              objectifs atteints
            </li>
          ) : null}
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
                {aVenir
                  ? `${semaine.jours.length} jours`
                  : semaine.totalMinutes
                    ? formaterDuree(semaine.totalMinutes)
                    : "rien saisi"}
              </span>
            </>
          );
          const contenu = (
            <>
              {aVenir ? null : (
                <ul className="jours">
                  {semaine.jours.map((jour) => {
                    const aValider =
                      vueMaitre && jour.seance && !jour.futur && etatCorrection(jour.seance) !== "complete";
                    return (
                      <li key={jour.date} className={aValider ? "jour-avec-action" : undefined}>
                        <LigneJour
                          jour={jour}
                          // Jours passés de la semaine en cours : séance préparée en entier.
                          // Les autres préparent leur écran d'attente (partiel, très léger).
                          precharger={semaine.numero === semaineCourante && !jour.futur}
                          lien={`${base}/seance?date=${jour.date}&type=${fiche.type}`}
                          refs={ref}
                          cle={cleSeance(eleveId, jour.date, fiche.type)}
                        />
                        {aValider && jour.seance ? (
                          <BoutonValider seanceId={jour.seance.id} eleveId={eleveId} />
                        ) : null}
                      </li>
                    );
                  })}
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
          // Mois en cours : seule la semaine actuelle est ouverte, les autres se déplient d'un geste.
          if (semaineCourante !== null && semaine.numero !== semaineCourante) {
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
              <strong>{fiche.joursTravailles}</strong> jour{fiche.joursTravailles > 1 ? "s" : ""} travaillé
              {fiche.joursTravailles > 1 ? "s" : ""}
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
                : "Remplis ton bilan en fin de mois : ton Cheikh le lira."}
            </p>
          ) : null}
          <Suspense key={`${cle}-${fiche.type}`} fallback={<div className="squelette squelette-bilan" />}>
            <SectionBilan eleveId={eleveId} type={fiche.type} mois={fiche.mois} vueMaitre={vueMaitre} />
          </Suspense>
        </section>
      )}

      <LegendePastilles vueMaitre={vueMaitre} />
    </GestesFiche>
  );
}

function LigneJour({
  jour,
  lien,
  refs,
  cle,
  precharger,
}: {
  precharger: boolean;
  jour: JourFiche;
  lien: string;
  refs: Referentiel;
  cle: string;
}) {
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
        {contenu ?? (jour.futur ? "" : "+ Saisir")}
        <EtatEnregistrement cle={cle} enBase={s} />
        {s && etatCorrection(s) === "complete" ? (
          <span className="pastille-or">✓ Vu par le Cheikh</span>
        ) : null}
        {s && etatCorrection(s) === "partielle" ? (
          <span className="pastille-or pastille-partielle">Ajout à voir</span>
        ) : null}
        {s?.noteLibre ? <span className="pastille-note">Note</span> : null}
        {s?.nbCommentaires ? (
          <span className="pastille-commentaire">
            <MessageCircle size={12} strokeWidth={2.6} aria-hidden="true" />
            Commentaire
          </span>
        ) : null}
      </span>
    </>
  );

  const classes = [
    "jour",
    s ? "jour-rempli" : "jour-sans-seance",
    jour.aujourdhui ? "jour-aujourdhui" : "",
    jour.futur ? "jour-futur" : "",
  ].join(" ");
  if (jour.futur) return <div className={classes}>{corps}</div>;
  return (
    // Aujourd'hui : séance préchargée en entier, elle s'ouvre sans attente.
    <Link className={classes} href={lien} prefetch={precharger ? true : null}>
      {corps}
    </Link>
  );
}

/** Légende repliable : ce que veut dire chaque pastille de la fiche. */
function LegendePastilles({ vueMaitre }: { vueMaitre: boolean }) {
  return (
    <details className="legende-pastilles">
      <summary>Que veulent dire les pastilles ?</summary>
      <ul>
        <li>
          <span className="pastille-or">✓ Vu par le Cheikh</span>
          {vueMaitre ? "tu as validé la séance." : "ton Cheikh a validé la séance."}
        </li>
        <li>
          <span className="pastille-or pastille-partielle">Ajout à voir</span>
          {vueMaitre
            ? "l’élève a ajouté ou modifié un passage après ta correction."
            : "tu as ajouté un passage après la correction : ton Cheikh ne l’a pas encore vu."}
        </li>
        <li>
          <span className="pastille-commentaire">
            <MessageCircle size={12} strokeWidth={2.6} aria-hidden="true" />
            Commentaire
          </span>
          {vueMaitre ? "tu as laissé un commentaire." : "ton Cheikh t’a laissé un commentaire."}
        </li>
        <li>
          <span className="pastille-note">Note</span>
          {vueMaitre ? "l’élève a écrit une note." : "tu as écrit une note sur ta séance."}
        </li>
      </ul>
    </details>
  );
}

/** Élève tout neuf (aucune séance) : un mot d'accueil et le premier geste à faire. */
function AccueilPremiereFois({
  vueMaitre,
  saisir,
  aujourdhui,
}: {
  vueMaitre: boolean;
  saisir: string;
  aujourdhui: boolean;
}) {
  if (vueMaitre) {
    return (
      <p className="accueil-premiere-fois accueil-cheikh">
        Cet élève n’a encore saisi aucune séance. Sa fiche se remplira au fil de ses saisies.
      </p>
    );
  }
  return (
    <section className="accueil-premiere-fois" aria-labelledby="titre-accueil">
      <span className="accueil-icone" aria-hidden="true">
        ✦
      </span>
      <h3 id="titre-accueil">Bienvenue, ta fiche est prête&nbsp;!</h3>
      <p>
        Chaque jour de travail, note ici ce que tu as <b>appris</b> ou <b>révisé</b> : la sourate, les versets
        et le temps passé. Ton Cheikh suit ta fiche et la corrige.
      </p>
      {aujourdhui ? (
        <Link href={saisir} className="bouton">
          Saisir ma première séance
        </Link>
      ) : null}
      <p className="accueil-astuce">
        Astuce : glisse le doigt sur la fiche pour changer de mois, et sur les onglets pour passer de
        l’apprentissage à la révision.
      </p>
    </section>
  );
}
