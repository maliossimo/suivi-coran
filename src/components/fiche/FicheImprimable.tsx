import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import {
  etatCorrection,
  formaterDuree,
  LIBELLE_TYPE,
  libelleDateLongue,
  libelleJourCourt,
  libelleJourSemaine,
  libelleMois,
  type Objectif,
  type StatutObjectif,
} from "@/domain/fiche";
import { LIBELLE_LECTURE } from "@/domain/lectures";
import {
  creerReferentiel,
  libellePassage,
  type Passage,
  type Referentiel,
  type Sourate,
} from "@/domain/versets";
import type { FicheImprimable as Donnees, Fiche } from "@/services/fiche";
import { LogoEtoile } from "../logo/LogoEtoile";
import { BoutonImprimer } from "./BoutonImprimer";

const STATUT: Record<StatutObjectif, string> = {
  en_cours: "En cours",
  atteint: "Atteint",
  non_atteint: "Non atteint",
};

function LigneObjectif({ titre, objectif }: { titre: string; objectif: Objectif | null }) {
  return (
    <div className="pdf-objectif">
      <span className="pdf-objectif-titre">{titre}</span>
      <span className="pdf-objectif-texte">{objectif?.description ?? ""}</span>
      {objectif && (
        <span className={`pdf-statut pdf-statut-${objectif.statut}`}>{STATUT[objectif.statut]}</span>
      )}
    </div>
  );
}

/** « Al-Baqara البقرة v. 1 → 141 », le nom arabe dans sa police. */
function PassagePdf({ referentiel: ref, passage: p }: { referentiel: Referentiel; passage: Passage }) {
  const debut = ref.get(p.sourateDebut);
  const fin = ref.get(p.sourateFin);
  if (!debut || !fin) return <div className="pdf-passage">{libellePassage(ref, p)}</div>;
  const nom = (s: Sourate) => (
    <>
      <span className="pdf-sourate">{s.nomLatin}</span>
      <span className="pdf-ar" lang="ar" dir="rtl">
        {s.nomAr}
      </span>
    </>
  );
  if (p.sourateDebut === p.sourateFin) {
    const entiere = p.versetDebut === 1 && p.versetFin === debut.nbVersets;
    return (
      <div className="pdf-passage">
        {nom(debut)}
        <span className="pdf-versets">
          {entiere ? `en entier (${debut.nbVersets} v.)` : `v. ${p.versetDebut} → ${p.versetFin}`}
        </span>
      </div>
    );
  }
  return (
    <div className="pdf-passage">
      {nom(debut)}
      <span className="pdf-versets">v. {p.versetDebut} →</span>
      {nom(fin)}
      <span className="pdf-versets">v. {p.versetFin}</span>
    </div>
  );
}

function Chiffres({ fiche }: { fiche: Fiche }) {
  const seances = fiche.semaines.flatMap((s) => s.jours.flatMap((j) => (j.seance ? [j.seance] : [])));
  const vues = seances.filter((s) => etatCorrection(s) === "complete").length;
  const pluriel = (n: number, mot: string) => `${mot}${n > 1 ? "s" : ""}`;
  return (
    <div className="pdf-chiffres">
      <div className="pdf-chiffre">
        <strong>{formaterDuree(fiche.totalMinutes)}</strong>
        <span>de travail</span>
      </div>
      <div className="pdf-chiffre">
        <strong>{fiche.joursTravailles}</strong>
        <span>{pluriel(fiche.joursTravailles, "jour")} de travail</span>
      </div>
      <div className="pdf-chiffre">
        <strong>{fiche.versetsTravailles}</strong>
        <span>
          {pluriel(fiche.versetsTravailles, "verset")}{" "}
          {fiche.type === "apprentissage" ? "appris" : pluriel(fiche.versetsTravailles, "révisé")}
        </span>
      </div>
      <div className="pdf-chiffre">
        <strong>{seances.length ? `${vues} / ${seances.length}` : "—"}</strong>
        <span>
          {pluriel(seances.length, "séance")} {pluriel(seances.length, "vue")} par le Cheikh
        </span>
      </div>
    </div>
  );
}

