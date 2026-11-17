import { describe, expect, it } from "vitest";
import { debutDuVerset, enchainementsConnus, finDuVerset, tirerEnchainement } from "./enchainements";
import { creerReferentiel } from "./versets";

const ref = creerReferentiel([
  { numero: 1, nomAr: "الفاتحة", nomLatin: "Al-Fatiha", nbVersets: 7, premierVersetGlobal: 1 },
  { numero: 112, nomAr: "الإخلاص", nomLatin: "Al-Ikhlas", nbVersets: 4, premierVersetGlobal: 8 },
]);

describe("enchainementsConnus", () => {
  it("ne pose que des enchaînements dont les deux versets sont connus", () => {
    const p = enchainementsConnus(ref, [
      { sourateDebut: 1, versetDebut: 1, sourateFin: 1, versetFin: 3 },
      { sourateDebut: 112, versetDebut: 1, sourateFin: 112, versetFin: 4 },
    ]);
    expect(p).toEqual([
      { sourate: 1, depuis: [1, 2] },
      { sourate: 112, depuis: [1, 2, 3] },
    ]);
  });
  it("rien de connu : rien à tester", () => {
    expect(enchainementsConnus(ref, [])).toEqual([]);
  });
});

describe("tirerEnchainement", () => {
  const possibles = [{ sourate: 112, depuis: [1, 2] }];
  it("tire au hasard, sans reposer le précédent", () => {
    expect(tirerEnchainement(possibles, () => 0)).toEqual({ sourate: 112, verset: 1 });
    expect(tirerEnchainement(possibles, () => 0, { sourate: 112, verset: 1 })).toEqual({
      sourate: 112,
      verset: 2,
    });
    expect(tirerEnchainement([], () => 0)).toBeNull();
  });
});

describe("fin et début d'un verset", () => {
  const verset = "قُلۡ هُوَ ٱللَّهُ أَحَدٌ ١";
  it("garde les derniers ou les premiers mots, sans la rosace", () => {
    expect(finDuVerset(verset, 2)).toBe("… ٱللَّهُ أَحَدٌ");
    expect(debutDuVerset(verset, 2)).toBe("قُلۡ هُوَ …");
    expect(finDuVerset(verset, 9)).toBe("قُلۡ هُوَ ٱللَّهُ أَحَدٌ");
  });
});
