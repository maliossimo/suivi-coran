"use client";

import { useEffect, useRef, useState } from "react";
import { LogoEtoile } from "./logo/LogoEtoile";

/**
 * En-tête compact : quand la grande barre du haut quitte l'écran en descendant, une barre fine (logo et
 * titre de la page, sur verre dépoli) glisse depuis le haut ; elle repart quand la grande barre revient.
 * Elle ne prend aucune place dans la page : rien ne saute pendant le défilement. Un toucher remonte en haut.
 */
export function EnteteCompact({ titre }: { titre: string }) {
  const repere = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const barre = repere.current?.closest("header");
    if (!barre || typeof IntersectionObserver === "undefined") return;
    const observateur = new IntersectionObserver(
      ([entree]) => setVisible(Boolean(entree) && entree!.intersectionRatio < 0.3),
      { threshold: [0, 0.3, 0.6, 1] },
    );
    observateur.observe(barre);
    return () => observateur.disconnect();
  }, []);

  return (
    <>
      <span ref={repere} hidden />
      <button
        type="button"
        className="barre-compacte"
        data-visible={visible ? "" : undefined}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Remonter en haut de la page"
      >
        <LogoEtoile className="barre-compacte-logo" />
        <span className="barre-compacte-titre">{titre}</span>
      </button>
    </>
  );
}
