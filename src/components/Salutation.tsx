"use client";

import { useEffect, useState } from "react";

/**
 * Titre de la barre du haut avec la salutation : une fois par visite, « السلام عليكم » + prénom
 * prend la place du titre (après l'animation d'ouverture dans l'appli), puis le titre revient
 * en douceur. Rien ne recouvre la page.
 */
export function TitreBarre({ titre, prenom }: { titre: string; prenom: string }) {
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
    const attente = document.documentElement.hasAttribute("data-ouverture") ? 1100 : 0;
    const t1 = window.setTimeout(() => setSalue(true), attente);
    const t2 = window.setTimeout(() => setSalue(false), attente + 3600);
    return () => [t1, t2].forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <span className={salue ? "barre-titre-zone salue" : "barre-titre-zone"}>
      <span className="barre-titre">{titre}</span>
      <span className="barre-salutation" aria-hidden={!salue}>
        <span className="barre-salutation-arabe" lang="ar" dir="rtl">
          السلام عليكم
        </span>
        {prenom ? <span className="barre-salutation-prenom">{prenom}</span> : null}
      </span>
    </span>
  );
}
