"use client";

import { Eye, EyeOff, Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { retourSensoriel } from "@/components/retourSensoriel";
import {
  bilanTajwid,
  LIBELLE_ETAT,
  lireAnalyse,
  premierMotARevoir,
  type AnalyseTajwid,
  type EtatMot,
} from "@/domain/tajwid";
import { DUREE_MAX_S, useEnregistrement, versPcm16k } from "./enregistrementTajwid";

type Etape = "pret" | "ecoute" | "analyse" | "resultat";

const CLE_MASQUER = "tajwid-masquer-texte";
const ORDRE: EtatMot[] = ["juste", "a_revoir", "erreur", "oublie"];

const chrono = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

async function analyser(
  pcm: ArrayBuffer,
  sourate: number,
  verset: number,
  lecture: "hafs" | "warsh",
  texte: string,
): Promise<AnalyseTajwid> {
  const r = await fetch("/api/tajwid/jeton", { method: "POST" });
  const { jeton } = (await r.json().catch(() => ({}))) as { jeton?: string };
  if (!r.ok || !jeton) throw new Error("La vérification n’est pas disponible pour ton compte.");
  const q = new URLSearchParams({ sourate: String(sourate), verset: String(verset), riwaya: lecture });
  if (lecture === "warsh") q.set("texte", texte);
  const reponse = await fetch(`/api/moteur_tajwid?${q}`, {
    method: "POST",
    headers: { Authorization: `Jeton ${jeton}`, "Content-Type": "application/octet-stream" },
    body: pcm,
  });
  const corps: unknown = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    const message = (corps as { erreur?: unknown } | null)?.erreur;
    throw new Error(typeof message === "string" ? message : "L’analyse a échoué. Réessaie dans un instant.");
  }
  const analyse = lireAnalyse(corps);
  if (!analyse) throw new Error("Réponse inattendue du serveur. Réessaie.");
  return analyse;
}

/**
 * « Vérifier ma récitation » : l'élève récite le verset, le moteur tajwid (modèle ouvert HisnLabs Tajweed v2,
 * sur notre serveur, sans rien garder) dit pour chaque mot s'il est juste, à revoir, faux ou oublié, et pourquoi.
 */
