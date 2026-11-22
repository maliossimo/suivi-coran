/**
 * Le dessin du ciel de la barre du haut, en SVG : la ville (la mosquée, ses deux minarets, les
 * toits et les palmiers au loin), les étoiles, le soleil et la lune.
 *
 * Tout est écrit en texte SVG, une seule fois : la ville ne change jamais (c'est le CSS qui
 * allume ou éteint ses fenêtres selon l'heure), l'astre est redessiné chaque minute à sa place.
 * Les couleurs viennent du CSS (variables du ciel) ; ici, seulement des formes.
 *
 * Repères du dessin (boîte de 360 × 138, posée sous la barre d'état du téléphone) : l'horizon est à
 * y = 98, le soleil et la lune traversent le ciel de x = 160 (lever) à x = 298 (coucher) au-dessus de
 * la grande coupole. Sous l'horizon, le sol porte la ligne des dates. Le titre (à gauche) et le
 * bouton « Mon compte » (à droite) sont hors du dessin : le CSS place la scène entre les deux.
 */
import { phaseLune, type PositionAstre } from "@/domain/ciel";

export const LARGEUR = 360;
export const HAUTEUR = 138;
export const HORIZON = 98;
export const X_LEVER = 160;
export const X_COUCHER = 298;
export const HAUT_ARC = 84;
/** Axe de la mosquée. */
const AXE = 237;

/** Où dessiner l'astre (coordonnées de la boîte du dessin). */
export function coordonneesAstre(p: PositionAstre): { x: number; y: number } {
  return {
    x: Math.round((X_LEVER + (X_COUCHER - X_LEVER) * p.avance) * 10) / 10,
    y: Math.round((HORIZON - HAUT_ARC * p.hauteur) * 10) / 10,
  };
}

/**
 * La lune ne passe jamais à la hauteur d'un minaret (ni devant, ni derrière) : elle monte dans le ciel
 * libre à gauche de la mosquée (entre le titre et le minaret gauche, x 190 au plus près) pendant la
 * première moitié de la nuit, puis redescend dans le ciel libre à droite (après le minaret droit,
 * x 284) pendant la seconde. Elle change de côté au milieu de la nuit, quand elle s'estompe.
 */
export const LUNE_GAUCHE = { debut: 154, fin: 174 } as const;
/** Hauteur de l'arc de la lune : plus basse que celle du soleil, pour que son disque ne soit pas coupé par le haut de la barre. */
export const HAUT_ARC_LUNE = 68;
export const LUNE_DROITE = { debut: 302, fin: 322 } as const;
/** Part de la nuit, autour du milieu, pendant laquelle la lune s'estompe pour changer de côté. */
const FONDU_LUNE = 0.05;

