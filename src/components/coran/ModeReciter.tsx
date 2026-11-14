"use client";

import { Check, Eye, EyeOff, Mic, Play, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actionSignalerTajwid } from "@/app/actions/tajwid";
import { bloquerDefilement } from "@/components/Feuille";
import { retourSensoriel } from "@/components/retourSensoriel";
import { Selecteur } from "@/components/Selecteur";
import { LIBELLE_AVIS } from "@/domain/decoupage";
import {
  assemblerPassage,
  bilanPassage,
  LIBELLE_ETAT,
  lireAnalyse,
  type EtatAffiche,
  type MotAnalyse,
} from "@/domain/tajwid";
import { extraitWav, useCaptureReciter } from "./captureReciter";

type Etape = "pret" | "ecoute" | "fin" | "resultat";

export interface VersetReciter {
  n: number;
  texte: string;
}

const CLE_MASQUER = "tajwid-masquer-texte";
const MOTS_MAX = 400;

const chrono = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const LIBELLE_AFFICHE: Record<EtatAffiche, string> = { ...LIBELLE_ETAT, non_recite: "Pas récité" };

/** Jeton d'accès au moteur, gardé quelques minutes. */
async function demanderJeton(): Promise<string> {
  const r = await fetch("/api/tajwid/jeton", { method: "POST" });
  const { jeton } = (await r.json().catch(() => ({}))) as { jeton?: string };
  if (!r.ok || !jeton) throw new Error("La vérification n’est pas disponible pour ton compte.");
  return jeton;
}

/**
 * Mode « Réciter » : l'élève choisit des versets et récite d'affilée ; chaque morceau (coupé aux pauses)
 * est analysé pendant qu'il continue, si bien que le résultat arrive presque aussitôt après le dernier mot.
 */
