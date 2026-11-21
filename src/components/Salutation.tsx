"use client";

import { useEffect, useState } from "react";
import { TitreCalligraphie } from "./ciel/TitreCalligraphie";

/**
 * Titre de la barre du haut avec la salutation : une fois par visite, « السلام عليكم » + prénom
 * prend la place du titre (après l'animation d'ouverture dans l'appli), puis le titre revient
 * en douceur. Rien ne recouvre la page.
 */
export function TitreBarre({
  titre,
  sousTitre,
  prenom,
}: {
  titre: string;
  sousTitre?: string;
  prenom: string;
}) {
  const [salue, setSalue] = useState(false);

  useEffect(() => {
    let deja = false;
    try {
      deja = sessionStorage.getItem("salutation") === "1";
      sessionStorage.setItem("salutation", "1");
    } catch {
      /* stockage indisponible : on salue quand même */
    }
    if (deja) return;
    // Après l'ouverture : complète (≈ 3,3 s), courte (≈ 2,2 s) ; la complète a déjà salué elle-même.
    const mode = document.documentElement.getAttribute("data-ouverture");
    const attente = mode === null ? 0 : mode === "court" ? 1900 : 2700;
    const t1 = window.setTimeout(() => setSalue(true), attente);
    const t2 = window.setTimeout(() => setSalue(false), attente + 3600);
    return () => [t1, t2].forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <span className={salue ? "barre-titre-zone salue" : "barre-titre-zone"}>
      <TitreCalligraphie titre={titre} sousTitre={sousTitre} />
      <span className="barre-salutation" aria-hidden={!salue}>
        <span className="barre-salutation-arabe" lang="ar" dir="rtl">
          السلام عليكم
        </span>
        {prenom ? <span className="barre-salutation-prenom">{prenom}</span> : null}
      </span>
    </span>
  );
}
