"use client";

import { useEffect, useState } from "react";

type Theme = "auto" | "clair" | "sombre";
type Taille = "normal" | "grand" | "tres-grand";
const CLE = "apparence";

function lire(): { theme: Theme; taille: Taille } {
  try {
    const a = JSON.parse(localStorage.getItem(CLE) ?? "{}") as { theme?: Theme; taille?: Taille };
    return { theme: a.theme ?? "auto", taille: a.taille ?? "normal" };
  } catch {
    return { theme: "auto", taille: "normal" };
  }
}

function appliquer(theme: Theme, taille: Taille) {
  const r = document.documentElement;
  if (theme === "auto") r.removeAttribute("data-theme");
  else r.setAttribute("data-theme", theme);
  if (taille === "normal") r.removeAttribute("data-taille");
  else r.setAttribute("data-taille", taille);
}

function Choix<T extends string>({
  titre,
  valeur,
  options,
  onChange,
}: {
  titre: string;
  valeur: T;
  options: { valeur: T; libelle: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="choix-segmente" role="radiogroup" aria-label={titre}>
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => onChange(o.valeur)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

/** « Mon compte » : thème clair ou sombre, et taille du texte de toute l'appli (sur ce téléphone). */
export function ReglageApparence() {
  const [theme, setTheme] = useState<Theme>("auto");
  const [taille, setTaille] = useState<Taille>("normal");
  useEffect(() => {
    const a = lire();
    setTheme(a.theme);
    setTaille(a.taille);
  }, []);

  const changer = (t: Theme, ta: Taille) => {
    setTheme(t);
    setTaille(ta);
    appliquer(t, ta);
    try {
      localStorage.setItem(CLE, JSON.stringify({ theme: t, taille: ta }));
    } catch {
      // sans stockage : vaut jusqu'à la fermeture
    }
  };

  return (
    <div className="reglage-apparence">
      <span className="reglage-apparence-titre">Thème</span>
      <Choix
        titre="Thème"
        valeur={theme}
        onChange={(t) => changer(t, taille)}
        options={[
          { valeur: "auto", libelle: "Comme le téléphone" },
          { valeur: "clair", libelle: "Clair" },
          { valeur: "sombre", libelle: "Sombre" },
        ]}
      />
      <span className="reglage-apparence-titre">Taille du texte</span>
      <Choix
        titre="Taille du texte"
        valeur={taille}
        onChange={(ta) => changer(theme, ta)}
        options={[
          { valeur: "normal", libelle: "Normale" },
          { valeur: "grand", libelle: "Grande" },
          { valeur: "tres-grand", libelle: "Très grande" },
        ]}
      />
    </div>
  );
}
