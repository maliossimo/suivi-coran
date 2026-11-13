"use client";

import {
  Pause,
  Play,
  Repeat1,
  ScanEye,
  Settings2,
  SkipBack,
  SkipForward,
  Palette,
  Minus,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  FAMILLES_TAJWID,
  chiffresArabes,
  familleTajwid,
  fichierVerset,
  versetSuivant,
  type SegmentTajwid,
} from "@/domain/coran";

export interface RecitationAffichee {
  id: string;
  nom: string;
  style: string;
  suivi: boolean;
  source: string;
}

interface Reglages {
  recitation: Record<string, string>;
  vitesse: number;
  repeter: boolean;
  suivre: boolean;
  tajwid: boolean;
  taille: number;
}

const CLE = "coran-reglages";
const TAILLES = [22, 26, 30, 34, 40, 46];
const VITESSES = [0.75, 1, 1.25, 1.5];
const DEFAUT: Reglages = {
  recitation: {},
  vitesse: 1,
  repeter: false,
  suivre: true,
  tajwid: false,
  taille: 2,
};

function lireReglages(): Reglages {
  try {
    return { ...DEFAUT, ...(JSON.parse(localStorage.getItem(CLE) ?? "{}") as Partial<Reglages>) };
  } catch {
    return DEFAUT;
  }
}

/**
 * Lecture d'une sourate : texte (avec ou sans tajwid), récitation et suivi du verset récité.
 * Les récitations « suivi » sont découpées verset par verset : le verset en cours s'allume
 * et la page le suit ; toucher un verset lance la récitation à partir de lui.
 */
