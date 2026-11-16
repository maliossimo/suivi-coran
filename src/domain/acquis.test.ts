import { describe, expect, it } from "vitest";
import {
  juzCouverts,
  pagesApprises,
  passageDeSourates,
  passagesDesJuz,
  seancesDesAcquis,
  type Acquis,
  type DecoupageMushaf,
} from "./acquis";
import { creerReferentiel, versIntervalle } from "./versets";

// Un petit « Coran » : 3 sourates (7, 10 et 5 versets), 4 pages, 2 juz.
const ref = creerReferentiel([
  { numero: 1, nomAr: "ا", nomLatin: "Une", nbVersets: 7, premierVersetGlobal: 1 },
  { numero: 2, nomAr: "ب", nomLatin: "Deux", nbVersets: 10, premierVersetGlobal: 8 },
  { numero: 3, nomAr: "ت", nomLatin: "Trois", nbVersets: 5, premierVersetGlobal: 18 },
]);
const decoupage: DecoupageMushaf = {
  pages: [
    [[1, 1, 7]],
    [[2, 1, 5]],
    [
      [2, 6, 10],
      [3, 1, 2],
    ],
    [[3, 3, 5]],
  ],
  juz: [1, 3],
};

describe("juz", () => {
  it("chaque juz va de son premier à son dernier verset", () => {
    expect(passagesDesJuz(decoupage)).toEqual([
      { sourateDebut: 1, versetDebut: 1, sourateFin: 2, versetFin: 5 },
      { sourateDebut: 2, versetDebut: 6, sourateFin: 3, versetFin: 5 },
    ]);
  });

  it("un juz est couvert seulement s'il l'est en entier", () => {
    expect(juzCouverts(ref, decoupage, [passageDeSourates(ref, 3, 3)!])).toEqual([]);
    expect(
      juzCouverts(ref, decoupage, [{ sourateDebut: 2, versetDebut: 6, sourateFin: 3, versetFin: 5 }]),
    ).toEqual([2]);
  });

  it("de sourate à sourate, dans les deux sens", () => {
    expect(passageDeSourates(ref, 3, 2)).toEqual({
      sourateDebut: 2,
      versetDebut: 1,
      sourateFin: 3,
      versetFin: 5,
    });
    expect(passageDeSourates(ref, 4, 1)).toBeNull();
  });
});

describe("pagesApprises", () => {
  it("une page commencée compte pour la part de ses versets", () => {
    // Sourate 1 (page 1) et versets 6-10 de la sourate 2 (5 versets sur les 7 de la page 3).
    const intervalles = [
      versIntervalle(ref, passageDeSourates(ref, 1, 1)!),
      versIntervalle(ref, { sourateDebut: 2, versetDebut: 6, sourateFin: 2, versetFin: 10 }),
    ];
    const r = pagesApprises(ref, decoupage, intervalles);
    expect(r.pages).toBeCloseTo(1 + 5 / 7);
    expect(r.juzComplets).toBe(0);
  });

  it("compte les juz complets", () => {
    const tout = [versIntervalle(ref, passageDeSourates(ref, 1, 3)!)];
    expect(pagesApprises(ref, decoupage, tout)).toEqual({ pages: 4, juzComplets: 2 });
    expect(pagesApprises(ref, decoupage, [])).toEqual({ pages: 0, juzComplets: 0 });
  });
});

describe("seancesDesAcquis", () => {
  const acquis = (aEcouter: boolean, ecoute = false): Acquis => ({
    id: "x",
    eleveId: "e",
    passage: { sourateDebut: 3, versetDebut: 1, sourateFin: 3, versetFin: 5 },
    aEcouter,
    ecoute,
    valide: false,
    creeLe: "2026-11-16T10:00:00Z",
  });

  it("donne une séance d'apprentissage et une de révision, sans durée", () => {
    const s = seancesDesAcquis([acquis(false)], (h) => h.slice(0, 10));
    expect(s.map((x) => x.type)).toEqual(["apprentissage", "revision"]);
    expect(s.every((x) => x.dureeMin === 0 && x.date === "2026-11-16")).toBe(true);
  });

  it("à faire écouter : pas vue tant que le Cheikh ne l'a pas écoutée", () => {
    const jour = (h: string) => h.slice(0, 10);
    expect(seancesDesAcquis([acquis(true)], jour)[0]!.passages[0]!.corrige).toBe(false);
    expect(seancesDesAcquis([acquis(true, true)], jour)[0]!.passages[0]!.corrige).toBe(true);
    expect(seancesDesAcquis([acquis(false)], jour)[0]!.passages[0]!.corrige).toBe(true);
  });
});
