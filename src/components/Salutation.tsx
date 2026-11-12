"use client";

import { useEffect, useState } from "react";

/**
 * « السلام عليكم » + prénom, une fois par visite : apparaît en douceur sous la barre
 * (après l'animation d'ouverture dans l'appli), puis s'efface tout seul. Un appui la ferme.
 */
export function Salutation({ prenom }: { prenom: string }) {
  const [etat, setEtat] = useState<"cachee" | "visible" | "sortie">("cachee");

  useEffect(() => {
    let deja = false;
    try {
      deja = sessionStorage.getItem("salutation") === "1";
      sessionStorage.setItem("salutation", "1");
    } catch {
      /* stockage indisponible : on salue quand même */
    }
    if (deja) return;
    // Dans l'appli, on attend la fin de l'animation d'ouverture.
    const attente = document.documentElement.hasAttribute("data-ouverture") ? 1400 : 250;
    const t1 = window.setTimeout(() => setEtat("visible"), attente);
    const t2 = window.setTimeout(() => setEtat("sortie"), attente + 4200);
    const t3 = window.setTimeout(() => setEtat("cachee"), attente + 4700);
    return () => [t1, t2, t3].forEach((t) => window.clearTimeout(t));
  }, []);

  if (etat === "cachee") return null;
  return (
    <div
      className={etat === "sortie" ? "salutation salutation-sortie" : "salutation"}
      role="status"
      onClick={() => setEtat("sortie")}
    >
      <span className="salutation-arabe" lang="ar" dir="rtl">
        السلام عليكم
      </span>
      {prenom ? <span className="salutation-prenom">{prenom}</span> : null}
    </div>
  );
}
