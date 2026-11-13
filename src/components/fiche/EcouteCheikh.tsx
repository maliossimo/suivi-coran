"use client";

import { Check, Headphones } from "lucide-react";
import { useMemo, useState } from "react";
import { actionMarquerPassages } from "@/app/actions/fiche";
import { retourSensoriel } from "@/components/retourSensoriel";
import { creerReferentiel, libellePassage, type Passage, type Sourate } from "@/domain/versets";

type Etat = "aucun" | "ecoute" | "valide";

const etatDe = (p: Passage): Etat => (p.valide ? "valide" : p.corrige ? "ecoute" : "aucun");

const CHOIX: { etat: Etat; libelle: string }[] = [
  { etat: "aucun", libelle: "Pas écouté" },
  { etat: "ecoute", libelle: "Écouté" },
  { etat: "valide", libelle: "Validé" },
];

/**
 * Vue du Cheikh : pour chaque passage, « écouté » (récité devant lui, à retravailler)
 * puis « validé » (acquis). Un toucher suffit, pour un passage ou pour toute la séance.
 */
export function EcouteCheikh({
  eleveId,
  seanceId,
  passages,
  sourates,
}: {
  eleveId: string;
  seanceId: string;
  passages: readonly Passage[];
  sourates: readonly Sourate[];
}) {
  const ref = useMemo(() => creerReferentiel(sourates), [sourates]);
  const [etats, setEtats] = useState<Etat[]>(() => passages.map(etatDe));
  const [erreur, setErreur] = useState<string | null>(null);

  const marquer = async (etat: Etat, index?: number) => {
    const avant = etats;
    // Affiché tout de suite ; annulé si la base refuse.
    setEtats((e) => e.map((x, i) => (index === undefined || i === index ? etat : x)));
    setErreur(null);
    const r = await actionMarquerPassages(eleveId, {
      seanceId,
      etat,
      ...(index === undefined ? {} : { ordres: [index + 1] }),
    });
    if (r.ok) {
      if (etat !== "aucun") retourSensoriel(etat === "valide" ? "succes" : "leger");
    } else {
      setEtats(avant);
      setErreur(r.erreur ?? "Le changement n'a pas pu être enregistré.");
    }
  };

  if (!passages.length) return null;
  const tous = (etat: Etat) => etats.every((e) => e === etat);

  return (
    <section className="ecoute-cheikh" aria-label="Écoute du Cheikh">
      <div className="ecoute-cheikh-entete">
        <h2>Récitation</h2>
        <div className="ecoute-cheikh-tout">
          <button type="button" onClick={() => void marquer("ecoute")} aria-pressed={tous("ecoute")}>
            <Headphones size={16} strokeWidth={1.6} aria-hidden="true" />
            Tout écouté
          </button>
          <button
            type="button"
            className="valide"
            onClick={() => void marquer("valide")}
            aria-pressed={tous("valide")}
          >
            <Check size={16} aria-hidden="true" />
            Tout validé
          </button>
        </div>
      </div>
      <ul>
        {passages.map((p, i) => {
          let libelle: string;
          try {
            libelle = libellePassage(ref, p);
          } catch {
            libelle = `Passage ${i + 1}`;
          }
          return (
            <li key={i} className={`ecoute-passage etat-${etats[i]}`}>
              <span className="ecoute-passage-nom">{libelle}</span>
              <div className="ecoute-choix" role="radiogroup" aria-label={`État de ${libelle}`}>
                {CHOIX.map((c) => (
                  <button
                    key={c.etat}
                    type="button"
                    role="radio"
                    aria-checked={etats[i] === c.etat}
                    className={`choix-${c.etat}`}
                    onClick={() => void marquer(c.etat, i)}
                  >
                    {c.etat === "ecoute" ? (
                      <Headphones size={15} strokeWidth={1.6} aria-hidden="true" />
                    ) : null}
                    {c.etat === "valide" ? <Check size={14} aria-hidden="true" /> : null}
                    {c.libelle}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      {erreur ? (
        <p className="message-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <p className="ecoute-aide">Écouté : à retravailler. Validé : acquis.</p>
    </section>
  );
}
