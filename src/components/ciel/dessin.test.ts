import { describe, expect, it } from "vitest";
import { positionAstre } from "@/domain/ciel";
import { horairesPriere } from "@/domain/priere";
import {
  astreSvg,
  coordonneesLune,
  LUNE_DROITE,
  LUNE_GAUCHE,
  coordonneesAstre,
  CORPS,
  DEFS_SVG,
  FENETRES,
  FOND_SVG,
  HAUT_ARC,
  HORIZON,
  VILLE_SVG,
  X_COUCHER,
  X_LEVER,
  type Fenetre,
} from "./dessin";

/** Les volumes pleins de la mosquée (x0, y0, x1, y1) : une fenêtre doit tenir entière dans l'un d'eux. */
const VOLUMES: [number, number, number, number][] = [
  [194, 92, 280, 112], // salle de prière
  [226, 81, 248, 112], // porche
  [215, 70, 259, 92], // tambour
  [186, 57, 194, 112], // fût du minaret gauche
  [280, 57, 288, 112], // fût du minaret droit
  [152, 99, 186, 112], // annexe gauche
  [288, 99, 322, 112], // annexe droite
];

const dedans = (f: Fenetre, [x0, y0, x1, y1]: [number, number, number, number]) =>
  f.x >= x0 && f.y >= y0 && f.x + f.l <= x1 && f.y + f.h <= y1;

describe("mosquée : les lumières restent dans les bâtiments", () => {
  it("chaque fenêtre tient entière dans un volume de la mosquée", () => {
    for (const f of FENETRES) {
      expect(
        VOLUMES.some((v) => dedans(f, v)),
        `fenêtre ${f.g} en (${f.x}, ${f.y})`,
      ).toBe(true);
    }
  });
  it("la découpe des lumières reprend exactement les formes de la mosquée", () => {
    expect(DEFS_SVG.match(/<clipPath id="cv-corps-decoupe">/g)).toHaveLength(1);
    expect(DEFS_SVG.match(/<path /g)).toHaveLength(CORPS.length);
    expect(VILLE_SVG).toContain('clip-path="url(#cv-corps-decoupe)"');
  });
  it("tous les groupes de fenêtres que le CSS allume existent", () => {
    const groupes = new Set(FENETRES.map((f) => f.g));
    for (const g of ["p", "m", "t", "l1", "l2", "l3", "r1", "r2", "r3", "a"]) {
      expect(groupes.has(g), `groupe ${g}`).toBe(true);
      expect(VILLE_SVG).toContain(`data-g="${g}"`);
    }
  });
});

describe("étoiles", () => {
  it("quatre rangs : premières étoiles, nuit, nuit profonde, dernier tiers", () => {
    for (const rang of [0, 1, 2, 3]) expect(FOND_SVG).toContain(`data-r="${rang}"`);
  });
});

describe("coordonneesAstre", () => {
  it("l'astre traverse le ciel du lever au coucher, au-dessus de la mosquée à midi", () => {
    const lever = coordonneesAstre({ astre: "soleil", avance: 0, hauteur: 0, bas: 1 });
    const midi = coordonneesAstre({ astre: "soleil", avance: 0.5, hauteur: 1, bas: 0 });
    const coucher = coordonneesAstre({ astre: "soleil", avance: 1, hauteur: 0, bas: 1 });
    expect(lever).toEqual({ x: X_LEVER, y: HORIZON });
    expect(coucher).toEqual({ x: X_COUCHER, y: HORIZON });
    expect(midi.y).toBe(HORIZON - HAUT_ARC);
    // Le zénith reste visible, sous la barre d'état du téléphone.
    expect(midi.y).toBeGreaterThanOrEqual(12);
    expect(midi.x).toBeGreaterThan(200);
    expect(midi.x).toBeLessThan(260);
  });
});

describe("astreSvg", () => {
  const h = horairesPriere("2026-11-17");
  const m = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
  const rendu = (heure: string, jourHegire: number | null, ramadan = false) =>
    astreSvg({ position: positionAstre(m(heure), h), jourHegire, ramadan });

  it("le jour : le soleil, pas de lune", () => {
    const svg = rendu("12:30", 8);
    expect(svg).toContain("cv-soleil");
    expect(svg).not.toContain("ciel-lune");
  });
  it("la nuit : la lune de la phase du mois, pas de soleil", () => {
    const svg = rendu("22:00", 8);
    expect(svg).toContain("ciel-lune");
    expect(svg).not.toContain("cv-soleil");
  });
  it("sans jour hégirien : pas de lune (ciel figé)", () => {
    expect(rendu("22:00", null)).not.toContain("ciel-lune");
  });
  it("sous l'horizon, l'astre n'est pas dessiné", () => {
    const svg = astreSvg({
      position: { astre: "soleil", avance: 1.04, hauteur: -0.3, bas: 1 },
      jourHegire: 8,
      ramadan: false,
    });
    expect(svg).toBe("");
  });
  it("sans position (ciel figé la nuit) : rien, sauf les lanternes de Ramadan", () => {
    expect(astreSvg({ position: null, jourHegire: null, ramadan: false })).toBe("");
    expect(astreSvg({ position: null, jourHegire: null, ramadan: true })).toContain("ciel-fanous");
  });
});

describe("trajet de la lune", () => {
  // Minarets (x au plus près : gauche 189,9 ; droit 272,7 à 284,1). La lune a un rayon d'au plus 12.
  const position = (avance: number) => ({
    astre: "lune" as const,
    avance,
    hauteur: Math.sin(Math.PI * avance),
    bas: 0,
  });
  it("ne passe jamais à la hauteur d'un minaret", () => {
    for (let i = 0; i <= 200; i++) {
      const { x } = coordonneesLune(position(i / 200));
      const dansGauche = x + 12 <= 189.9 - 3;
      const dansDroite = x - 12 >= 284.1 + 3;
      expect(dansGauche || dansDroite).toBe(true);
    }
  });
  it("reste entièrement visible : jamais coupée par le haut de la barre", () => {
    for (let i = 0; i <= 200; i++) {
      const { y } = coordonneesLune(position(i / 200));
      expect(y - 14).toBeGreaterThanOrEqual(8); // rayon maximal 14 (avec la taille « basse »)
    }
  });
  it("monte à gauche puis redescend à droite", () => {
    expect(coordonneesLune(position(0.1)).x).toBeLessThanOrEqual(LUNE_GAUCHE.fin);
    expect(coordonneesLune(position(0.9)).x).toBeGreaterThanOrEqual(LUNE_DROITE.debut);
    expect(coordonneesLune(position(0.25)).y).toBeLessThan(coordonneesLune(position(0.05)).y);
  });
  it("s'estompe en changeant de côté", () => {
    expect(coordonneesLune(position(0.5)).opacite).toBe(0);
    expect(coordonneesLune(position(0.3)).opacite).toBe(1);
    expect(coordonneesLune(position(0.7)).opacite).toBe(1);
  });
});
