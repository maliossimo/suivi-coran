"use client";

import {
  BookOpenText,
  CloudDownload,
  CloudOff,
  Trash2,
  Minus,
  Palette,
  Pause,
  Play,
  Plus,
  Repeat,
  ScanEye,
  Settings2,
  SkipBack,
  SkipForward,
  TextCursor,
  X,
} from "lucide-react";
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
  familleTajwid,
  fichierVerset,
  motA,
  pistesLecture,
  type Piste,
  type Position,
  type RepereMot,
  type SegmentTajwid,
} from "@/domain/coran";
import { adresseAudio, adresseMots, taille, useHorsLigne } from "./horsLigne";

export interface RecitationAffichee {
  id: string;
  nom: string;
  style: string;
  suivi: boolean;
  source: string;
  mots: string | null;
  dossier: string | null;
  alignement: string | null;
}

export interface BlocAffiche {
  sourate: number;
  nomAr: string;
  nomLatin: string;
  nbVersets: number;
  debut: boolean;
  basmala: string | null;
  versets: { n: number; texte: string; tajwid: SegmentTajwid[] | null }[];
}

interface Reglages {
  recitation: Record<string, string>;
  vitesse: number;
  suivre: boolean;
  tajwid: boolean;
  motParMot: boolean;
  taille: number;
}

