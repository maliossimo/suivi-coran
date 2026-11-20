import { BookCheck, Check, Flame, Target } from "lucide-react";
import { Compteur } from "@/components/Compteur";
import { encouragement, libelleJourCourt } from "@/domain/fiche";
import type { CarteDuCoran } from "@/domain/carte";
import { aRenforcer, type Progression } from "@/domain/progression";
import { AnneauProgression } from "@/components/AnneauProgression";
import { EtatVide } from "@/components/EtatVide";
import { CarteCoran } from "./CarteCoran";
import { GraphiqueCumul, GraphiqueSemaines, GrilleRegularite, LegendeTeintes } from "./Graphiques";
import { HistoriqueMois } from "./HistoriqueMois";
import { ZoneBulles } from "./ZoneBulles";
import { AcquisProgression } from "@/components/acquis/AcquisProgression";
import { SousTitreEntete } from "@/components/SousTitreEntete";

/** Écran « Progression », commun à l'élève et au maître. */
export function EcranProgression({
  p,
  base,
}: {
  p: Progression & {
    aujourdhui: string;
    carte: CarteDuCoran;
    acquis: {
      id: string;
      eleveId: string;
      libelle: string;
      aEcouter: boolean;
      ecoute: boolean;
      valide: boolean;
    }[];
  };
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
      <SousTitreEntete
        texte={`${p.pourcentageCoran.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % du Coran · ${p.versetsAppris} verset${p.versetsAppris > 1 ? "s" : ""}`}
      />
      <section className="progression-entete" aria-label="Avancement dans le Coran">
        <div className="progression-anneau">
          <AnneauProgression
            pourcentage={p.pourcentageCoran}
            pourcentageVu={p.pourcentageCoranVu}
            taille={124}
            epaisseur={11}
            libelle={`${p.pourcentageCoran.toLocaleString("fr-FR")} % du Coran, dont ${p.pourcentageCoranVu.toLocaleString("fr-FR")} % écouté par le Cheikh`}
            texte={`${p.pourcentageCoran.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
          />
          <small>du Coran</small>
        </div>
        <div className="progression-entete-texte">
          <p className="progression-surtitre">Avancement</p>
          {p.pagesApprises !== null ? (
            <>
              {/* Les pages d'abord : c'est ainsi que l'on compte ce que l'on sait par cœur. */}
              <p className="progression-grand">
                <strong>{p.pagesApprises.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</strong> page
                {p.pagesApprises >= 2 ? "s" : ""}
                <span className="progression-sur"> sur 604</span>
              </p>
              <p className="progression-versets">
                <b>
                  <Compteur valeur={p.versetsAppris} />
                </b>{" "}
                verset{p.versetsAppris > 1 ? "s" : ""} appris
                {p.juzComplets ? (
                  <>
                    {" · "}
                    <b>{p.juzComplets}</b> juz complet{p.juzComplets > 1 ? "s" : ""}
                  </>
                ) : null}
              </p>
            </>
          ) : (
            <p className="progression-grand">
              <strong>
                <Compteur valeur={p.versetsAppris} />
              </strong>{" "}
              verset{p.versetsAppris > 1 ? "s" : ""} appris
            </p>
          )}
          {p.versetsAppris > 0 ? (
            <p className="progression-detail">
              {p.versetsValides >= p.versetsAppris
                ? "Tous validés par le Cheikh"
                : p.versetsVus === 0
                  ? "Pas encore écoutés par le Cheikh"
                  : `Dont ${p.versetsValides} validé${p.versetsValides > 1 ? "s" : ""}, ${p.versetsVus} écouté${p.versetsVus > 1 ? "s" : ""} par le Cheikh`}
            </p>
          ) : null}
          {base === "/eleve" ? (
            <p className="progression-encouragement">{encouragement(p.pourcentageCoran)}</p>
          ) : null}
        </div>
      </section>

      <AcquisProgression acquis={p.acquis} vueEleve={base === "/eleve"} />

      <div className="tuiles">
        <div className="tuile">
          <BookCheck size={20} aria-hidden="true" className="tuile-icone" />
          <strong>
            <Compteur valeur={p.souratesCompletes} />
          </strong>
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
        {/* La flamme n'apparaît qu'à partir de 2 jours d'affilée. */}
        {p.joursConsecutifs >= 2 ? (
          <div className={"tuile tuile-serie est-allumee"}>
            <Flame size={20} aria-hidden="true" className="tuile-icone" />
            <strong>
              <Compteur valeur={p.joursConsecutifs} />
            </strong>
            <span>jour{p.joursConsecutifs > 1 ? "s" : ""} d’affilée</span>
          </div>
        ) : null}
        <div className="tuile">
          <Target size={20} aria-hidden="true" className="tuile-icone" />
          <strong>
            {objectifs.atteints}/{objectifs.total}
          </strong>
          <span>objectifs atteints en 6 mois</span>
        </div>
      </div>

      <CarteCoran carte={p.carte} aujourdhui={p.aujourdhui} base={base} />

      <div className="grille-graphiques">
        <section className="carte-graphique">
          <h2>Versets appris</h2>
          <p className="carte-graphique-sous">Cumul sur les 6 derniers mois</p>
          <ZoneBulles>
            <GraphiqueCumul points={p.cumulParMois} />
          </ZoneBulles>
        </section>

        <HistoriqueMois mois={p.bilanParMois} />

        <section className="carte-graphique">
          <h2>Temps de travail</h2>
          <p className="carte-graphique-sous">
            {Math.round(minutes12 / 60)} h sur les 12 dernières semaines · <span className="puce puce-vert" />{" "}
            apprentissage <span className="puce puce-or" /> révision
          </p>
          <ZoneBulles>
            <GraphiqueSemaines barres={p.minutesParSemaine} />
          </ZoneBulles>
        </section>

        <section className="carte-graphique">
          <h2>Régularité</h2>
          <p className="carte-graphique-sous">
            12 dernières semaines · <LegendeTeintes />
          </p>
          <ZoneBulles>
            <GrilleRegularite colonnes={p.regularite} />
          </ZoneBulles>
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
                        <span className="pastille-or">
                          <Check size={14} className="icone-texte" aria-hidden="true" /> Validée
                        </span>
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
