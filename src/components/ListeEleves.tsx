"use client";

import { BookPlus, CalendarCheck, ChevronRight, RotateCcw, Search, Target } from "lucide-react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { EtiquetteLecture } from "./ChoixLecture";
import { EtatVide } from "./EtatVide";
import { SousTitreEntete } from "./SousTitreEntete";
import { useState, type CSSProperties } from "react";
import { actionArchiverEleve } from "@/app/actions/classe";
import { correspondARecherche, JOURS_A_VOIR, phraseEleve, type ResumeEleve } from "@/domain/classe";
import { formaterDuree } from "@/domain/fiche";

/**
 * Liste de la classe (déjà triée par prénom) avec recherche instantanée,
 * puis les élèves archivés, réactivables d'un clic.
 */
export function ListeEleves({
  actifs,
  archives,
  cleMois,
}: {
  actifs: ResumeEleve[];
  archives: ResumeEleve[];
  cleMois: string;
}) {
  const [recherche, setRecherche] = useState("");
  const visibles = actifs.filter((r) => correspondARecherche(r.eleve, recherche));
  const archivesVisibles = archives.filter((r) => correspondARecherche(r.eleve, recherche));

  const aEcouter = actifs.reduce((t, r) => t + r.aVoir, 0);
  return (
    <>
      <SousTitreEntete
        texte={`${actifs.length} élève${actifs.length > 1 ? "s" : ""}${
          aEcouter ? ` · ${aEcouter} séance${aEcouter > 1 ? "s" : ""} à écouter` : ""
        }`}
      />
      {actifs.length + archives.length > 1 ? (
        <div className="recherche">
          <span className="recherche-icone" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            type="search"
            className="recherche-champ"
            placeholder="Rechercher un élève…"
            aria-label="Rechercher un élève par prénom ou nom"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}

      {actifs.length > 0 && visibles.length === 0 ? (
        <EtatVide titre="Aucun élève trouvé">
          <p>Personne ne correspond à « {recherche.trim()} ». Vérifie l’orthographe ou cherche par le nom.</p>
        </EtatVide>
      ) : null}

      <ul className="liste-eleves">
        {visibles.map((r, i) => (
          <li key={r.eleve.id}>
            <Link
              // Les premières fiches sont préparées d'avance : elles s'ouvrent sans attendre.
              prefetch={i < 8 ? true : null}
              href={
                r.premiereAVoir
                  ? `/maitre/eleves/${r.eleve.id}?mois=${r.premiereAVoir.date.slice(0, 7)}&type=${r.premiereAVoir.type}`
                  : `/maitre/eleves/${r.eleve.id}?mois=${cleMois}`
              }
              className="carte-eleve"
              data-ouvre-en-page
            >
              <Avatar prenom={r.eleve.prenom} nom={r.eleve.nom} cle={r.eleve.id} />
              <span className="carte-eleve-nom">
                {r.eleve.prenom} {r.eleve.nom}
                <EtiquetteLecture lecture={r.eleve.lecture ?? null} />
                {r.aVoir > 0 ? (
                  <span
                    className="pastille-or pastille-a-voir"
                    title={`Séances des ${JOURS_A_VOIR} derniers jours pas encore vues`}
                  >
                    {r.aVoir} séance{r.aVoir > 1 ? "s" : ""} à écouter
                  </span>
                ) : null}
                <small
                  className={r.alerte ? "texte-alerte" : r.joursSansSaisie === 0 ? "texte-ok" : undefined}
                >
                  {r.joursSansSaisie === 0 ? "✓ " : r.alerte ? "⚠ " : ""}
                  {phraseEleve(r.joursSansSaisie)}
                </small>
              </span>
              <StatsEleve r={r} />
              {r.quinzaine?.some((m) => m > 0) ? <CourbeQuinzaine minutes={r.quinzaine} /> : null}
              <span className="chevron" aria-hidden="true">
                <ChevronRight size={20} />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {archivesVisibles.length > 0 ? (
        <details className="archives" open={recherche.trim() !== "" || undefined}>
          <summary>Élèves archivés ({archivesVisibles.length})</summary>
          <ul className="archives-liste">
            {archivesVisibles.map((r) => (
              <li key={r.eleve.id}>
                <Link href={`/maitre/eleves/${r.eleve.id}`}>
                  {r.eleve.prenom} {r.eleve.nom}
                </Link>
                <form action={actionArchiverEleve}>
                  <input type="hidden" name="eleveId" value={r.eleve.id} />
                  <input type="hidden" name="actif" value="true" />
                  <button type="submit" className="bouton-lien-texte">
                    Réactiver
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

/**
 * Petite courbe de régularité : une barre par jour sur les 14 derniers jours
 * (hauteur = temps de travail, jour sans séance = simple point). Aujourd'hui à droite.
 */
function CourbeQuinzaine({ minutes }: { minutes: number[] }) {
  const max = Math.max(30, ...minutes);
  const jours = minutes.filter((m) => m > 0).length;
  const L = 4;
  const H = 20;
  return (
    <span
      className="courbe-quinzaine"
      title={`${jours} jour${jours > 1 ? "s" : ""} travaillé${jours > 1 ? "s" : ""} sur les 14 derniers`}
    >
      <svg
        viewBox={`0 0 ${minutes.length * L} ${H}`}
        width={minutes.length * L}
        height={H}
        role="img"
        aria-label={`Régularité : ${jours} jour${jours > 1 ? "s" : ""} travaillé${jours > 1 ? "s" : ""} sur les 14 derniers`}
      >
        {minutes.map((m, i) => {
          const h = m > 0 ? Math.max(5, (m / max) * H) : 2.5;
          return (
            <rect
              key={i}
              x={i * L + 0.5}
              y={H - h}
              width={L - 1}
              height={h}
              rx={1}
              className={
                m > 0
                  ? i === minutes.length - 1
                    ? "courbe-jour courbe-aujourdhui"
                    : "courbe-jour"
                  : "courbe-vide"
              }
              style={{ "--i": i } as CSSProperties}
            />
          );
        })}
      </svg>
    </span>
  );
}

/**
 * Chiffres du mois sur une ligne : seulement ce qui n'est pas nul, chacun avec son icône
 * (vert = apprentissage, or = révision). Rien du tout si l'élève n'a encore rien fait ce mois-ci.
 */
function StatsEleve({ r }: { r: ResumeEleve }) {
  const elements = [
    r.minutesApprentissage
      ? {
          cle: "a",
          Icone: BookPlus,
          classe: "stat-apprentissage",
          valeur: formaterDuree(r.minutesApprentissage),
          libelle: "d’apprentissage",
        }
      : null,
    r.minutesRevision
      ? {
          cle: "r",
          Icone: RotateCcw,
          classe: "stat-revision",
          valeur: formaterDuree(r.minutesRevision),
          libelle: "de révision",
        }
      : null,
    r.joursTravailles
      ? {
          cle: "j",
          Icone: CalendarCheck,
          classe: "",
          valeur: `${r.joursTravailles} j`,
          libelle: `jour${r.joursTravailles > 1 ? "s" : ""} travaillé${r.joursTravailles > 1 ? "s" : ""}`,
        }
      : null,
    r.objectifsTotal
      ? {
          cle: "o",
          Icone: Target,
          classe: "",
          valeur: `${r.objectifsAtteints}/${r.objectifsTotal}`,
          libelle: "objectifs atteints",
        }
      : null,
  ].filter((e) => e !== null);
  if (!elements.length) return null;
  return (
    <span className="carte-eleve-stats">
      {elements.map(({ cle, Icone, classe, valeur, libelle }) => (
        <span key={cle} className={classe || undefined} title={`${valeur} ${libelle}`}>
          <Icone size={14} strokeWidth={2.4} aria-hidden="true" />
          <b>{valeur}</b>
          <span className="visuellement-cache"> {libelle}</span>
        </span>
      ))}
    </span>
  );
}
