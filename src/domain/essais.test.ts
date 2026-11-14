import { describe, expect, it } from "vitest";
import { essaisDuPassage, fautesAGarder, motsDifficiles, type Essai } from "./essais";

const essai = (quand: string, du: number, au: number, fautes: [number, string][], score = 80): Essai => ({
  sourate: 1,
  du,
  au,
  score,
  quand,
  fautes: fautes.map(([verset, mot]) => ({ verset, mot, regle: "ghunnah" })),
});

describe("fautesAGarder", () => {
  it("garde les fautes sûres et les oublis, une fois par mot, pas les hésitations", () => {
    expect(
      fautesAGarder([
        { verset: 1, mot: "a", etat: "erreur", remarques: [{ regle: "ghunnah:x", sure: true }] },
        { verset: 1, mot: "a", etat: "erreur", remarques: [{ regle: "ghunnah", sure: true }] },
        { verset: 1, mot: "b", etat: "a_revoir", remarques: [{ regle: "qalqala", sure: false }] },
        { verset: 2, mot: "c", etat: "oublie" },
        { verset: 2, mot: "d", etat: "juste" },
      ]),
    ).toEqual([
      { verset: 1, mot: "a", regle: "ghunnah" },
      { verset: 2, mot: "c", regle: "oubli" },
    ]);
  });
});

describe("essaisDuPassage", () => {
  it("garde les essais qui recouvrent le passage", () => {
    const e = [essai("2026-11-14", 1, 3, []), essai("2026-11-13", 5, 7, [])];
    expect(essaisDuPassage(e, 1, 2, 4)).toHaveLength(1);
  });
});

describe("motsDifficiles", () => {
  it("les mots ratés au moins deux fois, les plus fréquents d'abord", () => {
    const e = [
      essai("2026-11-14T10:00", 1, 7, [
        [2, "x"],
        [3, "y"],
      ]),
      essai("2026-11-13T10:00", 1, 7, [
        [2, "x"],
        [3, "y"],
      ]),
      essai("2026-11-12T10:00", 1, 7, [
        [2, "x"],
        [4, "z"],
      ]),
    ];
    expect(motsDifficiles(e, 1)).toEqual([
      { verset: 2, mot: "x", fois: 3 },
      { verset: 3, mot: "y", fois: 2 },
    ]);
  });

  it("un mot réussi depuis n'est plus difficile", () => {
    const e = [
      essai("2026-11-15T10:00", 1, 7, []),
      essai("2026-11-14T10:00", 1, 7, [[2, "x"]]),
      essai("2026-11-13T10:00", 1, 7, [[2, "x"]]),
    ];
    expect(motsDifficiles(e, 1)).toEqual([]);
  });
});
