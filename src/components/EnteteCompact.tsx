"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { titreArabe } from "@/domain/ciel";
import { LogoEtoile } from "./logo/LogoEtoile";
import { useSousTitreEntete } from "./SousTitreEntete";

/**
 * En-tête compact : quand la grande barre du haut quitte l'écran en descendant, une barre fine en verre
 * dépoli (logo, titre de la page et un sous-titre utile) glisse depuis le haut ; elle repart quand la grande
 * barre revient. Pendant le défilement, le grand titre rétrécit et s'efface (variable --avance-entete),
 * et le petit arrive à sa place. Elle ne prend aucune place dans la page : rien ne saute.
 * Un toucher remonte en haut de la page, le logo fait un tour.
 */
export function EnteteCompact({ titre, nomPage }: { titre: string; nomPage?: string }) {
  const repere = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [joue, setJoue] = useState(false);
  const sousTitre = useSousTitreEntete();

  useEffect(() => {
    const barre = repere.current?.closest("header");
    if (!barre) return;
    const html = document.documentElement;
    let image = 0;
    // Avance du défilement à travers la grande barre : 0 (tout en haut) à 1 (barre sortie de l'écran).
    const mesurer = () => {
      image = 0;
      const r = barre.getBoundingClientRect();
      const avance = r.height ? Math.min(1, Math.max(0, -r.top / r.height)) : 0;
      html.style.setProperty("--avance-entete", avance.toFixed(3));
    };
    const auDefilement = () => {
      if (!image) image = requestAnimationFrame(mesurer);
    };
    mesurer();
    window.addEventListener("scroll", auDefilement, { passive: true });
    window.addEventListener("resize", auDefilement, { passive: true });
    let observateur: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      observateur = new IntersectionObserver(
        ([entree]) => setVisible(Boolean(entree) && entree!.intersectionRatio < 0.3),
        { threshold: [0, 0.3, 0.6, 1] },
      );
      observateur.observe(barre);
    }
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", auDefilement);
      window.removeEventListener("resize", auDefilement);
      observateur?.disconnect();
      html.style.removeProperty("--avance-entete");
    };
  }, []);

  useEffect(() => {
    if (!joue) return;
    const t = window.setTimeout(() => setJoue(false), 700);
    return () => window.clearTimeout(t);
  }, [joue]);

  return (
    <>
      <span ref={repere} hidden />
      <button
        type="button"
        className={joue ? "barre-compacte joue" : "barre-compacte"}
        data-visible={visible ? "" : undefined}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={() => {
          setJoue(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        aria-label="Remonter en haut de la page"
      >
        <LogoEtoile className="barre-compacte-logo" />
        <span className="barre-compacte-textes">
          <span className="barre-compacte-titre">
            {titreArabe(titre) ? (
              <span className="barre-compacte-ar" lang="ar" dir="rtl">
                {titreArabe(titre)}
              </span>
            ) : null}
            {nomPage ?? titre}
          </span>
          {sousTitre ? <span className="barre-compacte-sous-titre">{sousTitre}</span> : null}
        </span>
        <ChevronUp className="barre-compacte-haut" size={18} aria-hidden="true" />
      </button>
    </>
  );
}
