"use client";

import {
  BookPlus,
  CalendarCheck,
  ChevronRight,
  Eye,
  Headphones,
  RotateCcw,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  MoveRight,
} from "lucide-react";
import Link from "next/link";
import { ApercuEleve } from "./ApercuEleve";
import { Avatar } from "./Avatar";
import { EtiquetteLecture } from "./ChoixLecture";
import { EtatVide } from "./EtatVide";
import { SousTitreEntete } from "./SousTitreEntete";
import { EcouteRapide } from "./EcouteRapide";
import { CHOIX, useChoix } from "./RetenirChoix";
import {
  useState,
  type CSSProperties,
  type MouseEvent as SourisReact,
  type TouchEvent as ToucherReact,
} from "react";
import { retoursActives } from "./retourSensoriel";
import { actionArchiverEleve } from "@/app/actions/classe";
import { correspondARecherche, JOURS_A_VOIR, phraseEleve, type ResumeEleve } from "@/domain/classe";
import { formaterDuree } from "@/domain/fiche";
import { sensQuinzaine } from "@/domain/tendance";

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
  /** Élève dont les séances à écouter sont ouvertes dans la feuille du bas. */
  const [ecoute, setEcoute] = useState<{ id: string; prenom: string; nom: string } | null>(null);
  /** Élève dont l'aperçu rapide est ouvert (toucher sa photo, ou appui long sur sa carte). */
  const [apercu, setApercu] = useState<ResumeEleve | null>(null);
  const visibles = actifs.filter((r) => correspondARecherche(r.eleve, recherche));
  const archivesVisibles = archives.filter((r) => correspondARecherche(r.eleve, recherche));

  const aEcouter = actifs.reduce((t, r) => t + r.aVoir, 0);
  // La lecture de la plupart des élèves ne s'affiche pas : seule l'exception se voit (moins de bruit sur téléphone).
  const nbWarsh = actifs.filter((r) => r.eleve.lecture === "warsh").length;
  const lectureCourante = nbWarsh > actifs.length / 2 ? "warsh" : "hafs";
  // La fiche s'ouvre sur l'onglet choisi la dernière fois (apprentissage ou révision).
  const onglet = useChoix(CHOIX.ongletFiche) === "revision" ? "&type=revision" : "";
  return (
    <>
      <SousTitreEntete
        texte={`${actifs.length} élève${actifs.length > 1 ? "s" : ""}${
          aEcouter ? ` · ${aEcouter} séance${aEcouter > 1 ? "s" : ""} à écouter` : ""
        }`}
      />
      {aEcouter ? (
        <section className="a-ecouter" aria-labelledby="a-ecouter-titre">
          <h2 id="a-ecouter-titre">
            <Headphones size={18} aria-hidden="true" /> À écouter
            <span className="a-ecouter-total">{aEcouter}</span>
          </h2>
          <ul>
            {actifs
              .filter((r) => r.aVoir > 0)
              .map((r) => (
                <li key={r.eleve.id}>
                  <button type="button" className="a-ecouter-eleve" onClick={() => setEcoute(r.eleve)}>
                    <Avatar prenom={r.eleve.prenom} nom={r.eleve.nom} cle={r.eleve.id} />
                    <span>{r.eleve.prenom}</span>
                    <strong aria-label={`${r.aVoir} séance${r.aVoir > 1 ? "s" : ""}`}>{r.aVoir}</strong>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
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
                  : `/maitre/eleves/${r.eleve.id}?mois=${cleMois}${onglet}`
              }
              className="carte-eleve"
              data-ouvre-en-page
              {...appuiLong(
                () => setApercu(r),
                () => setEcoute(r.eleve),
              )}
            >
              {/* La photo ouvre l'aperçu rapide (la carte, elle, ouvre la fiche). */}
              <span className="carte-eleve-apercu" data-apercu title="Aperçu rapide">
                <Avatar prenom={r.eleve.prenom} nom={r.eleve.nom} cle={r.eleve.id} />
                <span className="carte-eleve-oeil" aria-hidden="true">
                  <Eye size={11} strokeWidth={2.6} />
                </span>
              </span>
              <span className="carte-eleve-nom">
                {r.eleve.prenom} {r.eleve.nom}
                {r.eleve.lecture !== lectureCourante ? (
                  <EtiquetteLecture lecture={r.eleve.lecture ?? null} />
                ) : null}
                {r.aVoir > 0 ? (
                  // Toucher la pastille : les séances s'ouvrent ici, dans une feuille, sans quitter la liste.
                  <span
                    className="pastille-or pastille-a-voir pastille-touchable"
                    title={`Séances des ${JOURS_A_VOIR} derniers jours pas encore vues`}
                    data-sans-navigation
                  >
                    {r.aVoir} séance{r.aVoir > 1 ? "s" : ""} à écouter
                    <ChevronRight size={14} strokeWidth={2.6} aria-hidden="true" />
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
              {/* Téléphone : une flèche à la place de la courbe (la carte tient sur deux lignes). */}
              {r.quinzaine ? <FlecheTendance minutes={r.quinzaine} /> : null}
              {r.quinzaine?.some((m) => m > 0) ? <CourbeQuinzaine minutes={r.quinzaine} /> : null}
              <span className="chevron" aria-hidden="true">
                <ChevronRight size={20} />
              </span>
            </Link>
            <button type="button" className="visuellement-cache" onClick={() => setApercu(r)}>
              Aperçu rapide de {r.eleve.prenom}
            </button>
            {r.aVoir > 0 ? (
              // Clavier et lecteurs d'écran : la même écoute rapide, par un vrai bouton.
              <button type="button" className="visuellement-cache" onClick={() => setEcoute(r.eleve)}>
                Écouter les séances de {r.eleve.prenom} sans quitter la liste
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <EcouteRapide eleve={ecoute} onFermer={() => setEcoute(null)} />
      <ApercuEleve
        eleve={apercu?.eleve ?? null}
        aVoir={apercu?.aVoir ?? 0}
        lienFiche={apercu ? `/maitre/eleves/${apercu.eleve.id}?mois=${cleMois}${onglet}` : "#"}
        onEcouter={() => {
          const e = apercu?.eleve ?? null;
          setApercu(null);
          setEcoute(e);
        }}
        onFermer={() => setApercu(null)}
      />

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
const FLECHES = {
  hausse: { Icone: TrendingUp, libelle: "En hausse sur 7 jours" },
  stable: { Icone: MoveRight, libelle: "Stable sur 7 jours" },
  baisse: { Icone: TrendingDown, libelle: "En baisse sur 7 jours" },
} as const;

/** Flèche de tendance (7 derniers jours contre les 7 d'avant). */
function FlecheTendance({ minutes }: { minutes: number[] }) {
  const sens = sensQuinzaine(minutes);
  if (sens === "aucune") return null;
  const { Icone, libelle } = FLECHES[sens];
  return (
    <span className={`carte-eleve-fleche fleche-${sens}`} title={libelle}>
      <Icone size={16} strokeWidth={2.4} aria-hidden="true" />
      <span className="visuellement-cache">{libelle}</span>
    </span>
  );
}

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

/** Durée d'appui pour ouvrir l'écoute rapide. */
const APPUI_LONG_MS = 450;

/**
 * Appui long sur la carte ou toucher sa photo : aperçu rapide de l'élève.
 * Toucher sa pastille « à écouter » : écoute rapide.
 * La carte reste un lien : un toucher simple ouvre la fiche comme avant.
 * (État hors du rendu : la feuille qui s'ouvre fait un nouveau rendu pendant que le doigt est posé.)
 */
const appui: { minuteur?: number; depart: { x: number; y: number } | null; ouvert: boolean } = {
  depart: null,
  ouvert: false,
};

function arreterAppui() {
  window.clearTimeout(appui.minuteur);
  appui.depart = null;
}

function appuiLong(ouvrir: () => void, ecouter: () => void) {
  return {
    onTouchStart: (e: ToucherReact) => {
      appui.ouvert = false;
      const t = e.touches[0];
      if (!t || e.touches.length !== 1) return;
      appui.depart = { x: t.clientX, y: t.clientY };
      window.clearTimeout(appui.minuteur);
      appui.minuteur = window.setTimeout(() => {
        appui.ouvert = true;
        if (retoursActives()) navigator.vibrate?.(12);
        ouvrir();
      }, APPUI_LONG_MS);
    },
    onTouchMove: (e: ToucherReact) => {
      const t = e.touches[0];
      const d = appui.depart;
      if (d && t && Math.hypot(t.clientX - d.x, t.clientY - d.y) > 10) arreterAppui();
    },
    onTouchEnd: (e: ToucherReact) => {
      arreterAppui();
      // Feuille ouverte par l'appui : pas de « clic » qui ouvrirait aussi la fiche.
      if (appui.ouvert) e.preventDefault();
    },
    onTouchCancel: arreterAppui,
    onContextMenu: (e: SourisReact) => {
      e.preventDefault();
      if (!appui.ouvert) ouvrir();
      appui.ouvert = true;
    },
    onClickCapture: (e: SourisReact) => {
      const cible = e.target instanceof Element ? e.target : null;
      const surPastille = cible?.closest("[data-sans-navigation]");
      const surPhoto = cible?.closest("[data-apercu]");
      if (!appui.ouvert && !surPastille && !surPhoto) return;
      e.preventDefault();
      e.stopPropagation();
      if (!appui.ouvert) {
        if (surPastille) ecouter();
        else ouvrir();
      }
      appui.ouvert = false;
    },
  };
}
