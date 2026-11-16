"use client";

import { Check, ChevronRight, Headphones, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { actionMarquerAcquis } from "@/app/actions/acquis";
import { retoursActives } from "@/components/retourSensoriel";
import { EtatAcquis } from "./FormulaireAcquis";

interface AcquisAffiche {
  id: string;
  eleveId: string;
  libelle: string;
  aEcouter: boolean;
  ecoute: boolean;
  valide: boolean;
}

/**
 * Progression : « Ce que je connais déjà ». L'élève voit ses parties et peut les modifier ;
 * le Cheikh voit ce que l'élève a déclaré et marque « Écouté » ou « Validé » ce qu'il veut lui faire écouter.
 */
export function AcquisProgression({ acquis, vueEleve }: { acquis: AcquisAffiche[]; vueEleve: boolean }) {
  const [etats, setEtats] = useState<Record<string, { ecoute: boolean; valide: boolean }>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [, demarrer] = useTransition();

  if (!acquis.length) {
    return vueEleve ? (
      <Link href="/eleve/acquis" className="acquis-invitation">
        <Sparkles size={20} aria-hidden="true" />
        <span>
          <b>Tu connais déjà des sourates ?</b>
          <small>Indique-les : ta progression partira de là.</small>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </Link>
    ) : null;
  }

  const marquer = (a: AcquisAffiche, etat: "ecoute" | "valide") => {
    const avant = etats[a.id];
    if (retoursActives()) navigator.vibrate?.(8);
    setErreur(null);
    setEtats((e) => ({ ...e, [a.id]: { ecoute: true, valide: etat === "valide" } }));
    demarrer(async () => {
      const r = await actionMarquerAcquis(a.eleveId, a.id, etat).catch(() => ({
        ok: false as const,
        erreur: "Pas de réseau : le changement n’a pas été enregistré.",
      }));
      if (r.ok) return;
      setEtats((e) => {
        const copie = { ...e };
        if (avant) copie[a.id] = avant;
        else delete copie[a.id];
        return copie;
      });
      setErreur(r.erreur);
    });
  };

  return (
    <section className="carte-graphique acquis-progression" aria-labelledby="titre-acquis">
      <div className="acquis-progression-tete">
        <h2 id="titre-acquis">{vueEleve ? "Ce que je connais déjà" : "Déclaré par l’élève"}</h2>
        {vueEleve ? (
          <Link href="/eleve/acquis" className="lien-action">
            Modifier
          </Link>
        ) : null}
      </div>
      <p className="carte-graphique-sous">
        {vueEleve
          ? "Ce que tu savais par cœur en arrivant : compté dans ta progression."
          : "Ce que l’élève savait en arrivant. « À écouter » : il souhaite te le réciter."}
      </p>
      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <ul className="acquis-progression-liste">
        {acquis.map((a) => {
          const etat = { ...a, ...etats[a.id] };
          return (
            <li key={a.id}>
              <span className="acquis-liste-libelle">{a.libelle}</span>
              <EtatAcquis a={etat} />
              {!vueEleve && !etat.valide ? (
                <span className="acquis-progression-actions">
                  {!etat.ecoute ? (
                    <button type="button" className="bouton-secondaire" onClick={() => marquer(a, "ecoute")}>
                      <Headphones size={16} aria-hidden="true" /> Écouté
                    </button>
                  ) : null}
                  <button type="button" className="bouton" onClick={() => marquer(a, "valide")}>
                    <Check size={16} aria-hidden="true" /> Validé
                  </button>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
