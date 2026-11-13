"use client";

import { AudioLines, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { verifierRecitation, type Verification } from "@/domain/recitation";
import { retourSensoriel } from "@/components/retourSensoriel";

/* Reconnaissance vocale du navigateur (Chrome, Safari) : types minimaux, absents de TypeScript. */
interface ResultatVocal {
  isFinal: boolean;
  0: { transcript: string };
}
interface EvenementVocal {
  resultIndex: number;
  results: ArrayLike<ResultatVocal>;
}
interface Reconnaissance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EvenementVocal) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type ConstructeurReconnaissance = new () => Reconnaissance;

function constructeur(): ConstructeurReconnaissance | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructeurReconnaissance;
    webkitSpeechRecognition?: ConstructeurReconnaissance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const CLE_ACCORD = "verification-voix-accord";
const ERREURS: Record<string, string> = {
  "not-allowed": "Le micro est refusé : autorise-le dans les réglages du navigateur.",
  "service-not-allowed": "La reconnaissance vocale est désactivée sur ce téléphone.",
  "no-speech": "Je n’ai rien entendu. Rapproche-toi du téléphone et réessaie.",
  network: "La reconnaissance vocale a besoin d’Internet.",
  "language-not-supported": "L’arabe n’est pas disponible dans la reconnaissance vocale de ce téléphone.",
  "audio-capture": "Aucun micro trouvé.",
};

type Etat = "pret" | "ecoute" | "resultat";

/**
 * « Vérifier ma récitation » : le téléphone transcrit la voix (service vocal du système),
 * puis chaque mot du verset est marqué juste, différent ou oublié.
 */
export function VerifierRecitation({
  texteVerset,
  onAvantEcoute,
}: {
  texteVerset: string;
  /** Met la récitation en pause avant d'ouvrir le micro. */
  onAvantEcoute: () => void;
}) {
  const [possible, setPossible] = useState(false);
  const [accord, setAccord] = useState(false);
  const [etat, setEtat] = useState<Etat>("pret");
  const [entendu, setEntendu] = useState("");
  const [resultat, setResultat] = useState<Verification | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const reco = useRef<Reconnaissance | null>(null);
  const texte = useRef("");

  useEffect(() => {
    setPossible(constructeur() !== null);
    try {
      setAccord(localStorage.getItem(CLE_ACCORD) === "1");
    } catch {
      // stockage indisponible : l'avertissement s'affiche à chaque fois
    }
    return () => reco.current?.abort();
  }, []);

  if (!possible) return null;

  const commencer = () => {
    const Reco = constructeur();
    if (!Reco) return;
    onAvantEcoute();
    setErreur(null);
    setResultat(null);
    setEntendu("");
    texte.current = "";
    const r = new Reco();
    r.lang = "ar-SA";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let definitif = "";
      let provisoire = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) definitif += ` ${res[0].transcript}`;
        else provisoire += ` ${res[0].transcript}`;
      }
      texte.current = `${definitif} ${provisoire}`.trim();
      setEntendu(`${definitif} ${provisoire}`.trim());
    };
    r.onerror = (e) => {
      if (e.error !== "aborted")
        setErreur(ERREURS[e.error] ?? "La reconnaissance vocale a échoué. Réessaie.");
    };
    r.onend = () => {
      reco.current = null;
      const transcription = texte.current || "";
      if (!transcription) {
        setEtat("pret");
        return;
      }
      const v = verifierRecitation(texteVerset, transcription);
      setResultat(v);
      setEtat("resultat");
      retourSensoriel(v.score === 100 ? "succes" : "leger");
    };
    reco.current = r;
    try {
      r.start();
      setEtat("ecoute");
    } catch {
      setErreur("La reconnaissance vocale n’a pas pu démarrer. Réessaie.");
    }
  };

  const arreter = () => reco.current?.stop();

  return (
    <section className="verifier-recitation" aria-label="Vérifier ma récitation">
      <h3>
        <AudioLines size={16} aria-hidden="true" />
        Vérifier ma récitation
      </h3>

      {!accord ? (
        <div className="verifier-accord">
          <p>
            Le téléphone écoute ta récitation et l’écrit, puis l’appli la compare au texte, mot à mot. La
            transcription est faite par le service vocal du téléphone (Google ou Apple) : ta voix lui est
            envoyée. Rien n’est gardé dans l’appli.
          </p>
          <button
            type="button"
            className="reciter-bouton principal"
            onClick={() => {
              setAccord(true);
              try {
                localStorage.setItem(CLE_ACCORD, "1");
              } catch {
                // sans stockage : on redemandera la prochaine fois
              }
              commencer();
            }}
          >
            <AudioLines size={18} aria-hidden="true" />
            <span>J’ai compris, commencer</span>
          </button>
        </div>
      ) : etat === "ecoute" ? (
        <>
          <button type="button" className="reciter-bouton enregistre" onClick={arreter}>
            <Square size={18} aria-hidden="true" />
            <span>J’ai fini</span>
          </button>
          <p className="verifier-entendu" lang="ar" dir="rtl" aria-live="polite">
            {entendu || "…"}
          </p>
        </>
      ) : (
        <button type="button" className="reciter-bouton principal" onClick={commencer}>
          <AudioLines size={18} aria-hidden="true" />
          <span>{resultat ? "Réessayer" : "Réciter ce verset"}</span>
        </button>
      )}

      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {resultat && etat === "resultat" ? (
        <div className="verifier-resultat" aria-live="polite">
          <p className="verifier-score">
            <strong>
              {resultat.justes} / {resultat.mots.length}
            </strong>{" "}
            mots justes
            {resultat.score === 100 ? " · bravo" : ""}
            {resultat.ajoutes ? ` · ${resultat.ajoutes} mot${resultat.ajoutes > 1 ? "s" : ""} en trop` : ""}
          </p>
          <p className="verifier-mots" lang="ar" dir="rtl">
            {resultat.mots.map((m, i) => (
              <span
                key={i}
                className={`verif-${m.statut}`}
                title={
                  m.statut === "oublie"
                    ? "Oublié"
                    : m.statut === "different"
                      ? `Entendu : ${m.entendu ?? ""}`
                      : undefined
                }
              >
                {m.texte}{" "}
              </span>
            ))}
          </p>
          <p className="verifier-legende">
            <span className="verif-juste">vert</span> juste · <span className="verif-different">doré</span>{" "}
            différent · <span className="verif-oublie">barré</span> oublié. La reconnaissance peut se tromper
            : fie-toi aussi à l’écoute du Cheikh.
          </p>
        </div>
      ) : null}
    </section>
  );
}
