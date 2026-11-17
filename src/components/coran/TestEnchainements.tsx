"use client";

import { Check, Eye, Link2, Mic, RotateCcw, Shuffle, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actionTextesEnchainement } from "@/app/actions/coran";
import { EtatVide } from "@/components/EtatVide";
import { retourSensoriel } from "@/components/retourSensoriel";
import { debutDuVerset, finDuVerset, tirerEnchainement } from "@/domain/enchainements";
import type { PageEnchainements } from "@/services/enchainements";

type Question = { sourate: number; verset: number };

/**
 * Tester les enchaînements : la fin d'un verset que l'élève connaît, et il récite le début du suivant
 * (de mémoire, puis « Voir la réponse » ; ou au micro avec Réciter). Il se note lui-même : juste ou à revoir.
 */
export function TestEnchainements({ lecture, sourates, possibles }: PageEnchainements) {
  const [filtre, setFiltre] = useState<number | "tout">("tout");
  const [question, setQuestion] = useState<Question | null>(null);
  const [revele, setRevele] = useState(false);
  const [score, setScore] = useState({ justes: 0, total: 0 });
  const [textes, setTextes] = useState<Record<number, string[]>>({});
  const chargement = useRef(new Set<number>());

  const choisis = useMemo(
    () => (filtre === "tout" ? possibles : possibles.filter((p) => p.sourate === filtre)),
    [filtre, possibles],
  );
  const nomDe = useMemo(() => new Map(sourates.map((s) => [s.numero, s])), [sourates]);

  const suivante = useCallback(() => {
    setRevele(false);
    setQuestion((q) => tirerEnchainement(choisis, Math.random, q));
  }, [choisis]);

  useEffect(suivante, [suivante]);

  // Textes de la sourate de la question (chargés une fois par sourate).
  useEffect(() => {
    const s = question?.sourate;
    if (!s || textes[s] || chargement.current.has(s)) return;
    chargement.current.add(s);
    void actionTextesEnchainement(s).then((t) => setTextes((x) => ({ ...x, [s]: t })));
  }, [question, textes]);

  if (!possibles.length) {
    return (
      <EtatVide titre="Rien à tester pour l’instant">
        <p>
          Les enchaînements viennent de ce que tu as appris (ta fiche) et de « Ce que je connais ». Dès que tu
          connais deux versets qui se suivent, tu pourras t’entraîner ici.
        </p>
        <Link href="/eleve/acquis" className="bouton-secondaire">
          Indiquer ce que je connais
        </Link>
      </EtatVide>
    );
  }

  const versets = question ? textes[question.sourate] : undefined;
  const avant = question && versets ? versets[question.verset - 1] : undefined;
  const apres = question && versets ? versets[question.verset] : undefined;
  const nom = question ? nomDe.get(question.sourate) : undefined;

  const noter = (juste: boolean) => {
    retourSensoriel(juste ? "succes" : "leger");
    setScore((s) => ({ justes: s.justes + (juste ? 1 : 0), total: s.total + 1 }));
    suivante();
  };

  return (
    <section className="enchainements" aria-label="Tester les enchaînements">
      <div className="enchainements-tete">
        <label className="enchainements-filtre">
          <span>Sur</span>
          <select
            value={filtre}
            onChange={(e) => setFiltre(e.target.value === "tout" ? "tout" : Number(e.target.value))}
          >
            <option value="tout">Tout ce que je connais</option>
            {sourates.map((s) => (
              <option key={s.numero} value={s.numero}>
                {s.numero}. {s.nomLatin}
              </option>
            ))}
          </select>
        </label>
        {score.total ? (
          <span className="enchainements-score" aria-live="polite">
            {score.justes} / {score.total}
          </span>
        ) : null}
      </div>

      {question ? (
        <article className="enchainements-carte">
          <p className="enchainements-ref">
            {nom?.nomLatin} · fin du verset {question.verset}
          </p>
          <p className="enchainements-texte" lang="ar" dir="rtl">
            {avant ? finDuVerset(avant) : <span className="squelette enchainements-attente" />}
          </p>
          <p className="enchainements-consigne">
            <Link2 size={16} aria-hidden="true" /> Récite le début du verset {question.verset + 1}.
          </p>

          {revele ? (
            <>
              <p className="enchainements-texte enchainements-reponse" lang="ar" dir="rtl">
                {apres ? debutDuVerset(apres, 5) : null}
              </p>
              <div className="enchainements-actions">
                <button type="button" className="bouton-secondaire" onClick={() => noter(false)}>
                  <X size={18} aria-hidden="true" /> À revoir
                </button>
                <button type="button" className="bouton" onClick={() => noter(true)}>
                  <Check size={18} aria-hidden="true" /> Je l’avais
                </button>
              </div>
            </>
          ) : (
            <div className="enchainements-actions">
              <button type="button" className="bouton" onClick={() => setRevele(true)}>
                <Eye size={18} aria-hidden="true" /> Voir la réponse
              </button>
              <Link
                className="bouton-secondaire"
                href={`/eleve/coran/lire?lecture=${lecture}&sourate=${question.sourate}&du=${question.verset + 1}&au=${question.verset + 1}&reciter=1`}
              >
                <Mic size={18} aria-hidden="true" /> Au micro
              </Link>
            </div>
          )}
          <button type="button" className="lien-discret enchainements-passer" onClick={suivante}>
            <Shuffle size={15} aria-hidden="true" /> Une autre
          </button>
        </article>
      ) : null}

      {score.total ? (
        <button type="button" className="lien-discret" onClick={() => setScore({ justes: 0, total: 0 })}>
          <RotateCcw size={14} aria-hidden="true" /> Remettre le score à zéro
        </button>
      ) : null}
    </section>
  );
}