const CLE = "coran-reglages";
const TAILLES = [22, 26, 30, 34, 40, 46];
const VITESSES = [0.75, 1, 1.25, 1.5];
const FOIS_VERSET = [1, 2, 3, 5, 10];
const FOIS_PASSAGE = [1, 2, 3, 5, 0];
const DEFAUT: Reglages = {
  recitation: {},
  vitesse: 1,
  suivre: true,
  tajwid: false,
  motParMot: true,
  taille: 2,
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
  pagePrecedente,
  pageSuivante,
  piedDePage,
}: {
  lecture: "hafs" | "warsh";
  vue: "sourate" | "page";
  blocs: BlocAffiche[];
  passageInitial: { du: number; au: number } | null;
  correspondance: Record<string, number[][]> | null;
  recitations: RecitationAffichee[];
  bibliothequeDisponible: boolean;
  titre: string;
  pagePrecedente: string | null;
  pageSuivante: string | null;
  piedDePage: ReactNode;
}) {
  const router = useRouter();
  const [reglages, setReglages] = useState<Reglages>(DEFAUT);
  const [ouvert, setOuvert] = useState<"reglages" | "passage" | null>(passageInitial ? "passage" : null);
  const [joue, setJoue] = useState(false);
  const [charge, setCharge] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [mot, setMot] = useState<number | null>(null);
  const [progression, setProgression] = useState({ temps: 0, duree: 0 });
  const [erreur, setErreur] = useState<string | null>(null);
  const [passage, setPassage] = useState(passageInitial);
  const [repetition, setRepetition] = useState({ verset: 1, passage: 1 });
  const audio = useRef<HTMLAudioElement>(null);
  const prochain = useRef<HTMLAudioElement | null>(null);
  const positionRef = useRef<Position | null>(null);
  const reperes = useRef<RepereMot[] | null>(null);
  const texte = useRef<HTMLDivElement>(null);
  /** « Écouter le passage » : la récitation démarre une fois le nouveau passage appliqué. */
  const aLancer = useRef(false);

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

  const recitation = recitations.find((r) => r.id === reglages.recitation[lecture]) ?? recitations[0] ?? null;
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
    if (suite) jouer(suite);
    else arreter();
  };

  // Changement de récitateur ou de passage : on repart de zéro.
  useEffect(() => {
    arreter();
    setErreur(null);
    setProgression({ temps: 0, duree: 0 });
    audio.current?.removeAttribute("src");
  }, [recitation?.id, passage, arreter]);

  useEffect(() => {
    if (!aLancer.current) return;
    aLancer.current = false;
    lancerDepuis();
    // Seulement quand les fichiers à réciter changent (nouveau passage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pistes]);

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

  const touche = useCallback(
    (cle: string) => {
      if (recitation?.suivi) lancerDepuis(cle);
    },
    [lancerDepuis, recitation?.suivi],
  );

  const total = pistes.length;
  const etat =
    erreur ??
    (recitation?.suivi
      ? position
        ? `${libelleCles(piste?.cles ?? [])}${repetition.verset > 1 ? ` · ${position.foisVerset + 1}/${repetition.verset}` : ""}${
            passage && repetition.passage !== 1
              ? ` · passage ${position.foisPassage + 1}${repetition.passage ? `/${repetition.passage}` : ""}`
              : ""
          }`
        : passage
          ? `Passage ${passage.du} → ${passage.au}`
          : `${total} fichier${total > 1 ? "s" : ""} à réciter`
      : progression.duree
        ? `${minutes(progression.temps)} / ${minutes(progression.duree)}`
        : "Sourate entière");

  const groupes = [
    { libelle: "Le texte suit la récitation", liste: recitations.filter((r) => r.suivi) },
    { libelle: "Écoute seule (sourate entière)", liste: recitations.filter((r) => !r.suivi) },
  ];

  return (
    <>
      <section className="coran-barre" aria-label="Récitation">
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
          <div className="coran-barre-infos">
            <strong>
              {recitation
                ? `${recitation.nom}${recitation.style ? ` · ${recitation.style}` : ""}`
                : "Aucune récitation"}
            </strong>
            <span className={erreur ? "erreur" : undefined}>{etat}</span>
          </div>
          {sourateUnique && recitation?.suivi ? (
            <button
              type="button"
              className={passage ? "coran-bouton coran-bouton-actif" : "coran-bouton"}
              onClick={() => setOuvert((o) => (o === "passage" ? null : "passage"))}
              aria-expanded={ouvert === "passage"}
              aria-label="Mémoriser un passage"
            >
              <Repeat size={20} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="coran-bouton"
            onClick={() => setOuvert((o) => (o === "reglages" ? null : "reglages"))}
            aria-expanded={ouvert === "reglages"}
            aria-label="Réglages de lecture"
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

        {ouvert === "passage" && sourateUnique ? (
          <div className="coran-reglages">
            <p className="coran-reglages-titre">Mémoriser un passage</p>
            <div className="coran-passage">
              <label className="coran-reglage">
                <span>Du verset</span>
                <select
                  value={passage?.du ?? 1}
                  onChange={(e) => {
                    const du = Number(e.target.value);
                    setPassage({ du, au: Math.max(du, passage?.au ?? sourateUnique.nbVersets) });
                  }}
                >
                  {sourateUnique.versets.map((v) => (
                    <option key={v.n} value={v.n}>
                      {v.n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="coran-reglage">
                <span>Au verset</span>
                <select
                  value={passage?.au ?? sourateUnique.nbVersets}
                  onChange={(e) => {
                    const au = Number(e.target.value);
                    setPassage({ du: Math.min(au, passage?.du ?? 1), au });
                  }}
                >
                  {sourateUnique.versets.map((v) => (
                    <option key={v.n} value={v.n}>
                      {v.n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Choix
              libelle="Répéter chaque verset"
              valeurs={FOIS_VERSET}
              valeur={repetition.verset}
              afficher={(v) => `${v}×`}
              onChange={(v) => setRepetition((r) => ({ ...r, verset: v }))}
            />
            <Choix
              libelle="Répéter le passage"
              valeurs={FOIS_PASSAGE}
              valeur={repetition.passage}
              afficher={(v) => (v === 0 ? "∞" : `${v}×`)}
              onChange={(v) => setRepetition((r) => ({ ...r, passage: v }))}
            />
            <div className="coran-actions">
              {passage ? (
                <button type="button" className="bouton-secondaire" onClick={() => setPassage(null)}>
                  <X size={16} aria-hidden="true" />
                  Toute la sourate
                </button>
              ) : null}
              <button
                type="button"
                className="bouton"
                onClick={() => {
                  setOuvert(null);
                  if (passage) {
                    lancerDepuis();
                  } else {
                    aLancer.current = true;
                    setPassage({ du: 1, au: sourateUnique.nbVersets });
                  }
                }}
              >
                <Play size={16} aria-hidden="true" />
                Écouter le passage
              </button>
            </div>
          </div>
        ) : null}

        {ouvert === "reglages" ? (
          <div className="coran-reglages">
            <label className="coran-reglage">
              <span>Récitateur</span>
              <select
                value={recitation?.id ?? ""}
                onChange={(e) =>
                  modifier({ recitation: { ...reglages.recitation, [lecture]: e.target.value } })
                }
              >
                {groupes.map((g) =>
                  g.liste.length ? (
                    <optgroup key={g.libelle} label={g.libelle}>
                      {g.liste.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nom}
                          {r.style ? ` · ${r.style}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
              </select>
              {!bibliothequeDisponible ? (
                <small>Les récitations « sourate entière » sont momentanément indisponibles.</small>
              ) : null}
            </label>
            <Choix
              libelle="Vitesse"
              valeurs={VITESSES}
              valeur={reglages.vitesse}
              afficher={(v) => `${String(v).replace(".", ",")}×`}
              onChange={(v) => modifier({ vitesse: v })}
            />
            <div className="coran-interrupteurs">
              <Interrupteur
                icone={<ScanEye size={18} aria-hidden="true" />}
                libelle="Suivre la récitation à l’écran"
                actif={reglages.suivre}
                desactive={!recitation?.suivi}
                onChange={(v) => modifier({ suivre: v })}
              />
              <Interrupteur
                icone={<TextCursor size={18} aria-hidden="true" />}
                libelle={lecture === "hafs" ? "Surligner mot par mot" : "Mot par mot (Hafs seulement)"}
                actif={reglages.motParMot && Boolean(recitation?.mots)}
                desactive={!recitation?.mots}
                onChange={(v) => modifier({ motParMot: v })}
              />
              {lecture === "hafs" ? (
                <Interrupteur
                  icone={<Palette size={18} aria-hidden="true" />}
                  libelle="Couleurs du tajwid"
                  actif={reglages.tajwid}
                  onChange={(v) => modifier({ tajwid: v })}
                />
              ) : null}
            </div>
            <div className="coran-reglage">
              <span>Taille du texte</span>
              <div className="coran-choix-ligne" role="group" aria-label="Taille du texte">
                <button
                  type="button"
                  onClick={() => modifier({ taille: Math.max(0, reglages.taille - 1) })}
                  aria-label="Texte plus petit"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <span className="coran-taille-apercu" lang="ar">
                  ب
                </span>
                <button
                  type="button"
                  onClick={() => modifier({ taille: Math.min(TAILLES.length - 1, reglages.taille + 1) })}
                  aria-label="Texte plus grand"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            {horsLigne.possible ? (
              <div className="coran-hors-ligne">
                <p className="coran-reglages-titre">
                  <CloudOff size={16} aria-hidden="true" />
                  Hors ligne
                </p>
                {vue === "sourate" ? (
                  recitation?.suivi && recitation.dossier ? (
                    horsLigne.sourateTelechargee ? (
                      <div className="coran-hors-ligne-ligne">
                        <span>✓ Récitation de cette sourate sur le téléphone ({recitation.nom})</span>
                        <button
                          type="button"
                          className="coran-bouton"
                          onClick={() => void horsLigne.supprimerSourate()}
                          aria-label="Retirer du téléphone"
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="bouton-secondaire"
                        disabled={horsLigne.progres !== null}
                        onClick={() => void horsLigne.telechargerSourate()}
                      >
                        <CloudDownload size={16} aria-hidden="true" />
                        Télécharger la récitation de cette sourate
                      </button>
                    )
                  ) : (
                    <small>Choisis un récitateur « le texte suit » pour télécharger la récitation.</small>
                  )
                ) : null}
                {horsLigne.texteGarde ? (
                  <small>
                    ✓ Texte des 114 sourates ({lecture === "warsh" ? "Warsh" : "Hafs"}) gardé sur le
                    téléphone.
                  </small>
                ) : null}
                <button
                  type="button"
                  className="bouton-secondaire"
                  disabled={horsLigne.progres !== null}
                  onClick={() => void horsLigne.garderTexte()}
                >
                  <CloudDownload size={16} aria-hidden="true" />
                  {horsLigne.texteGarde
                    ? "Mettre à jour le texte gardé"
                    : "Garder tout le texte sur le téléphone"}
                </button>
                {horsLigne.progres ? (
                  <div className="coran-progres" role="status">
                    <span>
                      {horsLigne.progres.quoi === "texte" ? "Texte" : "Récitation"} : {horsLigne.progres.fait}{" "}
                      / {horsLigne.progres.total}
                    </span>
                    <progress value={horsLigne.progres.fait} max={horsLigne.progres.total} />
                  </div>
                ) : null}
                {horsLigne.erreur ? <small className="erreur">{horsLigne.erreur}</small> : null}
                {horsLigne.place !== null ? (
                  <small>Place utilisée par l’appli : {taille(horsLigne.place)}</small>
                ) : null}
              </div>
            ) : null}
          </div>
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
                : "Pas de réseau : télécharge cette sourate (⚙ → Hors ligne) pour l’écouter sans connexion.",
            );
            arreter();
          }}
        />
      </section>

      <article
        className={[
          "coran-page",
          `coran-${lecture}`,
          vue === "page" ? "coran-vue-page" : "",
          avecTajwid ? "coran-tajwid" : "",
          recitation?.suivi ? "cliquable" : "",
          passage ? "avec-passage" : "",
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
        <div ref={texte}>
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
                  onTouche={touche}
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
                      onTouche={touche}
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
  onTouche,
}: {
  cle: string;
  n: number;
  texte: string;
  tajwid: SegmentTajwid[] | null;
  actif: boolean;
  mot: number | null;
  horsPassage: boolean;
  onTouche: (cle: string) => void;
}) {
  const classes = ["coran-verset", actif ? "actif" : "", horsPassage ? "hors-passage" : ""].join(" ");
  return (
    <span className={classes} data-cle={cle} onClick={() => onTouche(cle)}>
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
  onTouche,
}: {
  texte: string;
  cle: string;
  actif: boolean;
  mot: number | null;
  horsPassage: boolean;
  onTouche: (cle: string) => void;
}) {
  return (
    <p
      className={["coran-basmala", actif ? "actif" : "", horsPassage ? "hors-passage" : ""].join(" ")}
      data-cle={cle}
      onClick={() => onTouche(cle)}
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

function Choix<T extends number>({
  libelle,
  valeurs,
  valeur,
  afficher,
  onChange,
}: {
  libelle: string;
  valeurs: readonly T[];
  valeur: T;
  afficher: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className="coran-reglage">
      <span>{libelle}</span>
      <div className="coran-choix-ligne" role="group" aria-label={libelle}>
        {valeurs.map((v) => (
          <button key={v} type="button" aria-pressed={valeur === v} onClick={() => onChange(v)}>
            {afficher(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Interrupteur({
  icone,
  libelle,
  actif,
  desactive = false,
  onChange,
}: {
  icone: ReactNode;
  libelle: string;
  actif: boolean;
  desactive?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={desactive}
      className="coran-interrupteur"
      onClick={() => onChange(!actif)}
    >
      {icone}
      <span>{libelle}</span>
      <span className="coran-interrupteur-pastille" aria-hidden="true" />
    </button>
  );
}

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