export function coordonneesLune(p: PositionAstre): { x: number; y: number; opacite: number } {
  const gauche = p.avance < 0.5;
  const zone = gauche ? LUNE_GAUCHE : LUNE_DROITE;
  const dans = gauche ? p.avance / 0.5 : (p.avance - 0.5) / 0.5;
  return {
    x: Math.round((zone.debut + (zone.fin - zone.debut) * dans) * 10) / 10,
    y: Math.round((HORIZON - HAUT_ARC_LUNE * p.hauteur) * 10) / 10,
    opacite: Math.min(1, Math.abs(p.avance - 0.5) / FONDU_LUNE),
  };
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------------------------------------
   La mosquée
   ------------------------------------------------------------------------------------------------ */

/** Un minaret : fût, balcon, partie haute, petite galerie, toit pointu et sa pointe. */
function minaret(cx: number): string[] {
  return [
    `M${cx - 4} 112V57H${cx + 4}V112Z`,
    `M${cx - 6.5} 53H${cx + 6.5}V57H${cx - 6.5}Z`,
    `M${cx - 5} 57H${cx + 5}L${cx + 3.6} 60.5H${cx - 3.6}Z`,
    `M${cx - 2.7} 53V40H${cx + 2.7}V53Z`,
    `M${cx - 4} 38H${cx + 4}V40.5H${cx - 4}Z`,
    `M${cx - 3.6} 38L${cx} 20L${cx + 3.6} 38Z`,
    `M${cx - 0.5} 20V13H${cx + 0.5}V20Z`,
  ];
}

/** Toutes les formes pleines de la mosquée : sert au dessin et à la découpe qui garde les lumières dedans. */
export const CORPS: string[] = [
  // salle de prière et façade
  "M194 112V92H280V112Z",
  "M191.5 92H282.5V89.5H191.5Z",
  // porche central (iwan), pointu
  "M226 112V92Q226 84 237 81Q248 84 248 92V112Z",
  // tambour, grande coupole en bulbe et sa pointe
  "M215 92V70H259V92Z",
  "M214 70C214 56 224 49 237 41C250 49 260 56 260 70Z",
  "M236.4 41V33H237.6V41Z",
  // deux petites coupoles sur la toiture
  "M202 90C202 81 206 76 209 73C212 76 216 81 216 90Z",
  "M258 90C258 81 262 76 265 73C268 76 272 81 272 90Z",
  "M208.5 73V68H209.5V73Z",
  "M264.5 73V68H265.5V73Z",
  // les deux minarets
  ...minaret(190),
  ...minaret(284),
  // deux annexes basses, chacune sous sa coupole, de part et d'autre des minarets
  "M152 112V99H186V112Z",
  "M149.5 99H188.5V97H149.5Z",
  "M158 97C158 90 162 87 166 85C170 87 174 90 174 97Z",
  "M165.5 85V80.5H166.5V85Z",
  "M288 112V99H322V112Z",
  "M285.5 99H324.5V97H285.5Z",
  "M300 97C300 90 304 87 308 85C312 87 316 90 316 97Z",
  "M307.5 85V80.5H308.5V85Z",
];

/** Une fenêtre en arc. */
function arc(x: number, y: number, l: number, h: number): string {
  const r = l / 2;
  return `M${x} ${y + h}V${y + r + 0.5}Q${x} ${y} ${x + r} ${y}Q${x + l} ${y} ${x + l} ${y + r + 0.5}V${y + h}Z`;
}

/** Une fenêtre : sa place (boîte x, y, largeur, hauteur), sa forme, et son groupe (allumé ou non selon l'heure). */
export interface Fenetre {
  g: string;
  forme: "arc" | "rond" | "fente";
  x: number;
  y: number;
  l: number;
  h: number;
}

const arcs = (g: string, xs: number[], y: number, l: number, h: number): Fenetre[] =>
  xs.map((x) => ({ g, forme: "arc", x, y, l, h }));

/**
 * Les fenêtres de la mosquée, par groupe : le CSS décide quels groupes sont allumés selon l'heure
 * (p : porche ; m : minarets ; t : tambour ; l1-l3 et r1-r3 : salle, à gauche et à droite ; a : annexes).
 */
export const FENETRES: Fenetre[] = [
  ...arcs("p", [230], 94, 14, 18),
  { g: "p", forme: "rond", x: 234.7, y: 85.7, l: 4.6, h: 4.6 },
  ...[190, 284].flatMap((cx) =>
    [66, 78, 90].map((y): Fenetre => ({ g: "m", forme: "fente", x: cx - 0.9, y, l: 1.8, h: 5 })),
  ),
  ...arcs("t", [219, 227, 235, 243, 251], 73, 4, 9),
  ...arcs("l1", [198], 95, 5, 12),
  ...arcs("l2", [208], 95, 5, 12),
  ...arcs("l3", [218], 95, 5, 12),
  ...arcs("r3", [251], 95, 5, 12),
  ...arcs("r2", [261], 95, 5, 12),
  ...arcs("r1", [271], 95, 5, 12),
  ...arcs("a", [158, 165, 172, 292, 299, 306], 102, 3.6, 8),
];

function formeFenetre({ forme, x, y, l, h }: Fenetre): string {
  if (forme === "rond")
    return `M${x + l / 2} ${y}a${l / 2} ${l / 2} 0 1 1 0 ${l}a${l / 2} ${l / 2} 0 1 1 0 ${-l}Z`;
  if (forme === "fente") return `M${x} ${y}h${l}v${h}h${-l}Z`;
  return arc(x, y, l, h);
}

/** Les fenêtres allumées ensemble (même groupe) forment un seul dessin. */
function groupesDeFenetres(): string {
  const groupes = [...new Set(FENETRES.map((f) => f.g))];
  return groupes
    .map(
      (g) =>
        `<g class="cv-fenetre" data-g="${g}">${chemins(FENETRES.filter((f) => f.g === g).map(formeFenetre))}</g>`,
    )
    .join("");
}

/** Palmier : tronc courbe et six palmes. */
function palmier(x: number, haut: number): string {
  const tete = { x: x + 3, y: 112 - haut };
  const palmes = [
    [-15, 7, -8, -5],
    [-11, -4, -6, -9],
    [-4, -12, -1, -12],
    [6, -12, 4, -12],
    [12, -4, 8, -9],
    [16, 7, 9, -5],
  ]
    .map(
      ([dx, dy, cx, cy]) =>
        `M${tete.x} ${tete.y}Q${tete.x + cx!} ${tete.y + cy!} ${tete.x + dx!} ${tete.y + dy!}`,
    )
    .join("");
  return `<path class="cv-tronc" d="M${x} 112Q${x - 2} ${112 - haut / 2} ${tete.x} ${tete.y}"/><path class="cv-palmes" d="${palmes}"/>`;
}

function chemins(d: string[]): string {
  return d.map((p) => `<path d="${p}"/>`).join("");
}

/** Toits au loin, de part et d'autre du dessin : [position, largeur, hauteur, coupole ?]. */
const TOITS_GAUCHE: [number, number, number, boolean][] = [
  [-340, 28, 8, false],
  [-312, 22, 13, true],
  [-290, 30, 7, false],
  [-260, 26, 10, false],
  [-234, 24, 14, true],
  [-210, 32, 8, false],
  [-178, 22, 11, false],
  [-156, 28, 15, true],
  [-128, 26, 9, false],
  [-102, 30, 12, false],
  [-72, 24, 16, true],
  [-48, 26, 9, false],
  [-22, 22, 12, false],
];

function toits(blocs: [number, number, number, boolean][], decalage = 0): string {
  return blocs
    .map(([x0, l, h, coupole]) => {
      const x = x0 + decalage;
      const haut = 112 - h;
      const mur = `M${x} 112V${haut}H${x + l}V112Z`;
      const m = x + l / 2;
      const dome = coupole
        ? `M${x + 3} ${haut}C${x + 3} ${haut - 5} ${m - 2} ${haut - 8} ${m} ${haut - 10}C${m + 2} ${haut - 8} ${x + l - 3} ${haut - 5} ${x + l - 3} ${haut}Z`
        : "";
      return mur + dome;
    })
    .join("");
}

/** La mosquée seule (sans collines ni palmiers) : le grand ciel la place dans la ville, la miniature seule. */
function mosquee(): string {
  return [
    // un peu réduite pour tenir entière sous la barre d'état
    `<g transform="translate(${AXE} 112) scale(0.88) translate(${-AXE} -112)">`,
    `<g class="cv-mosquee">${chemins(CORPS)}</g>`,
    `<path class="cv-croissant" d="M${AXE} 26.5a4.2 4.2 0 1 0 3 7.2 3.3 3.3 0 1 1 -3-7.2z"/>`,
    `<path class="cv-detail" d="M222 66C224 58 229 52 ${AXE} 47M252 66C250 58 245 52 ${AXE} 47M194 92H280M215 92H259"/>`,
    `<g class="cv-lumieres" clip-path="url(#cv-corps-decoupe)">${groupesDeFenetres()}</g>`,
    `</g>`,
  ].join("");
}

/** La ville : du plus loin (collines, toits) au plus près (mosquée). Le sol est à part (le CSS). */
function ville(): string {
  const colline =
    "M-340 112V101C-280 96 -220 104 -150 100C-80 96 -40 104 0 103C40 97 70 105 110 101C150 97 172 105 204 100C250 94 300 103 360 99C420 95 480 103 540 99C600 96 650 102 700 100V112Z";
  // Toits au loin : très bas à gauche (sous le titre), un peu plus hauts à droite.
  const loinGauche =
    toits(TOITS_GAUCHE) +
    "M0 112V105H14V101Q14 97 20 96Q26 97 26 101V105H40V109H62V102Q62 98 68 97Q74 98 74 102V109H96V104H110V100Q110 96 115 95Q120 96 120 100V105H140V109H166V104H172V99Q172 95 178 94Q184 95 184 99V112Z";
  const loinDroite =
    "M290 112V103H304V98Q304 94 309 93Q314 94 314 98V103H324V76H330V103H342V107H360V112Z M323 76H331L327 62Z" +
    toits(TOITS_GAUCHE.slice(0, 9), 360 + 340);
  // Tout le décor est remonté de 14 : l'horizon est à 98, sous lui le sol des dates.
  const decor = [
    `<path class="cv-colline" d="${colline}"/>`,
    `<g class="cv-loin"><path d="${loinGauche}"/><path d="${loinDroite}"/></g>`,
    palmier(12, 22),
    palmier(347, 26),
    `<rect class="cv-brume" x="0" y="86" width="${LARGEUR}" height="26" fill="url(#cv-brume)"/>`,
    mosquee(),
  ].join("");
  return `<g transform="translate(0 -14)">${decor}</g>`;
}

/** La ville, dessinée une fois pour toutes. */
export const VILLE_SVG: string = ville();

/** Dégradés, découpe des lumières : définis une fois, utilisés par tous les dessins de la page. */
export const DEFS_SVG: string = `<defs>
<radialGradient id="ciel-halo-degrade" class="ciel-halo-degrade"><stop offset="0" stop-color="currentColor" stop-opacity="1"/><stop offset="0.45" stop-color="currentColor" stop-opacity="0.45"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient>
<radialGradient id="soleil-lueur"><stop offset="0.18" stop-color="#fff4c8" stop-opacity="0.95"/><stop offset="0.3" stop-color="#ffe08a" stop-opacity="0.55"/><stop offset="0.5" stop-color="#ffd56e" stop-opacity="0.2"/><stop offset="0.75" stop-color="#ffb84d" stop-opacity="0.06"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
<radialGradient id="soleil-disque" cx="0.5" cy="0.5"><stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#fff6c8"/><stop offset="0.8" stop-color="#ffd75a"/><stop offset="1" stop-color="#ffb82e"/></radialGradient>
<radialGradient id="soleil-couronne"><stop offset="0.55" stop-color="#fff2b0" stop-opacity="0.9"/><stop offset="0.75" stop-color="#ffd56a" stop-opacity="0.35"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
<radialGradient id="soleil-bas-lueur"><stop offset="0.25" stop-color="#ffd9a8" stop-opacity="0.9"/><stop offset="0.4" stop-color="#ff9a55" stop-opacity="0.45"/><stop offset="0.65" stop-color="#ff8a45" stop-opacity="0.14"/><stop offset="1" stop-color="#ff7a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="soleil-bas-disque" cx="0.5" cy="0.5"><stop offset="0" stop-color="#fff6e6"/><stop offset="0.45" stop-color="#ffc982"/><stop offset="0.8" stop-color="#ff8f4a"/><stop offset="1" stop-color="#e9612c"/></radialGradient>
<radialGradient id="lune-modele" cx="0.38" cy="0.35"><stop offset="0" stop-color="#fdfcf7"/><stop offset="0.6" stop-color="#e8e5da"/><stop offset="1" stop-color="#bcb7a8"/></radialGradient>
<radialGradient id="lune-lueur"><stop offset="0.3" stop-color="#f1f4fa" stop-opacity="0.42"/><stop offset="0.45" stop-color="#e3e9f2" stop-opacity="0.16"/><stop offset="0.7" stop-color="#dfe6f0" stop-opacity="0.04"/><stop offset="1" stop-color="#dfe6f0" stop-opacity="0"/></radialGradient>
<radialGradient id="cv-horizon"><stop offset="0" style="stop-color:var(--ciel-halo)" stop-opacity="0.85"/><stop offset="0.5" style="stop-color:var(--ciel-halo)" stop-opacity="0.3"/><stop offset="1" style="stop-color:var(--ciel-halo)" stop-opacity="0"/></radialGradient>
<linearGradient id="cv-brume" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ciel)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--ciel)" stop-opacity="0.75"/></linearGradient>
<linearGradient id="cv-ligne" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--ciel-or)" stop-opacity="0"/><stop offset="0.2" style="stop-color:var(--ciel-or)" stop-opacity="0.8"/><stop offset="0.8" style="stop-color:var(--ciel-or)" stop-opacity="0.8"/><stop offset="1" style="stop-color:var(--ciel-or)" stop-opacity="0"/></linearGradient>
<clipPath id="cv-corps-decoupe">${chemins(CORPS)}</clipPath>
</defs>`;

/* ------------------------------------------------------------------------------------------------
   Étoiles (fixes)
   ------------------------------------------------------------------------------------------------ */

/**
 * Étoiles : [x, y, rayon, rang]. Rang 0 : premières étoiles du soir ; 1 : la nuit ; 2 : la nuit profonde ;
 * 3 : le dernier tiers de la nuit, ciel le plus étoilé. Aucune derrière le titre ni le bouton « Mon compte ».
 */
const ETOILES: [number, number, number, number][] = [
  [240, 12, 1.1, 0],
  [200, 24, 1, 0],
  [282, 22, 1, 0],
  [176, 16, 1.1, 1],
  [214, 8, 1, 1],
  [262, 14, 1.2, 1],
  [300, 32, 0.9, 1],
  [250, 36, 0.9, 1],
  [196, 46, 0.9, 1],
  [152, 8, 0.8, 2],
  [228, 22, 0.8, 2],
  [276, 28, 1, 2],
  [292, 50, 0.9, 2],
  [164, 40, 0.8, 2],
  [208, 58, 0.9, 2],
  [268, 50, 0.8, 2],
  [316, 70, 0.8, 2],
  [168, 28, 1, 3],
  [188, 6, 0.9, 3],
  [244, 6, 1.1, 3],
  [286, 8, 0.9, 3],
  [304, 58, 0.9, 3],
  [180, 62, 0.8, 3],
  [224, 48, 0.9, 3],
  [258, 66, 0.8, 3],
  [308, 44, 0.8, 3],
];

/** Un groupe d'étoiles par rang : le CSS allume les rangs selon le moment de la nuit. */
function etoiles(): string {
  return [0, 1, 2, 3]
    .map((rang) => {
      const cercles = ETOILES.map((e, i) => ({ e, i }))
        .filter(({ e }) => e[3] === rang)
        .map(
          ({ e: [x, y, r], i }) =>
            `<circle cx="${x}" cy="${y}" r="${r}" style="animation-delay:${((i * 0.7) % 3).toFixed(1)}s"/>`,
        )
        .join("");
      return `<g class="cv-rang" data-r="${rang}">${cercles}</g>`;
    })
    .join("");
}

/** Étoiles : fixes, ne sont jamais redessinés. */
export const FOND_SVG: string = `${etoiles()}`;

/* ------------------------------------------------------------------------------------------------
   Le soleil et la lune
   ------------------------------------------------------------------------------------------------ */

/** Seize rayons fins autour du soleil : longs et courts en alternance. */
function rayons(x: number, y: number, r: number): string {
  const formes: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const bout = r * (i % 2 === 0 ? 2.7 : 2.1);
    const pt = (rayon: number, decalage: number) =>
      `${arrondi(x + rayon * Math.cos(a + decalage))} ${arrondi(y + rayon * Math.sin(a + decalage))}`;
    formes.push(`M${pt(r * 1.35, -0.09)}L${pt(bout, 0)}L${pt(r * 1.35, 0.09)}Z`);
  }
  return `<path class="cv-rayons" d="${formes.join("")}"/>`;
}

