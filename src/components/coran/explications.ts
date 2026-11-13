"use client";

import { useEffect, useState } from "react";
import type { ExplicationsAffichees } from "./types";

/** Adresse des explications d'une sourate (gardée par le service worker pour le hors-ligne). */
export const adresseExplications = (lecture: string, sourate: number) =>
  `/api/coran/explication?lecture=${lecture}&sourate=${sourate}`;

/** Sourates déjà chargées pendant la visite. */
const chargees = new Map<string, Promise<ExplicationsAffichees>>();

function charger(lecture: string, sourate: number): Promise<ExplicationsAffichees> {
  const cle = `${lecture}-${sourate}`;
  let p = chargees.get(cle);
  if (!p) {
    p = fetch(adresseExplications(lecture, sourate), { credentials: "same-origin" }).then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()) as ExplicationsAffichees;
    });
    // Un échec (réseau…) n'est pas gardé : on réessaiera au prochain verset touché.
    p.catch(() => chargees.delete(cle));
    chargees.set(cle, p);
  }
  return p;
}

export type EtatExplication =
  | { etat: "chargement" }
  | { etat: "erreur" }
  | {
      etat: "pret";
      versets: { texte: string; notes: string | null }[];
      source: ExplicationsAffichees["source"];
    };

/** Explication du verset `cle` (« sourate:verset ») ; null pour la basmala ou sans verset. */
export function useExplication(lecture: string, cle: string | null): EtatExplication | null {
  const [etat, setEtat] = useState<EtatExplication | null>(null);
  useEffect(() => {
    if (!cle) return;
    const [sourate, verset] = cle.split(":").map(Number) as [number, number];
    if (!verset) {
      setEtat(null);
      return;
    }
    let actif = true;
    setEtat({ etat: "chargement" });
    charger(lecture, sourate)
      .then((e) => {
        if (actif) setEtat({ etat: "pret", versets: e.versets[verset] ?? [], source: e.source });
      })
      .catch(() => {
        if (actif) setEtat({ etat: "erreur" });
      });
    return () => {
      actif = false;
    };
  }, [lecture, cle]);
  return cle ? etat : null;
}