export function LectureCoran({
  lecture,
  sourate,
  nomSourate,
  basmala,
  versets,
  tajwid,
  recitations,
  bibliothequeDisponible,
}: {
  lecture: "hafs" | "warsh";
  sourate: number;
  nomSourate: string;
  basmala: string | null;
  versets: string[];
  tajwid: SegmentTajwid[][] | null;
  recitations: RecitationAffichee[];
  bibliothequeDisponible: boolean;
}) {
  const [reglages, setReglages] = useState<Reglages>(DEFAUT);
  const [ouvert, setOuvert] = useState(false);
  const [joue, setJoue] = useState(false);
  const [charge, setCharge] = useState(false);
  /** Verset récité (0 : basmala) ; null à l'arrêt. */
  const [actif, setActif] = useState<number | null>(null);
  const [progression, setProgression] = useState({ temps: 0, duree: 0 });
  const [erreur, setErreur] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const suivant = useRef<HTMLAudioElement | null>(null);
  const actifRef = useRef<number | null>(null);
  const texte = useRef<HTMLDivElement>(null);

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
  const total = versets.length;
  const avecTajwid = Boolean(tajwid && reglages.tajwid);
  const avecBasmala = basmala !== null && lecture === "hafs";

  const urlVerset = useCallback(
    (v: number) =>
      recitation ? `${recitation.source}${v === 0 ? fichierVerset(1, 1) : fichierVerset(sourate, v)}` : "",
    [recitation, sourate],
  );

  const arreter = useCallback(() => {
    audio.current?.pause();
    setJoue(false);
    setCharge(false);
    actifRef.current = null;
    setActif(null);
  }, []);

  /** Récite un verset (récitations « suivi ») et prépare le suivant. */
  const jouerVerset = useCallback(
    (v: number) => {
      const a = audio.current;
      if (!a || !recitation) return;
      setErreur(null);
      actifRef.current = v;
      setActif(v);
      a.src = urlVerset(v);
      a.playbackRate = reglages.vitesse;
      setCharge(true);
      void a.play().catch(() => setJoue(false));
      const prochain = v === 0 ? 1 : versetSuivant(v, total, false);
      if (prochain) {
        suivant.current ??= new Audio();
        suivant.current.preload = "auto";
        suivant.current.src = urlVerset(prochain);
      }
    },
    [recitation, reglages.vitesse, total, urlVerset],
  );

  const lancer = useCallback(
    (depuis?: number) => {
      const a = audio.current;
      if (!a || !recitation) return;
      if (recitation.suivi) {
        jouerVerset(depuis ?? (avecBasmala ? 0 : 1));
      } else {
        if (!a.src.endsWith(`${String(sourate).padStart(3, "0")}.mp3`)) {
          a.src = `${recitation.source}${String(sourate).padStart(3, "0")}.mp3`;
        }
        a.playbackRate = reglages.vitesse;
        setCharge(true);
        void a.play().catch(() => setJoue(false));
      }
    },
    [avecBasmala, jouerVerset, recitation, reglages.vitesse, sourate],
  );

  const basculer = () => {
    const a = audio.current;
    if (!a) return;
    if (joue) {
      a.pause();
      return;
    }
    if (a.src && !a.ended && (actifRef.current !== null || !recitation?.suivi) && a.currentTime > 0) {
      void a.play();
      return;
    }
    lancer();
  };

  const decaler = (pas: number) => {
    if (!recitation?.suivi) {
      const a = audio.current;
      if (a) a.currentTime = Math.max(0, a.currentTime + pas * 10);
      return;
    }
    const depart = actifRef.current ?? 0;
    const cible = Math.min(total, Math.max(avecBasmala ? 0 : 1, depart + pas));
    jouerVerset(cible);
  };

  // Fin d'un verset : on enchaîne (ou on répète) ; fin de sourate : arrêt.
  const fin = () => {
    if (!recitation?.suivi) {
      setJoue(false);
      return;
    }
    const v = actifRef.current ?? 0;
    const prochain = v === 0 ? 1 : versetSuivant(v, total, reglages.repeter);
    if (prochain === null) arreter();
    else jouerVerset(prochain);
  };

  // Changement de sourate, de lecture ou de récitateur : on repart de zéro.
  useEffect(() => {
    arreter();
    setErreur(null);
    setProgression({ temps: 0, duree: 0 });
    if (audio.current) audio.current.removeAttribute("src");
  }, [sourate, lecture, recitation?.id, arreter]);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = reglages.vitesse;
  }, [reglages.vitesse]);

  // Le verset récité reste au centre de l'écran.
  useEffect(() => {
    if (actif === null || !reglages.suivre) return;
    texte.current
      ?.querySelector<HTMLElement>(`[data-verset="${actif}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [actif, reglages.suivre]);

  // Écran verrouillé / casque : titre et boutons du téléphone.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !recitation) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: actif ? `${nomSourate} · verset ${actif}` : nomSourate,
      artist: recitation.nom,
      album: "Suivi cours Coran",
    });
  }, [actif, nomSourate, recitation]);

  const groupes = useMemo(
    () => [
      { libelle: "Le texte suit la récitation", liste: recitations.filter((r) => r.suivi) },
      { libelle: "Écoute seule (sourate entière)", liste: recitations.filter((r) => !r.suivi) },
    ],
    [recitations],
  );

  const etat =
    erreur ??
    (recitation?.suivi
      ? actif === null
        ? `${total} versets`
        : actif === 0
          ? "Basmala"
          : `Verset ${actif} / ${total}`
      : progression.duree
        ? `${minutes(progression.temps)} / ${minutes(progression.duree)}`
        : "Sourate entière");

  return (
    <>
      <section className={ouvert ? "coran-barre ouverte" : "coran-barre"} aria-label="Récitation">
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
            <strong>{recitation ? recitation.nom : "Aucune récitation"}</strong>
            <span className={erreur ? "erreur" : undefined}>{etat}</span>
          </div>
          <button
            type="button"
            className="coran-bouton"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
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

        {ouvert ? (
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

            <div className="coran-reglage">
              <span>Vitesse</span>
              <div className="coran-choix-ligne" role="group" aria-label="Vitesse">
                {VITESSES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={reglages.vitesse === v}
                    onClick={() => modifier({ vitesse: v })}
                  >
                    {String(v).replace(".", ",")}×
                  </button>
                ))}
              </div>
            </div>

            <div className="coran-interrupteurs">
              <Interrupteur
                icone={<Repeat1 size={18} aria-hidden="true" />}
                libelle="Répéter le verset"
                actif={reglages.repeter}
                desactive={!recitation?.suivi}
                onChange={(v) => modifier({ repeter: v })}
              />
              <Interrupteur
                icone={<ScanEye size={18} aria-hidden="true" />}
                libelle="Suivre à l’écran"
                actif={reglages.suivre}
                desactive={!recitation?.suivi}
                onChange={(v) => modifier({ suivre: v })}
              />
              {tajwid ? (
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
                <button
                  type="button"
                  onClick={() => modifier({ taille: Math.min(TAILLES.length - 1, reglages.taille + 1) })}
                  aria-label="Texte plus grand"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
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
            setErreur("Récitation introuvable pour ce passage. Essaie un autre récitateur.");
            arreter();
          }}
        />
      </section>

      <article
        className={`coran-page coran-${lecture}${avecTajwid ? " coran-tajwid" : ""}${recitation?.suivi ? " cliquable" : ""}`}
        lang="ar"
        dir="rtl"
        style={{ "--taille-coran": `${TAILLES[reglages.taille]}px` } as CSSProperties}
      >
        <div ref={texte}>
          {basmala ? (
            <p className={actif === 0 ? "coran-basmala actif" : "coran-basmala"} data-verset={0}>
              {basmala}
            </p>
          ) : null}
          <p className="coran-versets">
            {versets.map((v, i) => {
              const n = i + 1;
              const segments = avecTajwid ? tajwid?.[i] : null;
              return (
                <span
                  key={n}
                  data-verset={n}
                  className={actif === n ? "coran-verset actif" : "coran-verset"}
                  onClick={recitation?.suivi ? () => lancer(n) : undefined}
                >
                  {segments ? (
                    <>
                      {segments.map((s, j) =>
                        typeof s === "string" ? (
                          s
                        ) : (
                          <span key={j} className={`tj tj-${familleTajwid(s[0]) ?? "aucune"}`}>
                            {s[1]}
                          </span>
                        ),
                      )}
                      <span className="coran-rosace">{chiffresArabes(n)}</span>
                    </>
                  ) : (
                    v
                  )}{" "}
                </span>
              );
            })}
          </p>
        </div>
      </article>

      {avecTajwid ? (
        <details className="coran-legende" open>
          <summary>Couleurs du tajwid</summary>
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

function minutes(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