/** Soleil : plus haut il est petit, blanc et rayonnant ; sur l'horizon il est gros, orangé, sans rayons. */
function soleil(x: number, y: number, bas: number): string {
  const haut = arrondi(1 - bas);
  const r = arrondi(9.5 + 4 * bas);
  return [
    `<g class="cv-soleil">`,
    `<ellipse cx="${x}" cy="${HORIZON}" rx="${arrondi(70 + 40 * bas)}" ry="${arrondi(24 + 14 * bas)}" fill="url(#cv-horizon)" opacity="${arrondi(0.15 + 0.85 * bas)}"/>`,
    `<g opacity="${arrondi(haut * 0.8)}">${rayons(x, y, r)}</g>`,
    `<circle cx="${x}" cy="${y}" r="${arrondi(38 + 6 * bas)}" fill="url(#soleil-lueur)" opacity="${haut}"/>`,
    `<circle cx="${x}" cy="${y}" r="${arrondi(40 + 12 * bas)}" fill="url(#soleil-bas-lueur)" opacity="${arrondi(bas)}"/>`,
    `<circle cx="${x}" cy="${y}" r="${arrondi(r * 1.75)}" fill="url(#soleil-couronne)" opacity="${haut}"/>`,
    `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#soleil-disque)" opacity="${haut}"/>`,
    `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#soleil-bas-disque)" opacity="${arrondi(bas)}"/>`,
    `</g>`,
  ].join("");
}

