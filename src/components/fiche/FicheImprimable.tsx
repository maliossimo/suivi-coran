import Link from "next/link";
import {
  formaterDuree,
  LIBELLE_TYPE,
  libelleJourCourt,
  libelleMois,
  type Objectif,
  type StatutObjectif,
} from "@/domain/fiche";
import { creerReferentiel, libellePassage } from "@/domain/versets";
import type { FicheImprimable as Donnees } from "@/services/fiche";
import { BoutonImprimer } from "./BoutonImprimer";

const STATUT: Record<StatutObjectif, string> = {
  en_cours: "En cours",
  atteint: "✓ Atteint",
  non_atteint: "✗ Non atteint",
};

function LigneObjectif({ titre, objectif }: { titre: string; objectif: Objectif | null }) {
  return (
    <div className="pdf-objectif">
      <span className="pdf-objectif-titre">{titre}</span>
      <span className="pdf-objectif-texte">{objectif?.description ?? ""}</span>
      <span className={`pdf-statut pdf-statut-${objectif?.statut ?? "vide"}`}>
        {objectif ? STATUT[objectif.statut] : ""}
      </span>
    </div>
  );
}

/**
 * Fiche du mois au format papier (A4), une page par type de séance :
 * semaines 1 à 5, jours, passages, notes, objectifs et bilan.
 * « Télécharger en PDF » ouvre l'impression du navigateur (« Enregistrer en PDF »).
 */
export function FicheImprimable({
  donnees,
  eleve,
  retour,
}: {
  donnees: Donnees;
  eleve: string;
  retour: string;
}) {
  return (
    <div className="pdf">
      <div className="pdf-outils">
        <Link href={retour} className="lien-retour">
          ‹ Retour à la fiche
        </Link>
        <div className="pdf-outils-action">
          <BoutonImprimer />
          <p>
            Dans la fenêtre qui s’ouvre, choisis <strong>« Enregistrer en PDF »</strong> comme imprimante.
          </p>
        </div>
      </div>

      {donnees.parties.map(({ fiche, bilan }) => {
        const ref = creerReferentiel(fiche.sourates);
        return (
          <section key={fiche.type} className="pdf-page">
            <header className="pdf-entete">
              <div className="pdf-logo" aria-hidden="true">
                ق
              </div>
              <div className="pdf-entete-titres">
                <span>Suivi cours Coran</span>
                <h1>
                  {LIBELLE_TYPE[fiche.type]} · {libelleMois(fiche.mois)}
                </h1>
              </div>
              <div className="pdf-entete-eleve">
                <span>Élève</span>
                <strong>{eleve}</strong>
              </div>
            </header>

            <div className="pdf-resume">
              <span>
                <strong>{formaterDuree(fiche.totalMinutes)}</strong> de travail
              </span>
              <span>
                <strong>{fiche.joursTravailles}</strong> jour{fiche.joursTravailles > 1 ? "s" : ""}
              </span>
              <span>
                <strong>{fiche.versetsTravailles}</strong> verset{fiche.versetsTravailles > 1 ? "s" : ""}{" "}
                {fiche.type === "apprentissage" ? "appris" : "révisés"}
              </span>
            </div>

            {fiche.semaines.map((semaine) => (
              <div key={semaine.numero} className="pdf-semaine">
                <div className="pdf-semaine-titre">
                  <strong>Semaine {semaine.numero}</strong>
                  <span>
                    {libelleJourCourt(semaine.jours[0]!.date)} →{" "}
                    {libelleJourCourt(semaine.jours.at(-1)!.date)}
                    {semaine.totalMinutes ? ` · ${formaterDuree(semaine.totalMinutes)}` : ""}
                  </span>
                </div>
                <table className="pdf-table">
                  <thead>
                    <tr>
                      <th className="pdf-col-jour">Jour</th>
                      <th className="pdf-col-duree">Durée</th>
                      <th>Passages</th>
                      <th className="pdf-col-note">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semaine.jours.map((jour) => {
                      const s = jour.seance;
                      return (
                        <tr key={jour.date} className={s ? undefined : "pdf-ligne-vide"}>
                          <td>
                            Jour {jour.numero}
                            <small>{libelleJourCourt(jour.date)}</small>
                          </td>
                          <td>{s ? formaterDuree(s.dureeMin) : ""}</td>
                          <td>
                            {s?.passages.map((p, i) => (
                              <div key={i}>{libellePassage(ref, p)}</div>
                            ))}
                          </td>
                          <td>{s?.noteLibre ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <LigneObjectif titre="Objectif de la semaine" objectif={semaine.objectif} />
              </div>
            ))}

            <div className="pdf-bas">
              <LigneObjectif titre="Objectif du mois" objectif={fiche.objectifMensuel} />
              <div className="pdf-bilan">
                <div>
                  <span className="pdf-bilan-titre">✓ Bien mémorisé</span>
                  <p>{bilan?.bienMemorise ?? ""}</p>
                </div>
                <div>
                  <span className="pdf-bilan-titre">↻ À renforcer</span>
                  <p>{bilan?.aRenforcer ?? ""}</p>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
