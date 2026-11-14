"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Fine barre en haut de l'écran dès qu'on touche un lien : la page suivante arrive. Retour immédiat
 * au toucher, même si le réseau est lent (au-delà de 150 ms seulement, pour ne pas clignoter).
 */
export function BarreNavigation() {
  const chemin = usePathname();
  const parametres = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let attente: ReturnType<typeof setTimeout> | undefined;
    let secours: ReturnType<typeof setTimeout> | undefined;
    const surClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!lien || lien.target || lien.hasAttribute("download")) return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      clearTimeout(attente);
      clearTimeout(secours);
      attente = setTimeout(() => setActive(true), 150);
      secours = setTimeout(() => setActive(false), 15_000);
    };
    document.addEventListener("click", surClic, true);
    const arreter = () => {
      clearTimeout(attente);
      clearTimeout(secours);
    };
    window.addEventListener("barre-navigation-fin", arreter);
    return () => {
      document.removeEventListener("click", surClic, true);
      window.removeEventListener("barre-navigation-fin", arreter);
      arreter();
    };
  }, []);

  // La nouvelle page est là.
  useEffect(() => {
    setActive(false);
    window.dispatchEvent(new Event("barre-navigation-fin"));
  }, [chemin, parametres]);

  return active ? (
    <div className="barre-navigation" role="progressbar" aria-label="Chargement de la page" />
  ) : null;
}