/** Lune du mois hégirien : la part éclairée suit le jour du mois ; lueur intense près du disque. */
function lune(jour: number, cx: number, cy: number, r: number, id: string, opacite = 1): string {
  const { eclairee, croissante } = phaseLune(jour);
  const decalage = arrondi(2 * r * eclairee * (croissante ? -1 : 1));
  const k = r / 10;
  return [
    `<g class="ciel-lune"${opacite < 1 ? ` opacity="${arrondi(opacite)}"` : ""}>`,
    `<mask id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${arrondi(cx + decalage)}" cy="${cy}" r="${arrondi(r + 0.4 * k)}" fill="#000"/></mask>`,
    `<circle class="ciel-lune-halo" cx="${cx}" cy="${cy}" r="${arrondi(r * 3.6)}" fill="url(#lune-lueur)"/>`,
    `<g mask="url(#${id})"><circle class="ciel-lune-disque" cx="${cx}" cy="${cy}" r="${r}"/>`,
    `<g class="ciel-lune-mers"><circle cx="${arrondi(cx - 3 * k)}" cy="${arrondi(cy - 3.5 * k)}" r="${arrondi(2.6 * k)}"/><circle cx="${arrondi(cx + 3.5 * k)}" cy="${arrondi(cy - 2 * k)}" r="${arrondi(1.8 * k)}"/><circle cx="${arrondi(cx - k)}" cy="${arrondi(cy + 3.5 * k)}" r="${arrondi(2.1 * k)}"/><circle cx="${arrondi(cx + 4 * k)}" cy="${arrondi(cy + 4 * k)}" r="${arrondi(1.1 * k)}"/></g></g>`,
    `</g>`,
  ].join("");
}