export function ModeReciter({
  sourate,
  nomSourate,
  versets,
  depart,
  lecture,
  adresseVerset,
  onAvantEcoute,
  onFermer,
}: {
  sourate: number;
  nomSourate: string;
  /** Versets de la sourate affichée. */
  versets: readonly VersetReciter[];
  depart: number;
  lecture: "hafs" | "warsh";
  /** Fichier du récitateur pour un verset (s'il y en a un). */
  adresseVerset: (verset: number) => string | null;
  onAvantEcoute: () => void;
  onFermer: () => void;
}) {
  const dernierVerset = versets.at(-1)?.n ?? depart;
  const [du, setDu] = useState(depart);
  const [au, setAu] = useState(Math.min(depart + 4, dernierVerset));
  const [etape, setEtape] = useState<Etape>("pret");
  const [masquer, setMasquer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [passage, setPassage] = useState<[number, number, string][] | null>(null);
  const [resultats, setResultats] = useState<MotAnalyse[][]>([]);
  const [enCours, setEnCours] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [signale, setSignale] = useState<Set<number>>(new Set());
  const dialogue = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const urlAudio = useRef<string | null>(null);
  // File d'envoi : un morceau à la fois, dans l'ordre (chacun part d'où le précédent s'est arrêté).
  const file = useRef({
    jeton: null as Promise<string> | null,
    chaine: Promise.resolve(),
    depuis: 0,
    tempo: [] as number[],
    pcm: [] as Int16Array[],
    seance: 0,
  });

  const versetsChoisis = useMemo(() => versets.filter((v) => v.n >= du && v.n <= au), [versets, du, au]);
  const tropLong = versetsChoisis.reduce((n, v) => n + v.texte.split(/\s+/).length, 0) > MOTS_MAX;

  // Plein écran, et le moteur se prépare pendant que l'élève choisit ses versets.
  useEffect(() => {
    const d = dialogue.current;
    if (d && !d.open) d.showModal();
    const debloquer = bloquerDefilement();
    void fetch("/api/moteur_tajwid?prechauffer=1").catch(() => undefined);
    try {
      setMasquer(localStorage.getItem(CLE_MASQUER) === "1");
    } catch {
      // stockage indisponible : texte affiché
    }
    return () => {
      debloquer();
      audio.current?.pause();
      if (urlAudio.current) URL.revokeObjectURL(urlAudio.current);
    };
  }, []);

  const envoyer = useCallback(
    (pcm: Int16Array) => {
      const f = file.current;
      const seance = f.seance;
      const index = f.pcm.push(pcm) - 1;
      setEnCours((n) => n + 1);
      f.chaine = f.chaine.then(async () => {
        if (seance !== file.current.seance) return;
        try {
          const jeton = await (f.jeton ?? (f.jeton = demanderJeton()));
          const q = new URLSearchParams({
            sourate: String(sourate),
            du: String(du),
            au: String(au),
            depuis: String(f.depuis),
            riwaya: lecture,
          });
          if (index === 0) q.set("liste", "1");
          if (lecture === "warsh") for (const v of versetsChoisis) q.append("texte", v.texte);
          const r = await fetch(`/api/moteur_tajwid?${q}`, {
            method: "POST",
            headers: {
              Authorization: `Jeton ${jeton}`,
              "Content-Type": "application/octet-stream",
              "X-Tempo": JSON.stringify(f.tempo),
            },
            body: pcm.buffer as ArrayBuffer,
          });
          const corps: unknown = await r.json().catch(() => null);
          if (!r.ok) {
            const m = (corps as { erreur?: unknown } | null)?.erreur;
            throw new Error(typeof m === "string" ? m : "L’analyse a échoué.");
          }
          const a = lireAnalyse(corps);
          if (!a || seance !== file.current.seance) return;
          if (a.passage?.length) setPassage(a.passage);
          if (a.couverts) f.depuis = a.couverts[1];
          if (a.tempo) f.tempo = a.tempo;
          setResultats((l) => {
            const copie = [...l];
            copie[index] = a.mots;
            return copie;
          });
        } catch (e) {
          if (seance === file.current.seance)
            setErreur(e instanceof Error ? e.message : "L’analyse a échoué.");
        } finally {
          if (seance === file.current.seance) setEnCours((n) => n - 1);
        }
      });
    },
    [sourate, du, au, lecture, versetsChoisis],
  );

  const micro = useCaptureReciter(envoyer);

  const recommencer = () => {
    file.current = {
      jeton: file.current.jeton,
      chaine: Promise.resolve(),
      depuis: 0,
      tempo: [],
      pcm: [],
      seance: file.current.seance + 1,
    };
    setPassage(null);
    setResultats([]);
    setEnCours(0);
    setChoisi(null);
    setSignale(new Set());
    setErreur(null);
  };

  const commencer = async () => {
    onAvantEcoute();
    audio.current?.pause();
    recommencer();
    file.current.jeton = demanderJeton();
    file.current.jeton.catch(() => undefined);
    try {
      await micro.demarrer();
      setEtape("ecoute");
    } catch {
      setErreur("Le micro est refusé : autorise-le dans les réglages du navigateur.");
    }
  };

  const terminer = () => {
    micro.arreter();
    setEtape("fin");
  };

  // Tous les morceaux analysés : le résultat.
  useEffect(() => {
    if (etape !== "fin" || enCours > 0) return;
    setEtape(passage ? "resultat" : "pret");
    if (!passage && !erreur) setErreur("Je n’ai rien entendu. Rapproche-toi du téléphone et réessaie.");
  }, [etape, enCours, passage, erreur]);

  const mots = useMemo(() => (passage ? assemblerPassage(passage, resultats) : []), [passage, resultats]);
  const bilan = useMemo(() => bilanPassage(mots), [mots]);
  const derniersVersets = useMemo(() => {
    const couverts = new Set<number>();
    for (const m of mots) if (m.etat !== "non_recite") couverts.add(m.verset);
    return couverts;
  }, [mots]);

  useEffect(() => {
    if (etape !== "resultat") return;
    retourSensoriel(bilan.score === 100 ? "succes" : "leger");
    const premier = mots.find((m) => m.etat === "erreur" || m.etat === "oublie" || m.etat === "a_revoir");
    setChoisi(premier ? premier.indice : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, à l'arrivée du résultat
  }, [etape]);

  const jouer = (url: string, debut = 0, fin?: number) => {
    onAvantEcoute();
    const a = audio.current ?? new Audio();
    audio.current = a;
    a.pause();
    a.src = url;
    a.currentTime = debut;
    a.ontimeupdate = fin === undefined ? null : () => a.currentTime >= fin && a.pause();
    void a.play().catch(() => undefined);
  };

  const ecouterMoi = (indice: number) => {
    const m = mots[indice];
    const pcm = m?.morceau !== undefined ? file.current.pcm[m.morceau] : undefined;
    if (!m?.analyse || !pcm) return;
    if (urlAudio.current) URL.revokeObjectURL(urlAudio.current);
    urlAudio.current = URL.createObjectURL(extraitWav(pcm, m.analyse.debut ?? 0, m.analyse.fin ?? Infinity));
    jouer(urlAudio.current);
  };

  const signaler = async (indice: number) => {
    const m = mots[indice];
    if (!m) return;
    setSignale((s) => new Set(s).add(indice));
    await actionSignalerTajwid({
      lecture,
      sourate,
      verset: m.verset,
      mot: m.mot.slice(0, 60),
      regles: (m.analyse?.remarques ?? []).map((r) => r.regle).slice(0, 10),
      remarque:
        (m.analyse?.remarques ?? [])
          .map((r) => r.texte)
          .join(" · ")
          .slice(0, 300) || null,
    }).catch(() => undefined);
  };

  const basculerMasquer = () =>
    setMasquer((m) => {
      try {
        localStorage.setItem(CLE_MASQUER, m ? "0" : "1");
      } catch {
        // sans stockage : vaut pour cette fois
      }
      return !m;
    });

  const versetsSuivants = () => {
    const nouveauDu = Math.min(au + 1, dernierVerset);
    setDu(nouveauDu);
    setAu(Math.min(nouveauDu + (au - du), dernierVerset));
    recommencer();
    setEtape("pret");
  };

  const motChoisi = choisi !== null ? mots[choisi] : undefined;
  const optionsVersets = versets.map((v) => ({ valeur: String(v.n), libelle: `Verset ${v.n}` }));

  const texte = (
    <p className="reciter-texte" lang="ar" dir="rtl">
      {passage
        ? mots.map((m) => (
            <span
              key={m.indice}
              className={etape === "ecoute" || etape === "fin" ? `reciter-mot ${m.etat}` : "reciter-mot"}
            >
              {m.mot}{" "}
            </span>
          ))
        : versetsChoisis.map((v) => (
            <span key={v.n}>
              {v.texte} <span className="reciter-numero">﴿{v.n.toLocaleString("ar-EG")}﴾</span>{" "}
            </span>
          ))}
    </p>
  );

  return (
    <dialog ref={dialogue} className="reciter" aria-label="Réciter" onCancel={onFermer}>
      <header className="reciter-entete">
        <button type="button" className="reciter-fermer" aria-label="Fermer" onClick={onFermer}>
          <X size={22} aria-hidden="true" />
        </button>
        <h2>{etape === "resultat" ? "Résultat" : "Réciter"}</h2>
        {etape === "pret" ? (
          <button type="button" className="tajwid-masquer" aria-pressed={masquer} onClick={basculerMasquer}>
            {masquer ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            {masquer ? "Montrer le texte" : "Masquer le texte"}
          </button>
        ) : (
          <span className="reciter-plage">
            {nomSourate} · {du === au ? du : `${du} à ${au}`}
          </span>
        )}
      </header>

      {etape === "pret" ? (
        <div className="reciter-choix">
          <span>{nomSourate}</span>
          <Selecteur
            titre="Du verset"
            compact
            valeur={String(du)}
            onChange={(v) => {
              const n = Number(v);
              setDu(n);
              if (au < n) setAu(n);
            }}
            options={optionsVersets}
          />
          <span>au</span>
          <Selecteur
            titre="Au verset"
            compact
            valeur={String(au)}
            onChange={(v) => setAu(Math.max(du, Number(v)))}
            options={optionsVersets.filter((o) => Number(o.valeur) >= du)}
          />
        </div>
      ) : null}

      {etape === "ecoute" || etape === "fin" ? (
        <ul className="reciter-avancee" aria-label="Avancée">
          {versetsChoisis.map((v) => (
            <li key={v.n} className={derniersVersets.has(v.n) ? "fait" : undefined}>
              {derniersVersets.has(v.n) ? <Check size={14} aria-hidden="true" /> : null}
              Verset {v.n}
            </li>
          ))}
        </ul>
      ) : null}

      {etape === "resultat" ? (
        <section className="reciter-bilan" aria-label="Bilan">
          <strong>{bilan.score} %</strong>
          <span className="pastille juste">{bilan.compte.juste} justes</span>
          {bilan.compte.a_revoir ? (
            <span className="pastille a_revoir">{bilan.compte.a_revoir} à revoir</span>
          ) : null}
          {bilan.compte.erreur + bilan.compte.oublie ? (
            <span className="pastille erreur">
              {bilan.compte.erreur + bilan.compte.oublie} erreur
              {bilan.compte.erreur + bilan.compte.oublie > 1 ? "s" : ""}
            </span>
          ) : null}
        </section>
      ) : null}

      <main className="reciter-corps">
        {etape === "resultat" ? (
          <p className="reciter-texte" lang="ar" dir="rtl">
            {mots.map((m) => (
              <button
                key={m.indice}
                type="button"
                className={`reciter-mot ${m.etat}${m.indice === choisi ? " choisi" : ""}`}
                aria-label={`${m.mot} : ${LIBELLE_AFFICHE[m.etat]}`}
                aria-pressed={m.indice === choisi}
                onClick={() => setChoisi(m.indice)}
              >
                {m.mot}
              </button>
            ))}
          </p>
        ) : masquer && etape !== "pret" ? (
          <p className="reciter-masque">Récite de mémoire… le texte apparaîtra avec le résultat.</p>
        ) : masquer ? (
          <p className="reciter-masque">Texte masqué : récite de mémoire.</p>
        ) : (
          texte
        )}
        {erreur ? (
          <p className="message-erreur" role="alert">
            {erreur}
          </p>
        ) : null}
        {tropLong && etape === "pret" ? (
          <p className="message-erreur">Choisis moins de versets (une page au plus).</p>
        ) : null}
      </main>

      {etape === "resultat" && motChoisi ? (
        <section className={`reciter-detail ${motChoisi.etat}`} aria-live="polite">
          <div className="reciter-detail-tete">
            <span lang="ar" dir="rtl">
              {motChoisi.mot}
            </span>
            <b>{LIBELLE_AFFICHE[motChoisi.etat]}</b>
          </div>
          {motChoisi.analyse?.remarques.length ? (
            <ul>
              {motChoisi.analyse.remarques.map((r, i) => (
                <li key={i}>{r.texte.charAt(0).toUpperCase() + r.texte.slice(1)}.</li>
              ))}
            </ul>
          ) : (
            <p>
              {motChoisi.etat === "oublie"
                ? "Ce mot n’a pas été entendu."
                : motChoisi.etat === "non_recite"
                  ? "Tu t’es arrêté avant ce mot."
                  : "Rien à reprendre sur ce mot."}
            </p>
          )}
          <div className="reciter-detail-boutons">
            {motChoisi.analyse && motChoisi.morceau !== undefined ? (
              <button
                type="button"
                className="bouton-secondaire"
                onClick={() => ecouterMoi(motChoisi.indice)}
              >
                <Play size={16} aria-hidden="true" /> Toi
              </button>
            ) : null}
            {adresseVerset(motChoisi.verset) ? (
              <button
                type="button"
                className="bouton"
                onClick={() => jouer(adresseVerset(motChoisi.verset)!)}
              >
                <Play size={16} aria-hidden="true" /> Récitateur · verset {motChoisi.verset}
              </button>
            ) : null}
          </div>
          {motChoisi.analyse?.remarques.length ? (
            signale.has(motChoisi.indice) ? (
              <p className="reciter-merci">Merci, c’est noté : ça nous aide à améliorer la vérification.</p>
            ) : (
              <button
                type="button"
                className="reciter-signaler"
                onClick={() => void signaler(motChoisi.indice)}
              >
                L’appli s’est trompée
              </button>
            )
          ) : null}
        </section>
      ) : null}

      <footer className="reciter-pied">
        {etape === "pret" ? (
          <>
            <button
              type="button"
              className="tajwid-micro"
              disabled={tropLong || !versetsChoisis.length}
              onClick={() => void commencer()}
            >
              <Mic size={30} aria-hidden="true" />
              <span className="visuellement-cache">Commencer la récitation</span>
            </button>
            <span className="tajwid-consigne">Touche et récite à ton rythme</span>
          </>
        ) : null}
        {etape === "ecoute" ? (
          <>
            <span className={`reciter-avis ${micro.avis}`}>{LIBELLE_AVIS[micro.avis]}</span>
            <button
              type="button"
              className="tajwid-micro actif"
              style={{ boxShadow: `0 0 0 ${6 + Math.round(micro.niveau * 14)}px var(--vert-clair)` }}
              onClick={terminer}
            >
              <Square size={26} aria-hidden="true" />
              <span className="visuellement-cache">J’ai fini</span>
            </button>
            <span className="tajwid-chrono">{chrono(micro.secondes)}</span>
            <span className="tajwid-consigne">Chaque verset est analysé dès que tu fais une pause.</span>
          </>
        ) : null}
        {etape === "fin" ? (
          <div className="tajwid-action" role="status">
            <span className="tajwid-attente" aria-hidden="true" />
            <span className="tajwid-consigne">Encore un instant…</span>
          </div>
        ) : null}
        {etape === "resultat" ? (
          <div className="reciter-actions">
            <button
              type="button"
              className="bouton-secondaire"
              onClick={() => {
                recommencer();
                setEtape("pret");
              }}
            >
              Réessayer
            </button>
            {au < dernierVerset ? (
              <button type="button" className="bouton" onClick={versetsSuivants}>
                Versets suivants
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="tajwid-note">
          Analyse sur notre serveur, sans rien enregistrer (modèle ouvert HisnLabs Tajweed v2). C’est une aide
          : ton Cheikh reste juge.
        </p>
      </footer>
    </dialog>
  );
}
