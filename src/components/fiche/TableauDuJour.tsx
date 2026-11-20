import { BookOpen, BookPlus, Check, Clock, Flame, Quote, RotateCcw, Target } from "lucide-react";
import Link from "next/link";
import { AnneauProgression } from "@/components/AnneauProgression";
import { Compteur } from "@/components/Compteur";
import {
  formaterDuree,
  joursEcoules,
  libelleDateLongue,
  libelleJourCourt,
  LIBELLE_TYPE,
  TYPES_SEANCE,
} from "@/domain/fiche";
import type { Fiche } from "@/services/fiche";

/**
 * Haut de la fiche du mois en cours : les deux séances du jour en grand,
 * puis le résumé du mois (régularité en anneau, temps, versets, série, objectifs)
 * et le dernier mot du Cheikh.
 */
export function TableauDuJour({
  fiche,
  base,
  vueMaitre,
}: {
  fiche: Fiche;
  base: string;
  vueMaitre: boolean;
}) {
  const duJour = fiche.duJour;
  return (
    <>
      {duJour ? (
        <section className="carte-aujourdhui" aria-labelledby="titre-aujourdhui">
          <h3 id="titre-aujourdhui">
            Aujourd’hui
            <time dateTime={duJour.date}>{libelleDateLongue(duJour.date)}</time>
          </h3>
          <div className="aujourdhui-actions">
            {TYPES_SEANCE.map((t) => {
              const fait = duJour.fait[t];
              const Icone = fait ? Check : t === "apprentissage" ? BookPlus : RotateCcw;
              return (
                <Link
                  key={t}
                  href={`${base}/seance?date=${duJour.date}&type=${t}`}
                  className={`aujourdhui-action aujourdhui-${t}${fait ? " est-fait" : ""}`}
                  aria-label={`${LIBELLE_TYPE[t]} d’aujourd’hui : ${fait ? "saisie, ouvrir" : "à saisir"}`}
                  data-ouvre-en-page
                >
                  <span className="aujourdhui-icone" aria-hidden="true">
                    <Icone size={22} strokeWidth={2.4} />
                  </span>
                  <span className="aujourdhui-texte">
                    <b>{LIBELLE_TYPE[t]}</b>
                    <small>
                      {fait ? (
                        <>
                          Saisie <Check size={14} className="icone-texte" aria-hidden="true" />
                        </>
                      ) : vueMaitre ? (
                        "Pas encore saisie"
                      ) : (
                        "À saisir"
                      )}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <ResumeMois fiche={fiche} />

      {duJour?.dernierMot ? (
        <figure className="mot-cheikh">
          <span className="mot-cheikh-icone" aria-hidden="true">
            <Quote size={18} strokeWidth={2.4} />
          </span>
          <figcaption>
            {vueMaitre ? "Ton dernier mot à l’élève" : "Le dernier mot de ton Cheikh"}
            <time dateTime={duJour.dernierMot.creeLe}>
              {libelleJourCourt(jourParis(duJour.dernierMot.creeLe))}
            </time>
          </figcaption>
          <blockquote>{duJour.dernierMot.texte}</blockquote>
          {duJour.dernierMot.seance ? (
            <Link
              className="mot-cheikh-lien"
              href={`${base}/seance?date=${duJour.dernierMot.seance.date}&type=${duJour.dernierMot.seance.type}`}
              data-ouvre-en-page
            >
              Voir la séance ({LIBELLE_TYPE[duJour.dernierMot.seance.type].toLowerCase()} du{" "}
              {libelleJourCourt(duJour.dernierMot.seance.date)})
            </Link>
          ) : null}
        </figure>
      ) : null}
    </>
  );
}

/** Jour (à Paris) d'un horodatage. */
function jourParis(horodatage: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(horodatage));
}

/** Résumé du mois : la régularité en anneau, et les chiffres en tuiles illustrées. */
function ResumeMois({ fiche }: { fiche: Fiche }) {
  const ecoules = joursEcoules(fiche.semaines);
  const pourcentage = ecoules ? (fiche.joursTravailles / ecoules) * 100 : 0;
  const avecObjectif = fiche.semaines.filter((s) => s.objectif);
  const serie = fiche.duJour?.serie ?? 0;
  const pourcentageEntier = Math.round(pourcentage);
  return (
    <section className="resume-mois" aria-label="Résumé du mois">
      <div className="resume-anneau">
        <AnneauProgression
          pourcentage={pourcentage}
          taille={84}
          epaisseur={9}
          libelle={`${fiche.joursTravailles} jour${fiche.joursTravailles > 1 ? "s" : ""} travaillé${fiche.joursTravailles > 1 ? "s" : ""} sur ${ecoules}`}
          texte={`${fiche.joursTravailles}/${ecoules}`}
        />
        <span className="resume-anneau-texte">
          <b>Régularité</b>
          <small>
            jour{fiche.joursTravailles > 1 ? "s" : ""} travaillé{fiche.joursTravailles > 1 ? "s" : ""}
            {fiche.position === "courant" ? " depuis le 1er" : " dans le mois"}
          </small>
          {ecoules ? <em className="resume-pourcentage">{pourcentageEntier} % du mois</em> : null}
        </span>
      </div>
      <ul className="resume-tuiles">
        <li>
          <Clock size={18} aria-hidden="true" />
          <strong>{formaterDuree(fiche.totalMinutes)}</strong>
          <span>de travail</span>
        </li>
        <li>
          <BookOpen size={18} aria-hidden="true" />
          <strong>
            <Compteur valeur={fiche.versetsTravailles} />
          </strong>
          <span>verset{fiche.versetsTravailles > 1 ? "s" : ""}</span>
        </li>
        {/* La flamme n'apparaît qu'à partir de 2 jours d'affilée : seul, un jour n'est pas une série. */}
        {serie >= 2 ? (
          <li className="tuile-serie est-allumee">
            <Flame size={18} aria-hidden="true" />
            <strong>
              <Compteur valeur={serie} />
            </strong>
            <span>jours d’affilée</span>
          </li>
        ) : null}
        {avecObjectif.length ? (
          <li>
            <Target size={18} aria-hidden="true" />
            <strong>
              {avecObjectif.filter((s) => s.objectif?.statut === "atteint").length}/{avecObjectif.length}
            </strong>
            <span>objectifs atteints</span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
