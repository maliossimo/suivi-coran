"use client";

import { BookOpenText, Moon, Pause, Play, Repeat, Settings2, SkipBack, SkipForward, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  FAMILLES_TAJWID,
  chiffresArabes,
  cleVerset,
  decouperMots,
  decouperMotsTajwid,
  etapeSuivante,
  libelleMinuterie,
  volumeMinuterie,
  familleTajwid,
  fichierVerset,
  motA,
  pistesLecture,
  resumeCourtMemoriser,
  type Passage,
  type Piste,
  type Position,
  type RepereMot,
  type Repetition,
  type SegmentTajwid,
} from "@/domain/coran";
import { ActionsVerset, type ModeVerset } from "./ActionsVerset";
import { useAppuiLong } from "./appuiLong";
import { useMarquePages } from "./marquePages";
import { retourSensoriel } from "@/components/retourSensoriel";
import { useExplication } from "./explications";
import { adresseAudio, adresseMots, useHorsLigne } from "./horsLigne";
import { MemoriserCoran } from "./MemoriserCoran";
import { ReglagesCoran, TAILLES, type ChoixMinuterie, type Reglages } from "./ReglagesCoran";
import type { BlocAffiche, RecitationAffichee } from "./types";

const CLE = "coran-reglages";
const UNE_FOIS: Repetition = { verset: 1, passage: 1 };
const DEFAUT: Reglages = {
  recitation: {},
  vitesse: 1,
  suivre: true,
  tajwid: false,
  motParMot: true,
  taille: 2,
  favoris: [],
  theme: "auto",
};

function lireReglages(): Reglages {
  try {
    return { ...DEFAUT, ...(JSON.parse(localStorage.getItem(CLE) ?? "{}") as Partial<Reglages>) };
  } catch {
    return DEFAUT;
  }
}

/** Repères mot par mot déjà chargés (url → repères). */
const reperesCharges = new Map<string, Promise<RepereMot[] | null>>();
function chargerReperes(url: string): Promise<RepereMot[] | null> {
  let p = reperesCharges.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { words?: { index: number; startMs: number; endMs: number }[] } | null) =>
        d?.words ? d.words.map((w) => ({ mot: w.index, debut: w.startMs, fin: w.endMs })) : null,
      )
      .catch(() => null);
    reperesCharges.set(url, p);
  }
  return p;
}

/**
 * Lecture du Coran : texte (avec ou sans tajwid), récitation, suivi du verset et du mot récités,
 * mémorisation d'un passage (répétitions), vue sourate ou page du mushaf.
 */
