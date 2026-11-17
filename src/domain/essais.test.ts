import { describe, expect, it } from "vitest";
import {
  essaisDuPassage,
  fautesAGarder,
  motsARevoir,
  motsDifficiles,
  squeletteMot,
  type Essai,
} from "./essais";

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

describe("motsARevoir", () => {
  const essai = (quand: string, du: number, au: number, fautes: { verset: number; mot: string }[]) => ({
    sourate: 2,
    du,
    au,
    score: 80,
    quand,
    fautes: fautes.map((f) => ({ ...f, regle: "oubli" })),
  });

  it("garde un mot raté tant qu'il n'est pas réussi deux fois depuis", () => {
    const rate = essai("2026-11-01", 1, 5, [{ verset: 3, mot: "يُؤْمِنُونَ" }]);
    expect(motsARevoir([rate]).map((m) => m.mot)).toEqual(["يُؤْمِنُونَ"]);
    const une = essai("2026-11-02", 1, 5, []);
    expect(motsARevoir([une, rate])[0]?.reussites).toBe(1);
    const deux = essai("2026-11-03", 3, 3, []);
    expect(motsARevoir([deux, une, rate])).toEqual([]);
  });

  it("un essai qui ne couvre pas le verset ne compte pas ; un nouvel échec remet le compteur à zéro", () => {
    const rate = essai("2026-11-01", 1, 5, [{ verset: 3, mot: "هُدًى" }]);
    const ailleurs = essai("2026-11-02", 6, 9, []);
    const reussi = essai("2026-11-03", 1, 5, []);
    const encore = essai("2026-11-04", 1, 5, [{ verset: 3, mot: "هُدًى" }]);
    expect(motsARevoir([ailleurs, rate])[0]?.reussites).toBe(0);
    expect(motsARevoir([encore, reussi, ailleurs, rate])).toMatchObject([
      { quand: "2026-11-04", reussites: 0 },
    ]);
  });
});

describe("squeletteMot", () => {
  it("ignore voyelles et formes de l'alif", () => {
    expect(squeletteMot("ٱلْكِتَٰبُ")).toBe(squeletteMot("الكتب"));
  });
});