/** Une case par jour du mois : la régularité se lit d'un coup d'œil. */
function Regularite({ fiche }: { fiche: Fiche }) {
  return (
    <div className="pdf-regularite">
      <span className="pdf-regularite-titre">Jours travaillés</span>
      <div className="pdf-regularite-jours" aria-hidden="true">
        {fiche.semaines.map((semaine) => (
          <div key={semaine.numero} className="pdf-regularite-semaine">
            {semaine.jours.map((jour) => (
              <span
                key={jour.date}
                className={`pdf-case${jour.seance ? " pdf-case-travaille" : jour.futur ? " pdf-case-futur" : ""}`}
              >
                {jour.jourDuMois}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Fiche du mois au format papier (A4), une page par type de séance :
 * chiffres du mois, semaines 1 à 5, passages, notes, objectifs, bilan et visas.
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
          <ChevronLeft size={18} aria-hidden="true" />
          Retour à la fiche
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
                <LogoEtoile />
              </div>
              <div className="pdf-entete-titres">
                <span>Suivi cours Coran</span>
                <h1>
                  {LIBELLE_TYPE[fiche.type]} · {libelleMois(fiche.mois)}
                </h1>
              </div>
              <div className="pdf-entete-eleve">
                <span>Élève · lecture {LIBELLE_LECTURE[fiche.lecture]}</span>
                <strong>{eleve}</strong>
              </div>
            </header>

            <Chiffres fiche={fiche} />
            <Regularite fiche={fiche} />

            {fiche.semaines.map((semaine, index) => (
              <div key={semaine.numero} className="pdf-semaine">
                <div className="pdf-semaine-titre">
                  <strong>Semaine {semaine.numero}</strong>
                  <span className="pdf-semaine-dates">
                    {libelleJourCourt(semaine.jours[0]!.date)} →{" "}
                    {libelleJourCourt(semaine.jours.at(-1)!.date)}
                  </span>
                  {semaine.joursTravailles > 0 && (
                    <span className="pdf-semaine-total">
                      {semaine.joursTravailles} jour{semaine.joursTravailles > 1 ? "s" : ""}
                      {semaine.totalMinutes ? ` · ${formaterDuree(semaine.totalMinutes)}` : ""}
                    </span>
                  )}
                </div>
                <table className="pdf-table">
                  {/* Les titres de colonnes ne figurent qu'une fois : la page tient sur une feuille. */}
                  <colgroup>
                    <col className="pdf-col-jour" />
                    <col className="pdf-col-duree" />
                    <col />
                    <col className="pdf-col-note" />
                    <col className="pdf-col-cheikh" />
                  </colgroup>
                  <thead className={index === 0 ? undefined : "visuellement-cache"}>
                    <tr>
                      <th>Jour</th>
                      <th>Durée</th>
                      <th>Passages</th>
                      <th>Note</th>
                      <th>Cheikh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semaine.jours.map((jour) => {
                      const s = jour.seance;
                      const etat = s ? etatCorrection(s) : null;
                      return (
                        <tr key={jour.date} className={s ? undefined : "pdf-ligne-vide"}>
                          <td>
                            <span className="pdf-jour">
                              <strong>Jour {jour.numero}</strong>
                              <small>
                                {libelleJourSemaine(jour.date)} {libelleJourCourt(jour.date)}
                              </small>
                            </span>
                          </td>
                          <td className="pdf-duree">{s ? formaterDuree(s.dureeMin) : ""}</td>
                          <td>
                            {s?.passages.map((p, i) => (
                              <PassagePdf key={i} referentiel={ref} passage={p} />
                            ))}
                          </td>
                          <td>{s?.noteLibre ?? ""}</td>
                          <td>
                            {etat === "complete" && <span className="pdf-vu">✓ Vue</span>}
                            {etat === "partielle" && (
                              <span className="pdf-vu pdf-vu-partielle">En partie</span>
                            )}
                          </td>
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
                <div className="pdf-bilan-renforcer">
                  <span className="pdf-bilan-titre">↻ À renforcer</span>
                  <p>{bilan?.aRenforcer ?? ""}</p>
                </div>
              </div>
              <div className="pdf-visas">
                <div className="pdf-visa">Visa du Cheikh</div>
                <div className="pdf-visa">Signature de l’élève ou d’un parent</div>
              </div>
            </div>
            <footer className="pdf-pied">
              <span>Suivi cours Coran · {eleve}</span>
              <span>Fiche éditée le {libelleDateLongue(donnees.editeeLe)}</span>
            </footer>
          </section>
        );
      })}
    </div>
  );
}
