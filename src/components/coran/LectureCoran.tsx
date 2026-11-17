"use client";

import dynamic from "next/dynamic";
import {
  BookOpen,
  Eye,
  Palette,
  EyeOff,
  Mic,
  Moon,
  Pause,
  Play,
  Repeat,
  Settings2,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
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
import { fragmentsDesLignes, garderFragment, type FragmentLigne, type LigneMushaf } from "@/domain/mushaf";
import { ActionsVerset, type ModeVerset } from "./ActionsVerset";
import { retenirLecture } from "./derniereLecture";
import { noterUneFois } from "./usage";
import { annoncerTourDePage, lireTourDePage, type SensTour } from "./tourDePage";
import { useAppuiLong } from "./appuiLong";
import { useMarquePages } from "./marquePages";
import { retourSensoriel } from "@/components/retourSensoriel";
import { useExplication } from "./explications";
import { adresseAudio, adresseMots, garderSourateOuverte, useHorsLigne } from "./horsLigne";
import { MemoriserCoran } from "./MemoriserCoran";
import { PanneauTajwid } from "./PanneauTajwid";
import { actionMotsARevoir } from "@/app/actions/tajwid";
import { squeletteMot, type MotARevoir } from "@/domain/essais";
import { usePincer } from "./pincer";
import { ReglagesCoran, TAILLES, type ChoixMinuterie, type Reglages } from "./ReglagesCoran";
import type { BlocAffiche, RecitationAffichee } from "./types";

// Le mode Réciter (capture du micro, résultat) n'est chargé qu'au premier appui sur « Réciter ».
const ModeReciter = dynamic(() => import("./ModeReciter").then((m) => m.ModeReciter), { ssr: false });

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
  tajwidEteintes: [],
  mushafLibre: false,
  soulignerARevoir: true,
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
  lignes = null,
  passageInitial,
  correspondance,
  recitations,
  bibliothequeDisponible,
  titre,
  liensLecture,
  base = "/admin/coran",
  reciterInitial = null,
  pagePrecedente,
  pageSuivante,
  piedDePage,
}: {
  lecture: "hafs" | "warsh";
  vue: "sourate" | "page";
  blocs: BlocAffiche[];
  /** Vue page (Hafs) : début de chaque ligne du Mushaf de Médine ; null : le texte s'écoule librement. */
  lignes?: LigneMushaf[] | null;
  passageInitial: Passage | null;
  correspondance: Record<string, number[][]> | null;
  recitations: RecitationAffichee[];
  bibliothequeDisponible: boolean;
  titre: string;
  /** Même endroit, l'autre lecture (Hafs / Warsh) ; null : lecture imposée (l'élève lit dans la sienne). */
  liensLecture: Record<"hafs" | "warsh", string> | null;
  /** Adresse de la page Coran (admin ou élève), pour la garde hors ligne. */
  base?: string;
  /** Ouvrir le mode Réciter dès l'arrivée, sur ce passage (depuis la carte « Réciter »). */
  reciterInitial?: { du: number; au: number } | null;
  pagePrecedente: string | null;
  pageSuivante: string | null;
  piedDePage: ReactNode;
}) {
  const router = useRouter();
  const [reglages, setReglages] = useState<Reglages>(DEFAUT);
  const [ouvert, setOuvert] = useState<"reglages" | "memoriser" | "tajwid" | null>(null);
  /** Verset touché (actions) ou appuyé longuement (explication) : sa feuille est ouverte. */
  const [choix, setChoix] = useState<{ cle: string; mode: ModeVerset } | null>(null);
  /** Mode « Réciter » ouvert : sourate et verset de départ. */
  const [reciter, setReciter] = useState<{
    sourate: number;
    depart: number;
    fin?: number;
    reveler?: boolean;
  } | null>(() =>
    reciterInitial && vue === "sourate" && blocs[0]
      ? { sourate: blocs[0].sourate, depart: reciterInitial.du, fin: reciterInitial.au }
      : null,
  );
  const versetChoisi = choix?.cle ?? null;
  /** Mode caché (mémoriser) : seul le premier mot de chaque ligne (ou verset) reste lisible. */
  const [cache, setCache] = useState(false);
  /** Lignes (« l3 ») ou versets (« 2:255 ») dévoilés d'un toucher en mode caché. */
  const [devoiles, setDevoiles] = useState<ReadonlySet<string>>(new Set());
  const [emplacementCache, setEmplacementCache] = useState<HTMLElement | null>(null);
  /** Mots ratés lors des récitations, pas encore réussis deux fois (par sourate). */
  const [aRevoir, setARevoir] = useState<Record<number, MotARevoir[]>>({});
  const souratesAffichees = useMemo(() => blocs.map((b) => b.sourate).join(","), [blocs]);
  const chargerARevoir = useCallback(() => {
    const sourates = souratesAffichees.split(",").map(Number).slice(0, 4);
    void actionMotsARevoir({ lecture: lecture === "warsh" ? "warsh" : "hafs", sourates })
      .then(setARevoir)
      .catch(() => undefined);
  }, [souratesAffichees, lecture]);
  useEffect(chargerARevoir, [chargerARevoir]);
  const aRevoirParVerset = useMemo(() => {
    const m = new Map<string, Set<string>>();
    // Réglage « mots à revoir » coupé : rien sur la page, ni dans Réciter, ni dans la progression.
    if (!reglages.soulignerARevoir) return m;
    for (const [s, mots] of Object.entries(aRevoir))
      for (const x of mots) {
        const cle = cleVerset(Number(s), x.verset);
        m.set(cle, (m.get(cle) ?? new Set()).add(squeletteMot(x.mot)));
      }
    return m;
  }, [aRevoir, reglages.soulignerARevoir]);

  useEffect(() => setEmplacementCache(document.getElementById("coran-outil-cache")), []);
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

  const [pret, setPret] = useState(false);
  useEffect(() => {
    setReglages(lireReglages());
    setPret(true);
  }, []);
  // Compteur « qui utilise le Coran » (administration) : une lecture par sourate et par visite.
  const premiereSourate = blocs[0]?.sourate;
  useEffect(() => {
    if (premiereSourate) noterUneFois("lecture", premiereSourate);
  }, [premiereSourate]);

  // Élève : l'endroit lu est retenu pour « Continuer la lecture » (onglet Coran).
  useEffect(() => {
    if (base !== "/eleve/coran/lire") return;
    const params = new URLSearchParams(location.search);
    params.delete("reciter"); // on y revient pour lire, pas pour réciter
    retenirLecture(`${location.pathname}?${params.toString()}`, titre);
  }, [base, titre]);
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
  // La sourate ouverte et la suivante restent lisibles sans réseau.
  const numeroSourate = sourateUnique?.sourate;
  useEffect(() => {
    if (!numeroSourate) return;
    const t = setTimeout(() => garderSourateOuverte(lecture, numeroSourate, base), 3000);
    return () => clearTimeout(t);
  }, [lecture, numeroSourate, base]);
  const avecTajwid = lecture === "hafs" && reglages.tajwid;
  const motsActifs = Boolean(recitation?.mots && reglages.motParMot);
  /** Combien de fois chaque règle du tajwid revient dans le texte affiché (panneau du tajwid). */
  const compteTajwid = useMemo(() => {
    const compte = new Map<string, number>();
    for (const b of blocs)
      for (const v of b.versets)
        for (const seg of v.tajwid ?? []) {
          if (typeof seg === "string") continue;
          const f = familleTajwid(seg[0]);
          if (f) compte.set(f, (compte.get(f) ?? 0) + 1);
        }
    return compte;
  }, [blocs]);

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
    base,
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
  // « Écoute seulement » : le texte ne suit pas cette voix (ses fichiers ne tombent pas juste sur les versets).
  const ecouteSeule = Boolean(recitation?.ecouteSeule);
  const clesActives = useMemo(() => new Set(ecouteSeule ? [] : (piste?.cles ?? [])), [piste, ecouteSeule]);

  // Page du Mushaf : les lignes du livre, chacune avec ses morceaux de versets.
  const versetsParCle = useMemo(
    () => new Map(blocs.flatMap((b) => b.versets.map((v) => [cleVerset(b.sourate, v.n), v] as const))),
    [blocs],
  );
  const lignesParSourate = useMemo(() => {
    if (vue !== "page" || !lignes?.length || reglages.mushafLibre) return null;
    const derniers = new Map(blocs.map((b) => [b.sourate, b.versets.at(-1)?.n ?? 0]));
    const fragments = fragmentsDesLignes(lignes, (s) => derniers.get(s) ?? 0);
    const parSourate = new Map<number, { ligne: LigneMushaf; fragments: FragmentLigne[]; rang: number }[]>();
    lignes.forEach((ligne, i) => {
      const liste = parSourate.get(ligne.sourate) ?? [];
      liste.push({ ligne, fragments: fragments[i]!, rang: i + 1 });
      parSourate.set(ligne.sourate, liste);
    });
    return parSourate;
  }, [vue, lignes, blocs]);

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
    if (!premiereCle || !reglages.suivre || ecouteSeule) return;
    texte.current
      ?.querySelector<HTMLElement>(`[data-cle="${premiereCle}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [premiereCle, reglages.suivre, ecouteSeule]);

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
  // La page suit le doigt (avec un léger pivot, comme une page qu'on tourne) ; relâchée assez loin,
  // elle part et la nouvelle arrive de l'autre côté (voir tourDePage.ts).
  const depart = useRef<{ x: number; y: number; t: number; suit: boolean } | null>(null);
  /** La carte de la page : déplacée directement pendant le glissement (sans recalculer le texte). */
  const cartePage = useRef<HTMLElement>(null);
  useAjusterLignes(cartePage, lignesParSourate !== null, avecTajwid);

  // En lisant : la barre du bas s'efface quand on descend dans le texte, revient dès qu'on remonte.
  useEffect(() => {
    const html = document.documentElement;
    let dernier = window.scrollY;
    const surDefilement = () => {
      const y = window.scrollY;
      if (y < 80 || y < dernier - 6) delete html.dataset.navCachee;
      else if (y > dernier + 6) html.dataset.navCachee = "";
      if (Math.abs(y - dernier) > 6) dernier = y;
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => {
      window.removeEventListener("scroll", surDefilement);
      delete html.dataset.navCachee;
    };
  }, []);

  // Zoom : pincer (ou A− / A+ en plein écran). En vue sourate, la taille du texte change ; sur la page du
  // Mushaf, grossir fait passer le texte à la ligne librement (pastille « Revenir au Mushaf »).
  const mushafPossible = vue === "page" && Boolean(lignes?.length);
  const zoomer = useCallback(
    (pas: number) => {
      if (!pas) return;
      const largeur = cartePage.current?.querySelector<HTMLElement>(".coran-versets")?.clientWidth ?? 360;
      const em = lireCalibrage(avecTajwid);
      const tailleMushaf =
        parseFloat(cartePage.current?.style.getPropertyValue("--taille-mushaf") ?? "") ||
        (em ? (largeur * 0.98) / em : 30);
      const borne = (i: number) => Math.min(TAILLES.length - 1, Math.max(0, i));
      if (mushafPossible && !reglages.mushafLibre) {
        if (pas < 0) return;
        const premier = TAILLES.findIndex((t) => t > tailleMushaf * 1.05);
        modifier({
          mushafLibre: true,
          taille: borne((premier < 0 ? TAILLES.length - 1 : premier) + pas - 1),
        });
      } else if (mushafPossible && pas < 0) {
        const i = reglages.taille + pas;
        if (i < 0 || (TAILLES[i] ?? 0) <= tailleMushaf) modifier({ mushafLibre: false });
        else modifier({ taille: i });
      } else modifier({ taille: borne(reglages.taille + pas) });
    },
    [avecTajwid, modifier, mushafPossible, reglages.mushafLibre, reglages.taille],
  );
  usePincer(
    texte,
    useCallback(
      (f: number) =>
        zoomer(
          f > 1
            ? Math.max(1, Math.round(Math.log(f) / Math.log(1.18)))
            : -Math.max(1, Math.round(Math.log(1 / f) / Math.log(1.18))),
        ),
      [zoomer],
    ),
  );
  const suivreDoigt = (dx: number | null) => {
    const el = cartePage.current;
    if (!el) return;
    if (dx === null) {
      el.classList.remove("page-suit-le-doigt");
      el.style.removeProperty("transform");
      return;
    }
    el.classList.add("page-suit-le-doigt");
    el.style.transform = `perspective(1400px) translateX(${dx * 0.55}px) rotateY(${dx * 0.025}deg)`;
  };
  const [partie, setPartie] = useState<SensTour | null>(null);
  const [arrivee, setArrivee] = useState<SensTour | null>(null);
  // Avant le premier affichage : la nouvelle page entre directement par le bon côté.
  useLayoutEffect(() => {
    if (vue === "page") setArrivee(lireTourDePage());
  }, [vue]);
  useEffect(() => {
    if (!partie) return;
    // Navigation qui n'aboutit pas : la page revient à sa place.
    const minuteur = window.setTimeout(() => setPartie(null), 4000);
    return () => window.clearTimeout(minuteur);
  }, [partie]);

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
        : null
      : progression.duree
        ? `${minutes(progression.temps)} / ${minutes(progression.duree)}`
        : null);

  const memorisation = Boolean(sourateUnique && recitation?.suivi);
  const explication = useExplication(lecture, choix?.mode === "explication" ? choix.cle : null);
  /** Fichier du récitateur pour le verset choisi (comparer sa récitation). */
  const adresseRecitateur = useMemo(() => {
    if (!versetChoisi || !recitation?.suivi) return null;
    const p = pistesCompletes.find((x) => x.cles.includes(versetChoisi));
    return p ? adresse(fichierVerset(p.sourate, p.ayah)) : null;
  }, [adresse, pistesCompletes, recitation?.suivi, versetChoisi]);
  /** Fichier du récitateur pour un verset (mode Réciter : l'écouter après sa propre récitation). */
  const adresseVerset = useCallback(
    (sourate: number, n: number) => {
      if (!recitation?.suivi) return null;
      const cle = cleVerset(sourate, n);
      const p = pistesCompletes.find((x) => x.cles.includes(cle));
      return p ? adresse(fichierVerset(p.sourate, p.ayah)) : null;
    },
    [adresse, pistesCompletes, recitation?.suivi],
  );
  const blocReciter = reciter ? blocs.find((b) => b.sourate === reciter.sourate) : undefined;
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
            {/* Rien d'autre au repos : le nom du récitateur se lit en entier. */}
            {etat ? <span className={erreur ? "erreur" : undefined}>{etat}</span> : null}
          </button>
          {/* Réciter : dans la barre, à portée du pouce, sans jamais cacher de verset. */}
          {blocs[0] ? (
            <button
              type="button"
              className="coran-bouton coran-reciter-bouton"
              onClick={() => {
                audio.current?.pause();
                setReciter({
                  sourate: blocs[0]!.sourate,
                  depart: passage?.du ?? blocs[0]!.versets[0]?.n ?? 1,
                  // Page du Mushaf : toute la page (de la première sourate) ; texte caché : il se dévoile en récitant.
                  fin: passage?.au ?? (vue === "page" ? blocs[0]!.versets.at(-1)?.n : undefined),
                  reveler: cache,
                });
              }}
              aria-haspopup="dialog"
              aria-label="Réciter"
              title="Réciter : l’appli t’écoute et te montre les mots à revoir"
            >
              <Mic size={20} aria-hidden="true" />
              <span className="coran-reciter-texte" aria-hidden="true">
                Réciter
              </span>
            </button>
          ) : null}
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
          onPlay={() => {
            setJoue(true);
            if (premiereSourate) noterUneFois("ecoute", premiereSourate);
          }}
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

      {reciter && blocReciter ? (
        <ModeReciter
          motsARevoir={reglages.soulignerARevoir}
          sourate={blocReciter.sourate}
          nomSourate={blocReciter.nomLatin}
          nomArabe={blocReciter.nomAr}
          recitateur={recitation?.suivi ? recitation.id : null}
          recitateurs={recitations.filter((r) => r.suivi).map((r) => ({ valeur: r.id, libelle: r.nom }))}
          onRecitateur={(id) => modifier({ recitation: { ...reglages.recitation, [lecture]: id } })}
          versets={blocReciter.versets}
          depart={reciter.depart}
          finInitiale={reciter.fin}
          lecture={lecture === "warsh" ? "warsh" : "hafs"}
          adresseVerset={(n) => adresseVerset(blocReciter.sourate, n)}
          onAvantEcoute={() => audio.current?.pause()}
          onFermer={() => {
            setReciter(null);
            // Une récitation vient peut-être d'ajouter (ou de faire sortir) des mots à revoir.
            chargerARevoir();
          }}
          reveler={reciter.reveler}
          taille={TAILLES[reglages.taille] ?? 30}
          peutAgrandir={reglages.taille < TAILLES.length - 1}
          peutReduire={reglages.taille > 0}
          onTaille={(pas) =>
            modifier({ taille: Math.min(TAILLES.length - 1, Math.max(0, reglages.taille + pas)) })
          }
        />
      ) : null}

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
        onReciter={(cle) => {
          const [sourate, verset] = cle.split(":").map(Number) as [number, number];
          setChoix(null);
          setReciter({ sourate, depart: verset });
        }}
        onMarque={(cle) => {
          const [sourate, verset] = cle.split(":").map(Number) as [number, number];
          marquePages.basculer({ lecture, sourate, verset });
          retourSensoriel("leger");
        }}
        onAvantEnregistrement={() => audio.current?.pause()}
        onEcouter={(cle) =>
          ecouter(dansLePassage(cle) ? passage : null, dansLePassage(cle) ? repetition : UNE_FOIS, cle)
        }
        onRepeter={(cle, fois) => ecouter({ du: numero(cle), au: numero(cle) }, { verset: 1, passage: fois })}
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

      {/* « Cacher le texte » : en haut, à côté du plein écran (la barre du lecteur reste lisible). */}
      {emplacementCache
        ? createPortal(
            <button
              type="button"
              className={cache ? "coran-plein-ecran coran-cacher actif" : "coran-plein-ecran coran-cacher"}
              onClick={() => {
                setCache((c) => !c);
                setDevoiles(new Set());
              }}
              aria-pressed={cache}
              aria-label={cache ? "Montrer tout le texte" : "Cacher le texte pour réviser"}
              title={
                cache
                  ? "Montrer tout le texte"
                  : "Cacher le texte : seul le premier mot de chaque ligne reste"
              }
            >
              {cache ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}
            </button>,
            emplacementCache,
          )
        : null}
      {/* Tajwid : un bouton palette, à côté, qui ouvre le panneau des règles (texte Hafs seulement). */}
      {emplacementCache && lecture === "hafs"
        ? createPortal(
            <button
              type="button"
              className={
                avecTajwid ? "coran-plein-ecran coran-palette actif" : "coran-plein-ecran coran-palette"
              }
              onClick={() => setOuvert("tajwid")}
              aria-haspopup="dialog"
              aria-label="Couleurs du tajwid"
              title="Couleurs du tajwid : choisir les règles à voir"
            >
              <Palette size={18} aria-hidden="true" />
            </button>,
            emplacementCache,
          )
        : null}
      <PanneauTajwid
        ouverte={ouvert === "tajwid"}
        onFermer={() => setOuvert(null)}
        actif={reglages.tajwid}
        onActif={(v) => modifier({ tajwid: v })}
        eteintes={reglages.tajwidEteintes}
        onEteintes={(e) => modifier({ tajwidEteintes: e })}
        compte={compteTajwid}
      />
      {mushafPossible && reglages.mushafLibre ? (
        <button
          type="button"
          className="coran-retour-mushaf"
          onClick={() => modifier({ mushafLibre: false })}
        >
          <BookOpen size={16} aria-hidden="true" />
          Texte agrandi · Revenir au Mushaf
        </button>
      ) : null}
      {/* Plein écran : A− / A+ pour ceux qui ne pincent pas (cachés ailleurs). */}
      <div className="coran-zoom-boutons" role="group" aria-label="Taille du texte">
        <button type="button" onClick={() => zoomer(-1)} aria-label="Réduire le texte">
          A−
        </button>
        <button type="button" onClick={() => zoomer(1)} aria-label="Agrandir le texte">
          A+
        </button>
      </div>
      {cache ? (
        <p className="coran-cache-aide" role="status">
          <EyeOff size={16} aria-hidden="true" />
          <span>
            Texte caché : touche une ligne pour la dévoiler. <b>Réciter</b> dévoile les mots au fil de ta
            récitation.
          </span>
        </p>
      ) : null}
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
          cache ? "coran-cache" : "",
          ...(avecTajwid ? reglages.tajwidEteintes.map((f) => `sans-tj-${f}`) : []),
          "cliquable",
          passage ? "avec-passage" : "",
          reglages.theme !== "auto" ? `theme-${reglages.theme}` : "",
          partie ? `page-part-${partie}` : "",
          arrivee && !partie ? `page-arrive-${arrivee}` : "",
        ].join(" ")}
        // Texte interactif (toucher, appui long) : posé une fois la page prête dans le navigateur.
        data-pret={pret ? "" : undefined}
        lang="ar"
        dir="rtl"
        style={
          {
            "--taille-coran": `${TAILLES[reglages.taille]}px`,
          } as CSSProperties
        }
        ref={cartePage}
        onTouchStart={(e) => {
          if (vue !== "page" || e.touches.length !== 1) return;
          depart.current = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, t: Date.now(), suit: false };
        }}
        onTouchMove={(e) => {
          const d = depart.current;
          if (!d || vue !== "page" || partie) return;
          const dx = e.touches[0]!.clientX - d.x;
          const dy = e.touches[0]!.clientY - d.y;
          // Le geste est horizontal : la page suit le doigt (sans page de ce côté, elle résiste).
          if (d.suit || (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4)) {
            d.suit = true;
            const possible = dx > 0 ? pageSuivante : pagePrecedente;
            suivreDoigt(possible ? dx : dx * 0.15);
          }
        }}
        onTouchEnd={(e) => {
          const d = depart.current;
          depart.current = null;
          suivreDoigt(null);
          if (!d || vue !== "page" || !d.suit) return;
          const dx = e.changedTouches[0]!.clientX - d.x;
          const dy = e.changedTouches[0]!.clientY - d.y;
          // Assez loin, ou un geste vif (comme on tourne vraiment une page).
          const vif = Math.abs(dx) > 35 && Date.now() - d.t < 280;
          if ((Math.abs(dx) < 70 && !vif) || Math.abs(dx) < Math.abs(dy)) return;
          const sens: SensTour = dx > 0 ? "suivante" : "precedente";
          const cible = sens === "suivante" ? pageSuivante : pagePrecedente;
          if (!cible) return;
          annoncerTourDePage(sens);
          setPartie(sens);
          router.push(cible, { scroll: false });
        }}
        onTouchCancel={() => {
          depart.current = null;
          suivreDoigt(null);
        }}
      >
        <div
          ref={texte}
          className="coran-zone-texte"
          {...appui}
          onClick={(e) => {
            if (!cache) return appui.onClick(e);
            // Texte caché : un toucher dévoile la ligne (ou le verset), un second la recache.
            const cible = e.target instanceof Element ? e.target : null;
            const ligne = cible?.closest<HTMLElement>("[data-ligne]");
            const cle = ligne
              ? `l${ligne.dataset.ligne}`
              : cible?.closest("[data-cle]")?.getAttribute("data-cle");
            if (!cle) return;
            setDevoiles((d) => {
              const n = new Set(d);
              if (n.has(cle)) n.delete(cle);
              else n.add(cle);
              return n;
            });
          }}
        >
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
              {lignesParSourate?.has(b.sourate) ? (
                <div className="coran-versets coran-lignes">
                  {lignesParSourate.get(b.sourate)!.map(({ ligne, fragments, rang }) => (
                    <span
                      key={rang}
                      data-ligne={rang}
                      className={[
                        "coran-ligne",
                        ligne.centree ? "centree" : "",
                        devoiles.has(`l${rang}`) ? "devoile" : "",
                      ].join(" ")}
                    >
                      {fragments.map((f) => {
                        const v = versetsParCle.get(cleVerset(f.sourate, f.verset));
                        if (!v) return null;
                        const cle = cleVerset(f.sourate, f.verset);
                        const actif = clesActives.has(cle);
                        return (
                          <Verset
                            key={cle}
                            cle={cle}
                            n={f.verset}
                            texte={v.texte}
                            tajwid={avecTajwid ? v.tajwid : null}
                            actif={actif}
                            mot={actif && motsActifs && clesActives.size === 1 ? mot : null}
                            horsPassage={Boolean(passage && (f.verset < passage.du || f.verset > passage.au))}
                            marque={marques.has(cle)}
                            fragment={f}
                            aRevoir={aRevoirParVerset.get(cle) ?? null}
                          />
                        );
                      })}
                    </span>
                  ))}
                </div>
              ) : (
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
                        devoile={devoiles.has(cle)}
                        aRevoir={aRevoirParVerset.get(cle) ?? null}
                      />
                    );
                  })}
                </p>
              )}
            </section>
          ))}
        </div>
        {piedDePage}
      </article>

      {avecTajwid ? (
        <section className="coran-legende" aria-label="Couleurs du tajwid">
          <ul>
            {FAMILLES_TAJWID.filter(
              (f) => !reglages.tajwidEteintes.includes(f.cle) && compteTajwid.get(f.cle),
            ).map((f) => (
              <li key={f.cle}>
                <span className={`tj-pastille tj-${f.cle}`} aria-hidden="true" />
                <span>{f.libelle}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="bouton-secondaire" onClick={() => setOuvert("tajwid")}>
            <Palette size={16} aria-hidden="true" />
            Choisir les règles à voir
          </button>
        </section>
      ) : null}
    </>
  );
}

/**
 * Page du Mushaf : une seule taille de texte pour toutes les pages (comme un livre), choisie pour que la ligne
 * ordinaire remplisse la largeur. La longueur « ordinaire » d'une ligne (médiane, en em) est mesurée sur les pages
 * lues et retenue sur l'appareil : la taille ne saute plus d'une page à l'autre. Une ligne un peu plus longue que
 * les autres est resserrée, elle seule ; les plus courtes s'étirent jusqu'aux bords.
 */
const CLE_CALIBRAGE = "coran-mushaf-em";

function lireCalibrage(tajwid: boolean): number | null {
  try {
    const v = (JSON.parse(localStorage.getItem(CLE_CALIBRAGE) ?? "{}") as Record<string, unknown>)[
      tajwid ? "tajwid" : "texte"
    ];
    return typeof v === "number" && v > 3 && v < 40 ? v : null;
  } catch {
    return null;
  }
}

function retenirCalibrage(tajwid: boolean, em: number) {
  try {
    const tout = JSON.parse(localStorage.getItem(CLE_CALIBRAGE) ?? "{}") as Record<string, number>;
    const ancien = tout[tajwid ? "tajwid" : "texte"];
    // Moyenne lente : la mesure s'affine au fil des pages sans faire bouger la taille d'un coup.
    tout[tajwid ? "tajwid" : "texte"] = typeof ancien === "number" ? ancien * 0.9 + em * 0.1 : em;
    localStorage.setItem(CLE_CALIBRAGE, JSON.stringify(tout));
  } catch {
    // stockage indisponible : la mesure de la page suffit
  }
}

function useAjusterLignes(carte: RefObject<HTMLElement | null>, actif: boolean, tajwid: boolean) {
  useLayoutEffect(() => {
    const page = carte.current;
    if (!actif || !page) return;
    let image = 0;
    let retenu = false;
    const ajuster = () => {
      const blocs = [...page.querySelectorAll<HTMLElement>(".coran-lignes")];
      if (!blocs.length) return;
      const largeur = blocs[0]!.clientWidth;
      if (!largeur) return;
      const lignes = [...page.querySelectorAll<HTMLElement>(".coran-ligne")];
      for (const l of lignes) {
        l.classList.remove("serree");
        l.style.removeProperty("--serrage");
      }
      page.classList.add("mesure-lignes");
      const taille = parseFloat(getComputedStyle(blocs[0]!).fontSize) || 30;
      const ems = lignes.map((l) => l.getBoundingClientRect().width / taille);
      page.classList.remove("mesure-lignes");
      // Longueur ordinaire d'une ligne pleine sur cette page (les lignes centrées ne comptent pas).
      const pleines = ems.filter((_, i) => !lignes[i]!.classList.contains("centree")).sort((x, y) => x - y);
      const mediane = pleines.length >= 5 ? pleines[Math.floor(pleines.length / 2)]! : null;
      if (mediane && !retenu) {
        retenu = true;
        retenirCalibrage(tajwid, mediane);
      }
      const em = lireCalibrage(tajwid) ?? mediane ?? Math.max(...ems, 1);
      const nouvelle = Math.max(12, Math.min(48, (largeur * 0.98) / em));
      page.style.setProperty("--taille-mushaf", `${nouvelle.toFixed(2)}px`);
      // Les lignes plus longues que la largeur sont resserrées (au plus 15 %), elles seules.
      lignes.forEach((l, i) => {
        const naturelle = ems[i]! * nouvelle;
        if (naturelle > largeur) {
          l.classList.add("serree");
          l.style.setProperty("--serrage", Math.max(0.85, largeur / naturelle).toFixed(4));
        }
      });
    };
    const planifier = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(ajuster);
    };
    ajuster();
    void document.fonts?.ready.then(planifier);
    let largeurVue = page.clientWidth;
    const observateur = new ResizeObserver(() => {
      // Seule la largeur compte (la hauteur change avec la taille du texte elle-même).
      if (page.clientWidth === largeurVue) return;
      largeurVue = page.clientWidth;
      planifier();
    });
    observateur.observe(page);
    return () => {
      cancelAnimationFrame(image);
      observateur.disconnect();
    };
  }, [carte, actif, tajwid]);
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
  fragment = null,
  devoile = false,
  aRevoir = null,
}: {
  cle: string;
  n: number;
  texte: string;
  tajwid: SegmentTajwid[] | null;
  actif: boolean;
  mot: number | null;
  horsPassage: boolean;
  marque: boolean;
  /** Page du Mushaf : seulement les mots de ce verset posés sur la ligne. */
  fragment?: FragmentLigne | null;
  /** Mode caché : verset dévoilé d'un toucher. */
  devoile?: boolean;
  /** Mots à revoir de ce verset (squelettes) : soulignés. */
  aRevoir?: ReadonlySet<string> | null;
}) {
  const classeMot = (numero: number | null, texteMot: string) =>
    [
      "mot",
      numero !== null && numero === mot ? "actif" : "",
      aRevoir?.has(squeletteMot(texteMot)) ? "a-revoir" : "",
    ]
      .filter(Boolean)
      .join(" ");
  const classes = [
    "coran-verset",
    devoile ? "devoile" : "",
    actif ? "actif" : "",
    horsPassage ? "hors-passage" : "",
    marque ? "marque" : "",
  ].join(" ");
  return (
    <span className={classes} data-cle={cle}>
      {tajwid ? (
        <>
          {(fragment
            ? garderFragment(decouperMotsTajwid(tajwid), fragment.deTajwid, fragment.aTajwid, false, (m) =>
                m.segments.every((x) => typeof x === "string" && /^\s+$/.test(x)),
              )
            : decouperMotsTajwid(tajwid)
          ).map((m, i) => (
            <span
              key={i}
              className={
                m.mot
                  ? classeMot(m.mot, m.segments.map((x) => (typeof x === "string" ? x : x[1])).join(""))
                  : undefined
              }
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
          {!fragment || fragment.fin ? `\u00a0${chiffresArabes(n)}` : null}
        </>
      ) : (
        (fragment
          ? garderFragment(decouperMots(texte), fragment.de, fragment.a, fragment.fin, (m) =>
              /^\s+$/.test(m.texte),
            )
          : decouperMots(texte)
        ).map((m, i) =>
          m.mot === null ? (
            m.texte
          ) : (
            <span key={i} className={classeMot(m.mot, m.texte)}>
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
