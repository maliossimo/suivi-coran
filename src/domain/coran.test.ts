import { describe, expect, it } from "vitest";
import {
  CODES_TAJWID,
  FAMILLES_TAJWID,
  chiffresArabes,
  familleTajwid,
  fichierVerset,
  texteDesSegments,
  versetSuivant,
} from "./coran";

describe("tajwid", () => {
  it("chaque règle appartient à une seule famille", () => {
    const codes = FAMILLES_TAJWID.flatMap((f) => f.codes);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort()).toEqual([...CODES_TAJWID].sort());
  });

  it("trouve la famille d'une règle", () => {
    expect(familleTajwid("q")).toBe("qalqala");
    expect(familleTajwid("t")).toBe("madd-45");
    expect(familleTajwid("z")).toBeNull();
  });

  it("recompose le texte d'un verset", () => {
    expect(texteDesSegments(["بِسْمِ ", ["h", "ٱ"], "للَّهِ"])).toBe("بِسْمِ ٱللَّهِ");
  });
});

describe("récitation verset par verset", () => {
  it("nomme les fichiers comme EveryAyah", () => {
    expect(fichierVerset(2, 255)).toBe("002255.mp3");
    expect(fichierVerset(114, 6)).toBe("114006.mp3");
  });

  it("enchaîne, répète et s'arrête en fin de sourate", () => {
    expect(versetSuivant(3, 7, false)).toBe(4);
    expect(versetSuivant(3, 7, true)).toBe(3);
    expect(versetSuivant(7, 7, false)).toBeNull();
  });

  it("écrit les numéros en chiffres arabes", () => {
    expect(chiffresArabes(286)).toBe("٢٨٦");
  });
});
