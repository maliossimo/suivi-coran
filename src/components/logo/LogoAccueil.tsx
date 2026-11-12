"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { LogoEtoile } from "./LogoEtoile";

/**
 * Logo de la barre du haut (étoile à 8 branches or + ق), qui ramène à l'accueil.
 * Au toucher : l'étoile fait un huitième de tour, le ق se presse, une onde dorée part du logo,
 * puis la page d'accueil s'ouvre — on voit tout de suite que c'est un bouton.
 */
export function LogoAccueil({
  accueil,
  label,
  children,
}: {
  accueil: string;
  label: string;
  children: ReactNode;
}) {
  const lien = useRef<HTMLAnchorElement>(null);
  const router = useRouter();
  const chemin = usePathname();

  function jouer(e: MouseEvent<HTMLAnchorElement>) {
    // Ouverture dans un nouvel onglet (Ctrl, Cmd, clic du milieu) : comportement normal.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const el = lien.current;
    if (el) {
      el.classList.remove("joue");
      void el.offsetWidth; // relance l'animation
      el.classList.add("joue");
    }
    if (chemin === accueil) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // On laisse l'animation démarrer avant de changer de page.
    window.setTimeout(() => router.push(accueil), 170);
  }

  return (
    <Link ref={lien} href={accueil} className="barre-marque" aria-label={label} onClick={jouer}>
      <span className="barre-logo" aria-hidden="true">
        <LogoEtoile />
        <span className="barre-logo-onde" />
      </span>
      {children}
    </Link>
  );
}
