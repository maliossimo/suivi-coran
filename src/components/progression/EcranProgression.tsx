import { libelleJourCourt } from "@/domain/fiche";
import type { CarteDuCoran } from "@/domain/carte";
import { aRenforcer, type Progression } from "@/domain/progression";
import { AnneauProgression } from "@/components/AnneauProgression";
import { EtatVide } from "@/components/EtatVide";
import { CarteCoran } from "./CarteCoran";
import { GraphiqueCumul, GraphiqueSemaines, GrilleRegularite, LegendeTeintes } from "./Graphiques";

/** Écran « Progression », commun à l'élève et au maître. */
export function EcranProgression({
  p,
  base,
}: {
  p: Progression & { aujourdhui: string; carte: CarteDuCoran };
  /** Racine des pages de l'élève : « /eleve » ou « /maitre/eleves/{id} ». */
  base: string;
}) {
  const minutes12 = p.minutesParSemaine.reduce((t, b) => t + b.apprentissage + b.revision, 0);
  const objectifs = p.objectifsParMois.reduce(
    (acc, m) => ({ atteints: acc.atteints + m.atteints, total: acc.total + m.total }),
    { atteints: 0, total: 0 },
  );

  const rien = p.versetsAppris === 0 && minutes12 === 0 && p.carte.compte.vide === p.carte.cases.length;

  return (
    <>
      {rien ? (
        <EtatVide titre="La progression apparaîtra ici">
          Dès les premières séances saisies, les versets appris, la carte du Coran et la régularité
          s’afficheront ici.
        </EtatVide>
      ) : null}
      <div className="tuiles">
        <div className="tuile tuile-forte">
          <strong>{p.versetsAppris}</strong>
          <span>versets appris</span>
          {p.versetsAppris > 0 ? (
            <small className="tuile-detail">
              {p.versetsValides >= p.versetsAppris
                ? "tous validés par le Cheikh"
                : p.versetsVus === 0
                  ? "pas encore écoutés par le Cheikh"
                  : `dont ${p.versetsValides} validé${p.versetsValides > 1 ? "s" : ""}, ${p.versetsVus} écouté${p.versetsVus > 1 ? "s" : ""} par le Cheikh`}
            </small>
          ) : null}
        </div>
        <div className="tuile tuile-anneau">
          <AnneauProgression
            pourcentage={p.pourcentageCoran}
            pourcentageVu={p.pourcentageCoranVu}
            taille={64}
            epaisseur={7}
            libelle={`${p.pourcentageCoran.toLocaleString("fr-FR")} % du Coran, dont ${p.pourcentageCoranVu.toLocaleString("fr-FR")} % écouté par le Cheikh`}
            texte={`${p.pourcentageCoran.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
          />
          <span>du Coran</span>
        </div>
        <div className="tuile">
          <strong>{p.souratesCompletes}</strong>
          <span>
            sourate{p.souratesCompletes > 1 ? "s" : ""} complète{p.souratesCompletes > 1 ? "s" : ""}
          </span>
          {p.souratesCompletes > p.souratesCompletesVues ? (
            <small className="tuile-detail">
              {p.souratesCompletesVues === 0
                ? "pas encore vues par le Cheikh"
                : `dont ${p.souratesCompletesVues} vue${p.souratesCompletesVues > 1 ? "s" : ""} par le Cheikh`}
            </small>
          ) : null}
        </div>
        <div className="tuile">
          <strong>{p.joursConsecutifs}</strong>
          <span>jour{p.joursConsecutifs > 1 ? "s" : ""} d’affilée</span>
        </div>
      </div>

      <CarteCoran carte={p.carte} aujourdhui={p.aujourdhui} base={base} />

      <div className="grille-graphiques">
        <section className="carte-graphique">
          <h2>Versets appris</h2>
          <p className="carte-graphique-sous">Cumul sur les 6 derniers mois</p>
          <GraphiqueCumul points={p.cumulParMois} />
        </section>

        <section className="carte-graphique">
          <h2>Temps de travail</h2>
          <p className="carte-graphique-sous">
            {Math.round(minutes12 / 60)} h sur les 12 dernières semaines · <span className="puce puce-vert" />{" "}
            apprentissage <span className="puce puce-or" /> révision
          </p>
          <GraphiqueSemaines barres={p.minutesParSemaine} />
        </section>

        <section className="carte-graphique">
          <h2>Régularité</h2>
          <p className="carte-graphique-sous">
            12 dernières semaines · <LegendeTeintes />
          </p>
          <GrilleRegularite colonnes={p.regularite} />
        </section>

        <section className="carte-graphique">
          <h2>Objectifs</h2>
          <p className="carte-graphique-sous">
            {objectifs.atteints} atteint{objectifs.atteints > 1 ? "s" : ""} sur {objectifs.total} en 6 mois
          </p>
          <ul className="barres-objectifs">
            {p.objectifsParMois.map((m) => (
              <li key={m.cle}>
                <span>{m.libelle}</span>
                <span className="jauge">
                  <span style={{ width: m.total ? `${(m.atteints / m.total) * 100}%` : "0%" }} />
                </span>
                <span>{m.total ? `${m.atteints}/${m.total}` : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="carte-graphique">
        <h2>Sourates</h2>
        {p.sourates.length ? (
          <p className="carte-graphique-sous">
            <span className="puce puce-declare" /> saisi <span className="puce puce-ecoute" /> écouté{" "}
            <span className="puce puce-valide" /> validé
          </p>
        ) : null}
        {p.sourates.length === 0 ? (
          <p className="carte-graphique-sous">
            Les sourates apparaîtront ici dès les premières séances d’apprentissage.
          </p>
        ) : (
          <ul className="liste-sourates">
            {p.sourates.map((s) => {
              const renforcer = s.pourcentage === 100 && aRenforcer(s, p.aujourdhui);
              return (
                <li key={s.sourate.numero}>
                  <div className="liste-sourates-ligne">
                    <span>
                      <b>
                        {s.sourate.numero}. {s.sourate.nomLatin}
                      </b>{" "}
                      <span className="arabe">{s.sourate.nomAr}</span>
                    </span>
                    <span className="liste-sourates-info">
                      {s.versetsAppris}/{s.sourate.nbVersets} versets
                      {s.versetsVus < s.versetsAppris ? (
                        <span className="liste-sourates-vus">
                          {s.versetsVus
                            ? ` · ${s.versetsVus} écouté${s.versetsVus > 1 ? "s" : ""}`
                            : " · pas encore écoutés"}
                        </span>
                      ) : null}
                      {s.pourcentage === 100 && s.versetsVus < s.versetsAppris ? (
                        <span className="pastille-a-faire-voir">À faire écouter</span>
                      ) : null}
                      {s.pourcentage === 100 && s.versetsValides >= s.sourate.nbVersets ? (
                        <span className="pastille-or">✓ Validée</span>
                      ) : null}
                      {renforcer ? <span className="pastille-or">À réviser</span> : null}
                    </span>
                  </div>
                  <span
                    className="jauge jauge-double"
                    title={`${s.versetsValides} validé${s.versetsValides > 1 ? "s" : ""}, ${s.versetsVus} écouté${s.versetsVus > 1 ? "s" : ""} par le Cheikh sur ${s.versetsAppris} saisis`}
                  >
                    <span style={{ width: `${s.pourcentage}%` }}>
                      <span style={{ width: `${(s.versetsVus / s.versetsAppris) * 100}%` }}>
                        <span
                          style={{
                            width: `${s.versetsVus ? (s.versetsValides / s.versetsVus) * 100 : 0}%`,
                          }}
                        />
                      </span>
                    </span>
                  </span>
                  <small className="liste-sourates-revision">
                    {s.derniereRevision
                      ? `Dernière révision : ${libelleJourCourt(s.derniereRevision)}`
                      : "Pas encore révisée"}
                  </small>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