/** Ramadan : deux lanternes suspendues, de part et d'autre du ciel de la mosquée. */
function lanternes(): string {
  return `<g class="ciel-fanous">${[
    { x: 172, l: 18, d: "0s" },
    { x: 300, l: 12, d: "-1.4s" },
  ]
    .map(
      (f) =>
        `<g class="ciel-fanous-un" style="transform-origin:${f.x}px 0px;animation-delay:${f.d}"><line x1="${f.x}" y1="0" x2="${f.x}" y2="${f.l}"/><path d="M${f.x - 5} ${f.l + 4}H${f.x + 5}L${f.x + 4} ${f.l + 16}H${f.x - 4}Z M${f.x - 3} ${f.l + 4}L${f.x} ${f.l}L${f.x + 3} ${f.l + 4}Z"/><circle class="ciel-fanous-flamme" cx="${f.x}" cy="${f.l + 10}" r="2.2"/></g>`,
    )
    .join("")}</g>`;
}

export interface CielAChanger {
  /** Où est l'astre ; null : aucun (ciel figé la nuit). */
  position: PositionAstre | null;
  /** Jour du mois hégirien (pour la phase de la lune), ou null : pas de lune. */
  jourHegire: number | null;
  ramadan: boolean;
}

/** La partie du ciel qui bouge : halo, soleil ou lune à leur place du moment, lanternes de Ramadan. */
export function astreSvg({ position, jourHegire, ramadan }: CielAChanger): string {
  let dessin = "";
  if (position) {
    const enLune = position.astre === "lune";
    const { x, y, opacite } = enLune
      ? coordonneesLune(position)
      : { ...coordonneesAstre(position), opacite: 1 };
    // Sous l'horizon, l'astre est caché par la ville : inutile de le dessiner.
    if (y <= HORIZON + 14) {
      dessin += `<circle class="ciel-halo" cx="${x}" cy="${y}" r="80" fill="url(#ciel-halo-degrade)"/>`;
      if (!enLune) dessin += soleil(x, y, position.bas);
      else if (jourHegire !== null)
        dessin += lune(jourHegire, x, y, arrondi(10 + 2 * position.bas), "masque-lune", opacite);
    }
  }
  return dessin + (ramadan ? lanternes() : "");
}

