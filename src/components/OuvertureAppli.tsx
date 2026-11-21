"use client";

import { useEffect, useState } from "react";
import { retoursActives } from "./retourSensoriel";

/**
 * Ouverture de l'appli installée, dans la continuité de l'écran de démarrage
 * (même image : étoile à 8 branches or et ق crème) :
 * le logo est d'abord là, tel qu'Android le montre ; un trait d'or vif parcourt l'étoile,
 * un calame doré repasse sur le ق (le corps, puis les deux points), l'étoile pivote d'un
 * huitième de tour, un reflet traverse la lettre, le nom apparaît ; un court temps figé,
 * « القرآن الكريم » s'écrit en calligraphie sous le logo ;
 * puis le logo file vers l'en-tête et la page sort du logo en s'élargissant (onde). Environ 2,3 s.
 * Pas de numéro de version ici : il est dans « Mon compte ».
 * Version complète (≈ 3,3 s) à la première ouverture du jour, version courte (≈ 1,1 s) ensuite ;
 * seulement dans l'appli installée, jamais si le téléphone demande de réduire les animations ;
 * un appui la passe. La salutation avec le prénom et une vibration légère (réglage « retours »)
 * font partie de la version complète.
 * Pur HTML/CSS : le script du layout ajoute data-ouverture sur <html>.
 */
export function OuvertureAppli() {
  const [prenom, setPrenom] = useState("");
  useEffect(() => {
    const mode = document.documentElement.getAttribute("data-ouverture");
    if (mode === null) return;
    // Le prénom de la salutation de la barre du haut (déjà dans la page, derrière l'ouverture).
    setPrenom(document.querySelector(".barre-salutation-prenom")?.textContent?.trim() ?? "");
    // Petite vibration quand le vert atteint les bords (animation complète seulement).
    const t = window.setTimeout(() => {
      if (document.documentElement.hasAttribute("data-ouverture") && retoursActives()) {
        navigator.vibrate?.(14);
      }
    }, 1400);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="ouverture" aria-hidden="true">
      <svg viewBox="0 0 200 200" className="ouverture-logo">
        <g className="ouverture-etoile">
          <rect x="44" y="44" width="112" height="112" />
          <rect x="44" y="44" width="112" height="112" transform="rotate(45 100 100)" />
          <circle cx="100" cy="100" r="41" />
          <rect className="ouverture-trait" x="44" y="44" width="112" height="112" pathLength={1} />
          <rect
            className="ouverture-trait"
            x="44"
            y="44"
            width="112"
            height="112"
            transform="rotate(45 100 100)"
            pathLength={1}
          />
        </g>
        <g transform="translate(100 97.6) scale(0.0800 -0.0800) translate(-346.3 -224.7)">
          <path
            className="ouverture-lettre"
            d="M508 407Q537 407 562 374Q585 345 600.0 299.0Q615 253 625 190Q630 159 629.0 128.5Q628 98 622 70Q597 -48 518 -102Q465 -139 411.5 -157.5Q358 -176 305 -178Q125 -186 72 -41Q58 -1 67 56Q80 142 154 264Q166 283 180 276Q195 269 181 249Q118 156 118 95Q118 37 164 -6Q210 -48 317 -44Q424 -40 534 46Q588 88 590 113Q592 137 569 152Q501 88 433 119Q351 155 401 282Q451 408 508 407ZM513 256Q492 280 475 280Q460 280 446 259Q459 245 479 243Q497 242 513 256Z"
          />
          <path
            className="ouverture-lettre"
            d="M501 622Q507 630 518 627Q538 620 557.0 609.0Q576 598 592 584Q600 576 595 566L547 490Q539 479 529 488Q525 492 511.5 500.5Q498 509 476 522L443 468Q436 458 425 466Q420 470 401.5 481.0Q383 492 352 511Q341 517 349 528L397 600Q403 608 414 605Q444 595 470 576Z"
          />
          <path
            className="ouverture-calame ouverture-calame-corps"
            pathLength={1}
            d="M508 407Q537 407 562 374Q585 345 600.0 299.0Q615 253 625 190Q630 159 629.0 128.5Q628 98 622 70Q597 -48 518 -102Q465 -139 411.5 -157.5Q358 -176 305 -178Q125 -186 72 -41Q58 -1 67 56Q80 142 154 264Q166 283 180 276Q195 269 181 249Q118 156 118 95Q118 37 164 -6Q210 -48 317 -44Q424 -40 534 46Q588 88 590 113Q592 137 569 152Q501 88 433 119Q351 155 401 282Q451 408 508 407ZM513 256Q492 280 475 280Q460 280 446 259Q459 245 479 243Q497 242 513 256Z"
          />
          <path
            className="ouverture-calame ouverture-calame-points"
            pathLength={1}
            d="M501 622Q507 630 518 627Q538 620 557.0 609.0Q576 598 592 584Q600 576 595 566L547 490Q539 479 529 488Q525 492 511.5 500.5Q498 509 476 522L443 468Q436 458 425 466Q420 470 401.5 481.0Q383 492 352 511Q341 517 349 528L397 600Q403 608 414 605Q444 595 470 576Z"
          />
        </g>
      </svg>
      {/* Signature : « القرآن الكريم » s'écrit au calame, de droite à gauche, sous le logo. */}
      <p className="ouverture-calligraphie" lang="ar" dir="rtl">
        القرآن الكريم
      </p>
      {/* Salutation : « السلام عليكم » et le prénom, qui s'efface quand la barre du haut prend le relais. */}
      <p className="ouverture-salut">
        <span lang="ar" dir="rtl">
          السلام عليكم
        </span>
        {prenom ? <span>{prenom}</span> : null}
      </p>
    </div>
  );
}
