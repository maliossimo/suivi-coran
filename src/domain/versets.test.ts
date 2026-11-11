import { describe, expect, it } from "vitest";
import {
  creerReferentiel,
  fusionner,
  indexGlobal,
  libellePassage,
  lirePassageTexte,
  passageEnTexte,
  passageSuivant,
  nbVersetsDistincts,
  pourcentageDuCoran,
  versIntervalle,
  type Sourate,
} from "./versets";

// Extrait du référentiel (valeurs identiques à la migration des sourates).
const SOURATES: Sourate[] = [
  { numero: 1, nomAr: "الفاتحة", nomLatin: "Al-Fatiha", nbVersets: 7, premierVersetGlobal: 1 },
  { numero: 67, nomAr: "الملك", nomLatin: "Al-Mulk", nbVersets: 30, premierVersetGlobal: 5242 },
  { numero: 68, nomAr: "القلم", nomLatin: "Al-Qalam", nbVersets: 52, premierVersetGlobal: 5272 },
  { numero: 114, nomAr: "الناس", nomLatin: "An-Nas", nbVersets: 6, premierVersetGlobal: 6231 },
];
const ref = creerReferentiel(SOURATES);

describe("indexGlobal", () => {
  it("calcule l'index sur tout le Coran", () => {
    expect(indexGlobal(ref, 1, 1)).toBe(1);
    expect(indexGlobal(ref, 67, 1)).toBe(5242);
    expect(indexGlobal(ref, 114, 6)).toBe(6236);
  });

  it("refuse un verset hors de la sourate", () => {
    expect(() => indexGlobal(ref, 67, 31)).toThrow(/hors de la sourate/);
    expect(() => indexGlobal(ref, 67, 0)).toThrow();
    expect(() => indexGlobal(ref, 999, 1)).toThrow(/inconnue/);
  });
});

describe("versIntervalle", () => {
  it("accepte un passage sur deux sourates", () => {
    expect(versIntervalle(ref, { sourateDebut: 67, versetDebut: 28, sourateFin: 68, versetFin: 2 })).toEqual([
      5269, 5273,
    ]);
  });

  it("refuse un passage à l'envers", () => {
    expect(() =>
      versIntervalle(ref, { sourateDebut: 67, versetDebut: 10, sourateFin: 67, versetFin: 5 }),
    ).toThrow();
  });
});

describe("fusionner", () => {
  it("fusionne les chevauchements et les intervalles contigus", () => {
    expect(
      fusionner([
        [10, 20],
        [1, 5],
        [15, 25],
        [26, 30],
        [40, 41],
      ]),
    ).toEqual([
      [1, 5],
      [10, 30],
      [40, 41],
    ]);
  });

  it("gère une liste vide", () => {
    expect(fusionner([])).toEqual([]);
  });
});

describe("nbVersetsDistincts", () => {
  it("ne compte pas deux fois un passage révisé plusieurs fois", () => {
    const p = { sourateDebut: 67, versetDebut: 1, sourateFin: 67, versetFin: 15 };
    expect(nbVersetsDistincts(ref, [p, p])).toBe(15);
  });

  it("additionne des passages disjoints et chevauchants", () => {
    expect(
      nbVersetsDistincts(ref, [
        { sourateDebut: 67, versetDebut: 1, sourateFin: 67, versetFin: 15 },
        { sourateDebut: 67, versetDebut: 10, sourateFin: 67, versetFin: 30 },
        { sourateDebut: 1, versetDebut: 1, sourateFin: 1, versetFin: 7 },
      ]),
    ).toBe(37);
  });
});

describe("pourcentageDuCoran", () => {
  it("arrondit à 0,1 %", () => {
    expect(pourcentageDuCoran(6236)).toBe(100);
    expect(pourcentageDuCoran(412)).toBe(6.6);
    expect(pourcentageDuCoran(0)).toBe(0);
  });
});

describe("libellePassage", () => {
  it("affiche les noms dans les deux langues", () => {
    expect(libellePassage(ref, { sourateDebut: 67, versetDebut: 1, sourateFin: 67, versetFin: 15 })).toBe(
      "Al-Mulk \u2068الملك\u2069 · 1 → 15",
    );
  });

  it("isole le nom arabe pour que les numéros restent à leur place", () => {
    const texte = libellePassage(ref, { sourateDebut: 1, versetDebut: 1, sourateFin: 1, versetFin: 7 });
    expect(texte.startsWith("Al-Fatiha \u2068الفاتحة\u2069")).toBe(true);
    expect(texte.endsWith("1 → 7")).toBe(true);
  });
});

describe("passageSuivant", () => {
  it("continue la même sourate", () => {
    expect(passageSuivant(ref, { sourateDebut: 67, versetDebut: 1, sourateFin: 67, versetFin: 15 })).toEqual({
      sourateDebut: 67,
      versetDebut: 16,
      sourateFin: 67,
      versetFin: 30,
    });
  });
  it("passe à la sourate suivante quand la sourate est terminée", () => {
    expect(passageSuivant(ref, { sourateDebut: 67, versetDebut: 16, sourateFin: 67, versetFin: 30 })).toEqual(
      {
        sourateDebut: 68,
        versetDebut: 1,
        sourateFin: 68,
        versetFin: 52,
      },
    );
  });
  it("s'arrête après la dernière sourate", () => {
    expect(
      passageSuivant(ref, { sourateDebut: 114, versetDebut: 1, sourateFin: 114, versetFin: 6 }),
    ).toBeNull();
  });
});

describe("passage dans une adresse", () => {
  it("écrit puis relit un passage", () => {
    const p = { sourateDebut: 67, versetDebut: 5, sourateFin: 67, versetFin: 30 };
    expect(passageEnTexte(p)).toBe("67:5-30");
    expect(lirePassageTexte(ref, "67:5-30")).toEqual(p);
    const q = { sourateDebut: 67, versetDebut: 20, sourateFin: 68, versetFin: 3 };
    expect(passageEnTexte(q)).toBe("67:20-68:3");
    expect(lirePassageTexte(ref, "67:20-68:3")).toEqual(q);
  });

  it("refuse un passage mal formé ou hors du Coran", () => {
    expect(lirePassageTexte(ref, undefined)).toBeNull();
    expect(lirePassageTexte(ref, "abc")).toBeNull();
    expect(lirePassageTexte(ref, "67:40-41")).toBeNull();
    expect(lirePassageTexte(ref, "67:10-5")).toBeNull();
    expect(lirePassageTexte(ref, "2:1-286")).toBeNull(); // sourate absente du référentiel
    expect(lirePassageTexte(ref, "67:1-30;drop")).toBeNull();
  });
});