export function VerifierRecitation({
  sourate,
  verset,
  lecture,
  texteVerset,
  onAvantEcoute,
}: {
  sourate: number;
  verset: number;
  lecture: "hafs" | "warsh";
  texteVerset: string;
  /** Met la récitation du récitateur en pause avant d'ouvrir le micro. */
  onAvantEcoute: () => void;
}) {
  const micro = useEnregistrement();
  const [possible, setPossible] = useState(false);
  const [etape, setEtape] = useState<Etape>("pret");
  const [masquer, setMasquer] = useState(false);
  const [analyse, setAnalyse] = useState<AnalyseTajwid | null>(null);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [voix, setVoix] = useState<string | null>(null);
  const [lecteurActif, setLecteurActif] = useState(false);
  const lecteur = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setPossible("MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia));
    try {
      setMasquer(localStorage.getItem(CLE_MASQUER) === "1");
    } catch {
      // stockage indisponible : texte affiché
    }
  }, []);

  useEffect(
    () => () => {
      if (voix) URL.revokeObjectURL(voix);
    },
    [voix],
  );

  if (!possible) return null;

  const basculerMasquer = () => {
    setMasquer((m) => {
      try {
        localStorage.setItem(CLE_MASQUER, m ? "0" : "1");
      } catch {
        // sans stockage : le choix vaut pour cette fois
      }
      return !m;
    });
  };

  const commencer = async () => {
    onAvantEcoute();
    lecteur.current?.pause();
    setErreur(null);
    setAnalyse(null);
    setChoisi(null);
    let blob: Blob | null;
    try {
      const enCours = micro.demarrer();
      setEtape("ecoute");
      blob = await enCours;
    } catch {
      setEtape("pret");
      setErreur("Le micro est refusé : autorise-le dans les réglages du navigateur.");
      return;
    }
    if (!blob) {
      setEtape("pret");
      return;
    }
    setVoix(URL.createObjectURL(blob));
    setEtape("analyse");
    try {
      const resultat = await analyser(await versPcm16k(blob), sourate, verset, lecture, texteVerset);
      setAnalyse(resultat);
      setChoisi(premierMotARevoir(resultat.mots));
      setEtape("resultat");
      retourSensoriel(bilanTajwid(resultat.mots).score === 100 ? "succes" : "leger");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L’analyse a échoué. Réessaie dans un instant.");
      setEtape("pret");
    }
  };

  const reecouter = () => {
    if (!voix) return;
    if (lecteurActif) {
      lecteur.current?.pause();
      return;
    }
    onAvantEcoute();
    const audio = lecteur.current ?? new Audio();
    lecteur.current = audio;
    audio.src = voix;
    audio.onplay = () => setLecteurActif(true);
    audio.onpause = () => setLecteurActif(false);
    audio.onended = () => setLecteurActif(false);
    void audio.play().catch(() => setLecteurActif(false));
  };

  const bilan = analyse ? bilanTajwid(analyse.mots) : null;
  const motChoisi = analyse && choisi !== null ? analyse.mots[choisi] : undefined;

  return (
    <section className="tajwid" aria-label="Vérifier ma récitation">
      <div className="tajwid-entete">
        <h3>
          <Mic size={16} strokeWidth={1.8} aria-hidden="true" />
          Vérifier ma récitation
        </h3>
        {etape !== "resultat" ? (
          <button type="button" className="tajwid-masquer" aria-pressed={masquer} onClick={basculerMasquer}>
            {masquer ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            {masquer ? "Montrer le texte" : "Masquer le texte"}
          </button>
        ) : null}
      </div>

      {etape !== "resultat" ? (
        <p className={masquer ? "tajwid-texte masque" : "tajwid-texte"} lang="ar" dir="rtl">
          {masquer ? "Récite de mémoire…" : texteVerset}
        </p>
      ) : null}

      {etape === "pret" ? (
        <div className="tajwid-action">
          <button type="button" className="tajwid-micro" onClick={() => void commencer()}>
            <Mic size={26} aria-hidden="true" />
            <span className="visuellement-cache">Commencer la récitation</span>
          </button>
          <span className="tajwid-consigne">
            Touche le micro et récite le verset ({DUREE_MAX_S} s au plus).
          </span>
        </div>
      ) : null}

      {etape === "ecoute" ? (
        <div className="tajwid-action">
          <button
            type="button"
            className="tajwid-micro actif"
            style={{ boxShadow: `0 0 0 ${4 + Math.round(micro.niveau * 14)}px var(--vert-clair)` }}
            onClick={micro.arreter}
          >
            <Square size={22} aria-hidden="true" />
            <span className="visuellement-cache">J’ai fini</span>
          </button>
          <span className="tajwid-chrono">
            {chrono(micro.secondes)} / {chrono(DUREE_MAX_S)}
          </span>
          <span className="tajwid-consigne">Je t’écoute… touche le carré quand tu as fini.</span>
        </div>
      ) : null}

      {etape === "analyse" ? (
        <div className="tajwid-action" role="status">
          <span className="tajwid-attente" aria-hidden="true" />
          <span className="tajwid-consigne">Analyse de ta récitation…</span>
        </div>
      ) : null}

      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {analyse && bilan && etape === "resultat" ? (
        <div className="tajwid-resultat">
          <div className="tajwid-score">
            <strong>{bilan.score} %</strong>
            <span>{bilan.score === 100 ? "Tout est juste" : "de mots justes"}</span>
          </div>
          <ul className="tajwid-compteurs" aria-label="Bilan">
            {ORDRE.map((etat) => (
              <li key={etat} className={`tajwid-${etat}`}>
                {LIBELLE_ETAT[etat]} <b>{bilan.compte[etat]}</b>
              </li>
            ))}
          </ul>

          <p className="tajwid-mots" lang="ar" dir="rtl">
            {analyse.mots.map((m, i) => (
              <button
                key={i}
                type="button"
                className={`tajwid-mot tajwid-${m.etat}${i === choisi ? " choisi" : ""}`}
                aria-label={`${m.mot} : ${LIBELLE_ETAT[m.etat]}`}
                aria-pressed={i === choisi}
                onClick={() => setChoisi(i)}
              >
                {m.mot}
              </button>
            ))}
          </p>

          {motChoisi ? (
            <div className={`tajwid-detail tajwid-${motChoisi.etat}`} aria-live="polite">
              <div className="tajwid-detail-tete">
                <span lang="ar" dir="rtl">
                  {motChoisi.mot}
                </span>
                <b>{LIBELLE_ETAT[motChoisi.etat]}</b>
              </div>
              {motChoisi.remarques.length ? (
                <ul>
                  {motChoisi.remarques.map((r, i) => (
                    <li key={i}>{r.texte}</li>
                  ))}
                </ul>
              ) : (
                <p>Rien à reprendre sur ce mot.</p>
              )}
              {motChoisi.madd.length ? (
                <p className="tajwid-madd">
                  Entendu : {motChoisi.madd.map((d) => `${d.nom} ${d.temps} temps`).join(" · ")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="tajwid-bravo">Aucune remarque de tajwid sur cette récitation.</p>
          )}

          <div className="tajwid-boutons">
            {voix ? (
              <button type="button" className="bouton-secondaire bouton-auto" onClick={reecouter}>
                {lecteurActif ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {lecteurActif ? "Pause" : "Réécouter ma récitation"}
              </button>
            ) : null}
            <button type="button" className="bouton bouton-auto" onClick={() => void commencer()}>
              <RotateCcw size={16} aria-hidden="true" />
              Réessayer
            </button>
          </div>
        </div>
      ) : null}

      <p className="tajwid-note">
        Analyse sur notre serveur, sans rien enregistrer, par un modèle ouvert (HisnLabs Tajweed v2). C’est
        une aide : elle peut se tromper, ton Cheikh reste juge.
      </p>
    </section>
  );
}
