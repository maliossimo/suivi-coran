"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Sur les longues pages (fiche du mois, longue sourate) : un bouton discret pour remonter en haut, visible seulement quand on remonte. */
export function RemonterEnHaut() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let image = 0;
    let arret = 0;
    let derniere = window.scrollY;
    // Le bouton n'apparaît qu'en remontant, loin du haut, puis s'efface au bout de 2,5 s :
    // il ne reste jamais posé sur un bouton d'action pendant qu'on lit ou qu'on saisit.
    const verifier = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        const y = window.scrollY;
        const enRemontant = y < derniere - 6;
        const enDescendant = y > derniere + 6;
        if (y <= window.innerHeight * 1.5 || enDescendant) setVisible(false);
        else if (enRemontant) setVisible(true);
        if (enRemontant || enDescendant) derniere = y;
        window.clearTimeout(arret);
        arret = window.setTimeout(() => setVisible(false), 2500);
      });
    };
    window.addEventListener("scroll", verifier, { passive: true });
    return () => {
      cancelAnimationFrame(image);
      window.clearTimeout(arret);
      window.removeEventListener("scroll", verifier);
    };
  }, []);
  return (
    <button
      type="button"
      className={visible ? "remonter-en-haut visible" : "remonter-en-haut"}
      aria-label="Remonter en haut"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
