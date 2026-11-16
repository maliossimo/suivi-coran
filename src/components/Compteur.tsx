"use client";

import { useEffect, useState } from "react";

const FORMAT = new Intl.NumberFormat("fr-FR");

/**
 * Un nombre qui monte de 0 à sa valeur à l'affichage (environ 0,5 s, en ralentissant à la fin),
 * seulement la première fois que la page est vue pendant la visite.
 * Le serveur rend déjà la valeur exacte (lecteurs d'écran, page sans JavaScript, impression) ;
 * rien ne bouge si le téléphone demande de réduire les animations.
 */
export function Compteur({ valeur }: { valeur: number }) {
  const [affiche, setAffiche] = useState(valeur);
  useEffect(() => {
    if (
      valeur <= 0 ||
      !Number.isFinite(valeur) ||
      // Page déjà vue pendant cette visite : le nombre s'affiche directement.
      document.documentElement.hasAttribute("data-revisite") ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setAffiche(valeur);
      return;
    }
    const duree = Math.min(650, 350 + valeur * 3);
    let debut: number | null = null;
    let image = 0;
    const pas = (t: number) => {
      debut ??= t;
      const k = Math.min(1, (t - debut) / duree);
      setAffiche(Math.round(valeur * (1 - Math.pow(1 - k, 3))));
      if (k < 1) image = requestAnimationFrame(pas);
    };
    setAffiche(0);
    image = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(image);
      setAffiche(valeur);
    };
  }, [valeur]);
  return <span className="nombre-anime">{FORMAT.format(affiche)}</span>;
}