export function LectureCoran({
  lecture,
  vue,
  blocs,
  passageInitial,
  correspondance,
  recitations,
  bibliothequeDisponible,
  titre,
  liensLecture,
  pagePrecedente,
  pageSuivante,
  piedDePage,
}: {
  lecture: "hafs" | "warsh";
  vue: "sourate" | "page";
  blocs: BlocAffiche[];
  passageInitial: Passage | null;
  correspondance: Record<string, number[][]> | null;
  recitations: RecitationAffichee[];
  bibliothequeDisponible: boolean;
  titre: string;
  /** Même endroit, l'autre lecture (Hafs / Warsh). */
  liensLecture: Record<"hafs" | "warsh", string>;
  pagePrecedente: string | null;
  pageSuivante: string | null;
  piedDePage: ReactNode;
}) {
  const router = useRouter();
  const [reglages, setReglages] = useState<Reglages>(DEFAUT);
  const [ouvert, setOuvert] = useState<"reglages" | "memoriser" | null>(null);
  /** Verset touché (actions) ou appuyé longuement (explication) : sa feuille est ouverte. */
  const [choix, setChoix] = useState<{ cle: string; mode: ModeVerset } | null>(null);
  const versetChoisi = choix?.cle ?? null;
  /** Arrêt automatique : heure de fin, « à la fin du passage », ou rien. */
  const [minuterie, setMinuterie] = useState<{ fin: number; choix: ChoixMinuterie } | "fin" | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  /** Passage proposé à l'ouverture de « Mémoriser ». */
  const [brouillon, setBrouillon] = useState<Passage | null>(null);
  const [joue, setJoue] = useState(false);
  const [charge, setCharge] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [mot, setMot] = useState<number | null>(null);
  const [progression, setProgression] = useState({ temps: 0, duree: 0 });
  const [erreur, setErreur] = useState<string | null>(null);
  const [passage, setPassage] = useState(passageInitial);
  const [repetition, setRepetition] = useState<Repetition>(UNE_FOIS);
  const audio = useRef<HTMLAudioElement>(null);
  const prochain = useRef<HTMLAudioElement | null>(null);
  const positionRef = useRef<Position | null>(null);
  const reperes = useRef<RepereMot[] | null>(null);
  const texte = useRef<HTMLDivElement>(null);
  /**
   * Récitation à lancer une fois le nouveau passage appliqué :
   * undefined = rien ; null = depuis le début ; sinon la clé du verset de départ.
   */
  const aLancer = useRef<string | null | undefined>(undefined);

  useEffect(() => setReglages(lireReglages()), []);
  const modifier = useCallback((m: Partial<Reglages>) => {
    setReglages((r) => {
      const n = { ...r, ...m };
      try {
        localStorage.setItem(CLE, JSON.stringify(n));
      } catch {
        // stockage indisponible : le réglage vaut pour cette visite
      }
      return n;
    });
  }, []);

  // Le dernier choisi pour cette lecture, sinon le premier favori disponible, sinon le premier.
  const recitation =
    recitations.find((r) => r.id === reglages.recitation[lecture]) ??
    recitations.find((r) => reglages.favoris.includes(r.id)) ??
    recitations[0] ??
    null;
  const sourateUnique = vue === "sourate" ? blocs[0] : undefined;
  const avecTajwid = lecture === "hafs" && reglages.tajwid;
  const motsActifs = Boolean(recitation?.mots && reglages.motParMot);

  // Fichiers à réciter, limités au passage choisi.
  const pistes = useMemo<Piste[]>(() => {
    const dansPassage = (n: number) => !passage || (n >= passage.du && n <= passage.au);
    return pistesLecture(
      blocs.map((b) => ({
        sourate: b.sourate,
        versets: b.versets.map((v) => v.n).filter(dansPassage),
        basmala: b.basmala !== null && (!passage || passage.du === 1),
      })),
      correspondance ? (s) => correspondance[String(s)] : undefined,
    );
  }, [blocs, correspondance, passage]);

  // Toute la sourate (ou la page), pour le téléchargement hors ligne.
  const pistesCompletes = useMemo<Piste[]>(
    () =>
      pistesLecture(
        blocs.map((b) => ({
          sourate: b.sourate,
          versets: b.versets.map((v) => v.n),
          basmala: b.basmala !== null,
        })),
        correspondance ? (s) => correspondance[String(s)] : undefined,
      ),
    [blocs, correspondance],
  );
  const horsLigne = useHorsLigne({
    dossier: recitation?.suivi ? recitation.dossier : null,
    alignement: recitation?.alignement ?? null,
    lecture,
    pistes: pistesCompletes,
  });
  const { telecharges } = horsLigne;
  /** Adresse d'un fichier : sur le téléphone s'il est téléchargé, sinon chez EveryAyah. */
  const adresse = useCallback(
    (fichier: string) =>
      recitation?.dossier && telecharges.has(fichier)
        ? adresseAudio(recitation.dossier, fichier)
        : `${recitation?.source ?? ""}${fichier}`,
    [recitation, telecharges],
  );

  const piste = position ? pistes[position.piste] : undefined;
  const clesActives = useMemo(() => new Set(piste?.cles ?? []), [piste]);

  const arreter = useCallback(() => {
    audio.current?.pause();
    setJoue(false);
    setCharge(false);
    positionRef.current = null;
    setPosition(null);
    setMot(null);
    reperes.current = null;
  }, []);

  const jouer = useCallback(
    (pos: Position) => {
      const a = audio.current;
      const p = pistes[pos.piste];
      if (!a || !recitation || !p) return;
      setErreur(null);
      positionRef.current = pos;
      setPosition(pos);
      setMot(null);
      reperes.current = null;
      const fichier = fichierVerset(p.sourate, p.ayah);
      if (!a.src.endsWith(`/${fichier}`) || pos.foisVerset === 0 || a.ended) {
        a.src = adresse(fichier);
      }
      a.currentTime = 0;
      a.playbackRate = reglages.vitesse;
      setCharge(true);
      void a.play().catch(() => setJoue(false));
      if (recitation.mots && p.cles.length === 1) {
        const url =
          recitation.alignement && telecharges.has(fichier)
            ? adresseMots(recitation.alignement, p.sourate, p.ayah)
            : `${recitation.mots}${p.sourate}/${p.ayah}.json`;
        void chargerReperes(url).then((r) => {
          if (positionRef.current === pos) reperes.current = r;
        });
      }
      const suivante = pistes[pos.piste + 1];
      if (suivante) {
        prochain.current ??= new Audio();
        prochain.current.preload = "auto";
        prochain.current.src = adresse(fichierVerset(suivante.sourate, suivante.ayah));
      }
    },
    [adresse, pistes, recitation, reglages.vitesse, telecharges],
  );

  const lancerDepuis = useCallback(
    (cle?: string) => {
      const a = audio.current;
      if (!a || !recitation) return;
      if (recitation.suivi) {
        const i = cle ? pistes.findIndex((p) => p.cles.includes(cle)) : 0;
        if (i >= 0) jouer({ piste: i, foisVerset: 0, foisPassage: 0 });
        return;
      }
      const s = String(blocs[0]?.sourate ?? 1).padStart(3, "0");
      if (!a.src.endsWith(`/${s}.mp3`)) a.src = `${recitation.source}${s}.mp3`;
      a.playbackRate = reglages.vitesse;
      setCharge(true);
      void a.play().catch(() => setJoue(false));
    },
    [blocs, jouer, pistes, recitation, reglages.vitesse],
  );

  const basculer = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    const enCours = recitation?.suivi ? positionRef.current !== null : a.currentTime > 0;
    if (a.getAttribute("src") && enCours && !a.ended) void a.play();
    else lancerDepuis();
  }, [lancerDepuis, recitation?.suivi]);

  const decaler = useCallback(
    (pas: number) => {
      if (!recitation?.suivi) {
        const a = audio.current;
        if (a) a.currentTime = Math.max(0, a.currentTime + pas * 10);
        return;
      }
      const i = Math.min(pistes.length - 1, Math.max(0, (positionRef.current?.piste ?? -1) + pas));
      jouer({ piste: i, foisVerset: 0, foisPassage: positionRef.current?.foisPassage ?? 0 });
    },
    [jouer, pistes.length, recitation?.suivi],
  );

  const fin = () => {
    if (!recitation?.suivi) {
      setJoue(false);
      return;
    }
    const pos = positionRef.current;
    const suite = pos ? etapeSuivante(pos, pistes.length, repetition) : null;
    // Minuterie « à la fin » : on s'arrête au bout du passage, même s'il se répète.
    const finDuTour =
      !suite || (pos !== null && pos.piste === pistes.length - 1 && suite.piste !== pos.piste);
    if (minuterie === "fin" && finDuTour) {
      setMinuterie(null);
      arreter();
      return;
    }
    if (suite) jouer(suite);
    else arreter();
  };

  // Minuterie : décompte, fondu des dernières secondes, puis pause.
  const finMinuterie = minuterie !== null && minuterie !== "fin" ? minuterie.fin : null;
  useEffect(() => {
    if (finMinuterie === null) return;
    const element = audio.current;
    const tic = () => {
      const reste = finMinuterie - Date.now();
      setMaintenant(Date.now());
      const a = audio.current;
      if (a) a.volume = volumeMinuterie(reste);
      if (reste <= 0) {
        a?.pause();
        if (a) a.volume = 1;
        setMinuterie(null);
      }
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => {
      clearInterval(id);
      if (element) element.volume = 1;
    };
  }, [finMinuterie]);

  const choisirMinuterie = (c: ChoixMinuterie) => {
    if (c === 0) setMinuterie(null);
    else if (c === -1) setMinuterie("fin");
    else setMinuterie({ fin: Date.now() + c * 60_000, choix: c });
  };

  // Changement de récitateur ou de passage : on repart de zéro.
  useEffect(() => {
    arreter();
    setErreur(null);
    setProgression({ temps: 0, duree: 0 });
    audio.current?.removeAttribute("src");
  }, [recitation?.id, passage, arreter]);

  useEffect(() => {
    const depart = aLancer.current;
    if (depart === undefined) return;
    aLancer.current = undefined;
    lancerDepuis(depart ?? undefined);
    // Seulement quand les fichiers à réciter changent (nouveau passage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pistes]);

  /** Applique un passage (ou toute la sourate) et lance la récitation, depuis `cle` si donnée. */
  const ecouter = useCallback(
    (nouveau: Passage | null, rep: Repetition, cle?: string) => {
      setRepetition(rep);
      setOuvert(null);
      setChoix(null);
      const meme = nouveau?.du === passage?.du && nouveau?.au === passage?.au;
      if (meme) {
        lancerDepuis(cle);
      } else {
        aLancer.current = cle ?? null;
        setPassage(nouveau);
      }
    },
    [lancerDepuis, passage],
  );

  const numero = (cle: string) => Number(cle.split(":")[1]);
  const dansLePassage = (cle: string) => !passage || (numero(cle) >= passage.du && numero(cle) <= passage.au);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = reglages.vitesse;
  }, [reglages.vitesse]);

  // Mot récité : suivi fin pendant la lecture.
  useEffect(() => {
    if (!joue || !motsActifs) return;
    let image = 0;
    const suivre = () => {
      const a = audio.current;
      if (a && reperes.current) {
        const m = motA(reperes.current, a.currentTime * 1000);
        setMot((ancien) => (ancien === m ? ancien : m));
      }
      image = requestAnimationFrame(suivre);
    };
    image = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(image);
  }, [joue, motsActifs]);

  // Le verset récité reste au centre de l'écran.
  const premiereCle = piste?.cles[0];
  useEffect(() => {
    if (!premiereCle || !reglages.suivre) return;
    texte.current
      ?.querySelector<HTMLElement>(`[data-cle="${premiereCle}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [premiereCle, reglages.suivre]);

  // Écran verrouillé, casque, montre : titre et commandes.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !recitation) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: piste?.cles[0] ? `${titre} · ${piste.cles[0].replace(/:0$/, " · basmala")}` : titre,
      artist: recitation.nom,
      album: "Suivi cours Coran",
    });
    navigator.mediaSession.setActionHandler("play", basculer);
    navigator.mediaSession.setActionHandler("pause", basculer);
    navigator.mediaSession.setActionHandler("previoustrack", () => decaler(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => decaler(1));
  }, [basculer, decaler, piste, recitation, titre]);

  // Vue page : glisser pour tourner les pages (sens du mushaf : vers la droite = page suivante).
  const depart = useRef<{ x: number; y: number } | null>(null);

  /** Toucher : actions du verset ; appui long : son explication. */
  const appui = useAppuiLong(
    (cle) => setChoix({ cle, mode: "actions" }),
    (cle) => {
      setChoix({ cle, mode: "explication" });
      fermerAstuce();
    },
  );

  // Marque-pages de cette lecture.
  const marquePages = useMarquePages();
  const marques = useMemo(
    () =>
      new Set(
        marquePages.liste.filter((m) => m.lecture === lecture).map((m) => cleVerset(m.sourate, m.verset)),
      ),
    [lecture, marquePages.liste],
  );

  // Arrivée depuis un marque-page (#verset-18-10) : le verset au centre, mis en évidence.
  useEffect(() => {
    let minuterieRepere: ReturnType<typeof setTimeout> | undefined;
    const allerAuRepere = () => {
      const m = /^#verset-(\d+)-(\d+)$/.exec(window.location.hash);
      const el = m && texte.current?.querySelector<HTMLElement>(`[data-cle="${m[1]}:${m[2]}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.classList.add("repere");
      clearTimeout(minuterieRepere);
      minuterieRepere = setTimeout(() => el.classList.remove("repere"), 2500);
    };
    allerAuRepere();
    window.addEventListener("hashchange", allerAuRepere);
    return () => {
      window.removeEventListener("hashchange", allerAuRepere);
      clearTimeout(minuterieRepere);
    };
  }, []);

  // Astuce affichée une seule fois : l'appui long.
  const [astuce, setAstuce] = useState(false);
  useEffect(() => {
    try {
      setAstuce(localStorage.getItem("coran-astuce-appui-long") !== "vue");
    } catch {
      // stockage indisponible : pas d'astuce
    }
  }, []);
  const fermerAstuce = () => {
    setAstuce(false);
    try {
      localStorage.setItem("coran-astuce-appui-long", "vue");
    } catch {
      // stockage indisponible
    }
  };

  const etat =
    erreur ??
    (recitation?.suivi
      ? position
        ? `${libelleCles(piste?.cles ?? [])}${repetition.verset > 1 ? ` · ${position.foisVerset + 1}/${repetition.verset}` : ""}${
            passage && repetition.passage !== 1
              ? ` · tour ${position.foisPassage + 1}${repetition.passage ? `/${repetition.passage}` : ""}`
              : ""
          }`
        : "▶ ou touche un verset"
      : progression.duree
        ? `${minutes(progression.temps)} / ${minutes(progression.duree)}`
        : "Écoute de la sourate entière");

  const memorisation = Boolean(sourateUnique && recitation?.suivi);
  const explication = useExplication(lecture, choix?.mode === "explication" ? choix.cle : null);
  /** Fichier du récitateur pour le verset choisi (comparer sa récitation). */
  const adresseRecitateur = useMemo(() => {
    if (!versetChoisi || !recitation?.suivi) return null;
    const p = pistesCompletes.find((x) => x.cles.includes(versetChoisi));
    return p ? adresse(fichierVerset(p.sourate, p.ayah)) : null;
  }, [adresse, pistesCompletes, recitation?.suivi, versetChoisi]);
  /** Texte du verset choisi (vérifier sa récitation). */
  const texteVerset = useMemo(() => {
    if (!versetChoisi) return null;
    const [sourate, n] = versetChoisi.split(":").map(Number);
    return blocs.find((b) => b.sourate === sourate)?.versets.find((v) => v.n === n)?.texte ?? null;
  }, [blocs, versetChoisi]);
  const ouvrirMemoriser = (depart: Passage) => {
    setChoix(null);
    setBrouillon(depart);
    setOuvert("memoriser");
  };

  return (
    <>
      <section className="coran-lecteur" aria-label="Récitation">
        {passage && sourateUnique ? (
          <div className="coran-lecteur-passage">
            <Repeat size={15} aria-hidden="true" />
            <button type="button" onClick={() => ouvrirMemoriser(passage)}>
              {resumeCourtMemoriser(passage, repetition)}
            </button>
            <button
              type="button"
              className="coran-lecteur-effacer"
              onClick={() => {
                setPassage(null);
                setRepetition(UNE_FOIS);
              }}
              aria-label="Revenir à toute la sourate"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {minuterie ? (
          <div className="coran-lecteur-passage coran-lecteur-minuterie">
            <Moon size={15} aria-hidden="true" />
            <span>
              {minuterie === "fin"
                ? "Arrêt à la fin"
                : `Arrêt dans ${libelleMinuterie(minuterie.fin - (maintenant || Date.now()))}`}
            </span>
            <button
              type="button"
              className="coran-lecteur-effacer"
              onClick={() => setMinuterie(null)}
              aria-label="Annuler l’arrêt automatique"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div className="coran-barre-ligne">
          <button
            type="button"
            className="coran-bouton"
            onClick={() => decaler(-1)}
            disabled={!recitation}
            aria-label={recitation?.suivi ? "Verset précédent" : "Reculer de 10 secondes"}
          >
            <SkipBack size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={charge && joue ? "coran-bouton coran-lecture charge" : "coran-bouton coran-lecture"}
            onClick={basculer}
            disabled={!recitation}
            aria-label={joue ? "Pause" : "Écouter"}
          >
            {joue ? <Pause size={24} aria-hidden="true" /> : <Play size={24} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="coran-bouton"
            onClick={() => decaler(1)}
            disabled={!recitation}
            aria-label={recitation?.suivi ? "Verset suivant" : "Avancer de 10 secondes"}
          >
            <SkipForward size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="coran-barre-infos"
            onClick={() => setOuvert("reglages")}
            aria-label="Choisir le récitateur"
          >
            <strong>
              {recitation
                ? `${recitation.nom}${recitation.style ? ` · ${recitation.style}` : ""}`
                : "Aucune récitation"}
            </strong>
            <span className={erreur ? "erreur" : undefined}>{etat}</span>
          </button>
          {memorisation ? (
            <button
              type="button"
              className={passage ? "coran-bouton coran-bouton-actif" : "coran-bouton"}
              onClick={() => ouvrirMemoriser(passage ?? { du: 1, au: Math.min(5, sourateUnique!.nbVersets) })}
              aria-haspopup="dialog"
              aria-label="Mémoriser un passage"
            >
              <Repeat size={20} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="coran-bouton"
            onClick={() => setOuvert("reglages")}
            aria-haspopup="dialog"
            aria-label="Réglages"
          >
            <Settings2 size={20} aria-hidden="true" />
          </button>
        </div>

        {!recitation?.suivi && progression.duree ? (
          <input
            type="range"
            className="coran-avancement"
            min={0}
            max={Math.round(progression.duree)}
            value={Math.round(progression.temps)}
            onChange={(e) => {
              if (audio.current) audio.current.currentTime = Number(e.target.value);
            }}
            aria-label="Position dans la récitation"
          />
        ) : null}

        <audio
          ref={audio}
          preload="none"
          onPlay={() => setJoue(true)}
          onPause={() => setJoue(false)}
          onPlaying={() => setCharge(false)}
          onWaiting={() => setCharge(true)}
          onEnded={fin}
          onTimeUpdate={(e) =>
            setProgression({ temps: e.currentTarget.currentTime, duree: e.currentTarget.duration || 0 })
          }
          onError={() => {
            if (!audio.current?.getAttribute("src")) return;
            setErreur(
              navigator.onLine
                ? "Récitation introuvable pour ce passage. Essaie un autre récitateur."
                : "Pas de réseau : télécharge cette sourate (Réglages → Hors ligne) pour l’écouter sans connexion.",
            );
            arreter();
          }}
        />
      </section>

      <ReglagesCoran
        ouverte={ouvert === "reglages"}
        onFermer={() => setOuvert(null)}
        lecture={lecture}
        liensLecture={liensLecture}
        vue={vue}
        reglages={reglages}
        modifier={modifier}
        recitations={recitations}
        recitation={recitation}
        bibliothequeDisponible={bibliothequeDisponible}
        horsLigne={horsLigne}
        minuterie={minuterie === null ? 0 : minuterie === "fin" ? -1 : minuterie.choix}
        onMinuterie={choisirMinuterie}
      />

      {sourateUnique ? (
        <MemoriserCoran
          ouverte={ouvert === "memoriser"}
          onFermer={() => setOuvert(null)}
          nbVersets={sourateUnique.nbVersets}
          depart={brouillon ?? passage ?? { du: 1, au: sourateUnique.nbVersets }}
          repetitionDepart={passage ? repetition : { verset: 3, passage: 1 }}
          passageActif={passage !== null}
          onEcouter={(p, r) => ecouter(p, r)}
          onEffacer={() => {
            setOuvert(null);
            setPassage(null);
            setRepetition(UNE_FOIS);
          }}
        />
      ) : null}

      <ActionsVerset
        cle={versetChoisi}
        mode={choix?.mode ?? "actions"}
        onMode={(mode) => setChoix((c) => (c ? { ...c, mode } : c))}
        onFermer={() => setChoix(null)}
        lecture={lecture}
        suivi={Boolean(recitation?.suivi)}
        memorisation={memorisation}
        explication={explication}
        marque={versetChoisi !== null && marques.has(versetChoisi)}
        adresseRecitateur={adresseRecitateur}
        texteVerset={texteVerset}
        onMarque={(cle) => {
          const [sourate, verset] = cle.split(":").map(Number) as [number, number];
          marquePages.basculer({ lecture, sourate, verset });
          retourSensoriel("leger");
        }}
        onAvantEnregistrement={() => audio.current?.pause()}
        onEcouter={(cle) =>
          ecouter(dansLePassage(cle) ? passage : null, dansLePassage(cle) ? repetition : UNE_FOIS, cle)
        }
        onRepeter={(cle) => ecouter({ du: numero(cle), au: numero(cle) }, { verset: 1, passage: 0 })}
        onMemoriser={(cle) =>
          ouvrirMemoriser({
            du: numero(cle),
            au: Math.min(numero(cle) + 4, sourateUnique?.nbVersets ?? numero(cle)),
          })
        }
        onReglages={() => {
          setChoix(null);
          setOuvert("reglages");
        }}
      />

      {astuce ? (
        <p className="coran-astuce" role="note">
          <span>
            <b>Astuce :</b> touche un verset pour l’écouter ou le mémoriser, <b>appui long</b> pour son
            explication.
          </span>
          <button type="button" onClick={fermerAstuce} aria-label="J’ai compris">
            <X size={16} aria-hidden="true" />
          </button>
        </p>
      ) : null}

      <article
        className={[
          "coran-page",
          `coran-${lecture}`,
          vue === "page" ? "coran-vue-page" : "",
          avecTajwid ? "coran-tajwid" : "",
          "cliquable",
          passage ? "avec-passage" : "",
          reglages.theme !== "auto" ? `theme-${reglages.theme}` : "",
        ].join(" ")}
        lang="ar"
        dir="rtl"
        style={{ "--taille-coran": `${TAILLES[reglages.taille]}px` } as CSSProperties}
        onTouchStart={(e) => {
          if (vue !== "page" || e.touches.length !== 1) return;
          depart.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY };
        }}
        onTouchEnd={(e) => {
          const d = depart.current;
          depart.current = null;
          if (!d || vue !== "page") return;
          const dx = e.changedTouches[0]!.clientX - d.x;
          const dy = e.changedTouches[0]!.clientY - d.y;
          if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
          const cible = dx > 0 ? pageSuivante : pagePrecedente;
          if (cible) router.push(cible, { scroll: false });
        }}
      >
        <div ref={texte} {...appui}>
          {blocs.map((b) => (
            <section key={b.sourate} className="coran-bloc">
              {vue === "page" && b.debut ? (
                <header className="coran-titre-sourate">
                  <span>سورة {b.nomAr}</span>
                </header>
              ) : null}
              {b.basmala ? (
                <Basmala
                  texte={b.basmala}
                  cle={cleVerset(b.sourate, 0)}
                  actif={clesActives.has(cleVerset(b.sourate, 0))}
                  mot={clesActives.has(cleVerset(b.sourate, 0)) && motsActifs ? mot : null}
                  horsPassage={Boolean(passage && passage.du !== 1)}
                />
              ) : null}
              <p className="coran-versets">
                {b.versets.map((v) => {
                  const cle = cleVerset(b.sourate, v.n);
                  const actif = clesActives.has(cle);
                  return (
                    <Verset
                      key={cle}
                      cle={cle}
                      n={v.n}
                      texte={v.texte}
                      tajwid={avecTajwid ? v.tajwid : null}
                      actif={actif}
                      mot={actif && motsActifs && clesActives.size === 1 ? mot : null}
                      horsPassage={Boolean(passage && (v.n < passage.du || v.n > passage.au))}
                      marque={marques.has(cle)}
                    />
                  );
                })}
              </p>
            </section>
          ))}
        </div>
        {piedDePage}
      </article>

      {avecTajwid ? (
        <details className="coran-legende" open>
          <summary>
            <BookOpenText size={16} aria-hidden="true" />
            Couleurs du tajwid
          </summary>
          <ul>
            {FAMILLES_TAJWID.map((f) => (
              <li key={f.cle}>
                <span className={`tj-pastille tj-${f.cle}`} aria-hidden="true" />
                <span>{f.libelle}</span>
                <span lang="ar" dir="rtl">
                  {f.arabe}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

/** Un verset : texte du Complexe du Roi Fahd (rosace intégrée) ou texte coloré du tajwid. */
const Verset = memo(function Verset({
  cle,
  n,
  texte,
  tajwid,
  actif,
  mot,
  horsPassage,
  marque,
}: {
  cle: string;
  n: number;
  texte: string;
  tajwid: SegmentTajwid[] | null;
  actif: boolean;
  mot: number | null;
  horsPassage: boolean;
  marque: boolean;
}) {
  const classes = [
    "coran-verset",
    actif ? "actif" : "",
    horsPassage ? "hors-passage" : "",
    marque ? "marque" : "",
  ].join(" ");
  return (
    <span className={classes} data-cle={cle}>
      {tajwid ? (
        <>
          {decouperMotsTajwid(tajwid).map((m, i) => (
            <span
              key={i}
              className={m.mot !== null && m.mot === mot ? "mot actif" : m.mot ? "mot" : undefined}
            >
              {m.segments.map((s, j) =>
                typeof s === "string" ? (
                  s
                ) : (
                  <span key={j} className={`tj tj-${familleTajwid(s[0]) ?? "aucune"}`}>
                    {s[1]}
                  </span>
                ),
              )}
            </span>
          ))}
          {/* Numéro dessiné en rosace par la police du Complexe (espace insécable + chiffres). */}
          {`\u00a0${chiffresArabes(n)}`}
        </>
      ) : (
        decouperMots(texte).map((m, i) =>
          m.mot === null ? (
            m.texte
          ) : (
            <span key={i} className={m.mot === mot ? "mot actif" : "mot"}>
              {m.texte}
            </span>
          ),
        )
      )}{" "}
    </span>
  );
});

const Basmala = memo(function Basmala({
  texte,
  cle,
  actif,
  mot,
  horsPassage,
}: {
  texte: string;
  cle: string;
  actif: boolean;
  mot: number | null;
  horsPassage: boolean;
}) {
  return (
    <p
      className={["coran-basmala", actif ? "actif" : "", horsPassage ? "hors-passage" : ""].join(" ")}
      data-cle={cle}
    >
      {decouperMots(texte).map((m, i) =>
        m.mot === null ? (
          m.texte
        ) : (
          <span key={i} className={m.mot === mot ? "mot actif" : "mot"}>
            {m.texte}
          </span>
        ),
      )}
    </p>
  );
});

/** « Verset 3 », « Versets 6-7 », « Basmala ». */
function libelleCles(cles: readonly string[]): string {
  if (!cles.length) return "Basmala";
  const versets = cles.map((c) => Number(c.split(":")[1]));
  if (versets.length === 1) return versets[0] === 0 ? "Basmala" : `Verset ${versets[0]}`;
  return `Versets ${versets[0]}-${versets.at(-1)}`;
}

function minutes(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
