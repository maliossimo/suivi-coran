import { describe, expect, it } from "vitest";
import { carteDuCoran } from "./carte";
import type { Seance } from "./fiche";
import { creerReferentiel, type Sourate } from "./versets";

const ref = creerReferentiel([
  { numero: 1, nomAr: "الفاتحة", nomLatin: "Al-Fatiha", nbVersets: 7, premierVersetGlobal: 1 },
  { numero: 67, nomAr: "الملك", nomLatin: "Al-Mulk", nbVersets: 30, premierVersetGlobal: 5242 },
  { numero: 68, nomAr: "القلم", nomLatin: "Al-Qalam", nbVersets: 52, premierVersetGlobal: 5272 },
  { numero: 114, nomAr: "الناس", nomLatin: "An-Nas", nbVersets: 6, premierVersetGlobal: 6231 },
] satisfies Sourate[]);

const seance = (date: string, type: Seance["type"], passages: Seance["passages"]): Seance => ({
  id: `${date}-${type}`,
  date,
  type,
  dureeMin: 20,
  tajwid: null,
  noteLibre: null,
  corrigee: false,
  passages,
});
const p = (s: number, a: number, b: number) => ({
  sourateDebut: s,
  versetDebut: a,
  sourateFin: s,
  versetFin: b,
});

const seances = [
  seance("2026-08-01", "apprentissage", [p(1, 1, 7)]), // Al-Fatiha connue, plus travaillée depuis août
  seance("2026-10-20", "apprentissage", [p(67, 1, 20)]),
  seance("2026-11-05", "apprentissage", [p(67, 21, 30)]), // Al-Mulk complète grâce à 2 séances
  seance("2026-11-08", "apprentissage", [p(68, 1, 10)]), // Al-Qalam commencée
  seance("2026-11-09", "revision", [p(114, 1, 6)]), // An-Nas révisée (connue d'avant)
  seance("2026-12-01", "apprentissage", [p(68, 11, 52)]), // dans le futur : ignorée
];

describe("carteDuCoran", () => {
  const carte = carteDuCoran(ref, seances, "2026-11-11");
  const etat = (n: number) => carte.cases.find((c) => c.sourate.numero === n)?.etat;

  it("donne l'état de chaque sourate, dans l'ordre du Coran", () => {
    expect(carte.cases.map((c) => c.sourate.numero)).toEqual([1, 67, 68, 114]);
    expect(etat(1)).toBe("a_reviser");
    expect(etat(67)).toBe("maitrisee");
    expect(etat(68)).toBe("en_cours");
    expect(etat(114)).toBe("maitrisee");
  });

  it("calcule la part couverte et ignore les séances futures", () => {
    expect(carte.cases.find((c) => c.sourate.numero === 68)?.pourcentage).toBe(19);
  });

  it("compte les sourates par état", () => {
    expect(carte.compte).toEqual({ maitrisee: 2, a_reviser: 1, en_cours: 1, vide: 0 });
  });

  it("propose d'abord les sourates connues travaillées il y a le plus longtemps", () => {
    expect(carte.aReviserAujourdhui.map((c) => c.sourate.numero)).toEqual([1, 67, 114]);
  });

  it("une sourate jamais travaillée est vide", () => {
    expect(carteDuCoran(ref, [], "2026-11-11").compte.vide).toBe(4);
  });
});