/* ------------------------------------------------------------------------------------------------
   Version miniature (en-tête compact quand on descend dans la page)
   ------------------------------------------------------------------------------------------------ */

/** Mêmes ville et astre, en petit, calés à droite. */
export function miniSvg(moment: "fajr" | "jour" | "maghrib" | "nuit", jourHegire: number | null): string {
  const bas = moment === "fajr" || moment === "maghrib";
  let astre = "";
  if (moment === "jour") {
    astre = `<g class="ciel-soleil-reel"><circle cx="132" cy="26" r="22" fill="url(#soleil-lueur)"/><circle cx="132" cy="26" r="12" fill="url(#soleil-couronne)"/><circle cx="132" cy="26" r="7" fill="url(#soleil-disque)"/></g>`;
  } else if (bas) {
    astre = `<g class="ciel-soleil-reel"><circle cx="128" cy="44" r="26" fill="url(#soleil-bas-lueur)"/><circle cx="128" cy="44" r="8.5" fill="url(#soleil-bas-disque)"/></g>`;
  } else if (jourHegire !== null) {
    astre = lune(jourHegire, 132, 24, 7, "masque-lune-mini");
  }
  const etoiles = [
    [24, 14, 0.9],
    [70, 30, 0.8],
    [118, 10, 1],
    [150, 40, 0.7],
  ]
    .map(
      ([x, y, r], i) =>
        `<circle cx="${x}" cy="${y}" r="${r}" style="animation-delay:${((i * 0.9) % 3).toFixed(1)}s"/>`,
    )
    .join("");
  return `<g class="ciel-etoiles">${etoiles}</g>${astre}<g transform="translate(220 64) scale(0.4) translate(-360 -138)"><g transform="translate(0 -14)">${mosquee()}</g></g>`;
}
