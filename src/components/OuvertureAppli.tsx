/**
 * Ouverture de l'appli installée : le ق apparaît, le cadre or se dessine,
 * puis tout s'efface vers la page (moins d'une seconde).
 * Affichée une fois par ouverture, seulement dans l'appli installée, jamais si le
 * téléphone demande de réduire les animations. Un appui la fait disparaître.
 * Pur HTML/CSS : le script du layout décide de l'afficher (attribut data-ouverture sur <html>).
 */
export function OuvertureAppli() {
  return (
    <div className="ouverture" aria-hidden="true">
      <svg viewBox="0 0 200 200" className="ouverture-logo">
        <rect className="ouverture-cadre" x="16" y="16" width="168" height="168" rx="30" pathLength={1} />
        <g className="ouverture-lettre">
          <path
            transform="translate(100 96) scale(0.1240 -0.1240) translate(-346.3 -224.7)"
            d="M508 407Q537 407 562 374Q585 345 600.0 299.0Q615 253 625 190Q630 159 629.0 128.5Q628 98 622 70Q597 -48 518 -102Q465 -139 411.5 -157.5Q358 -176 305 -178Q125 -186 72 -41Q58 -1 67 56Q80 142 154 264Q166 283 180 276Q195 269 181 249Q118 156 118 95Q118 37 164 -6Q210 -48 317 -44Q424 -40 534 46Q588 88 590 113Q592 137 569 152Q501 88 433 119Q351 155 401 282Q451 408 508 407ZM513 256Q492 280 475 280Q460 280 446 259Q459 245 479 243Q497 242 513 256ZM501 622Q507 630 518 627Q538 620 557.0 609.0Q576 598 592 584Q600 576 595 566L547 490Q539 479 529 488Q525 492 511.5 500.5Q498 509 476 522L443 468Q436 458 425 466Q420 470 401.5 481.0Q383 492 352 511Q341 517 349 528L397 600Q403 608 414 605Q444 595 470 576Z"
          />
        </g>
      </svg>
    </div>
  );
}
