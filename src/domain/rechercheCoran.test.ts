import { describe, expect, it } from "vitest";
import { lireReference, rechercher } from "./rechercheCoran";

const sourates = [
  { numero: 1, nomLatin: "Al-Fatiha", nomAr: "الفاتحة", nbVersets: 7 },
  { numero: 18, nomLatin: "Al-Kahf", nomAr: "الكهف", nbVersets: 110 },
  { numero: 19, nomLatin: "Maryam", nomAr: "مريم", nbVersets: 98 },
];
const textes: Record<number, string[]> = {
  1: [
    "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ ١",
    "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ ٢",
    "ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ ٣",
  ],
  18: [],
  19: ["كٓهيعٓصٓ ١"],
};
const chercher = (q: string) => rechercher(q, sourates, (s) => textes[s] ?? []);

describe("rechercher", () => {
  it("une référence ouvre le verset, ou la sourate si le verset n'existe pas", () => {
    expect(chercher("1:2")).toMatchObject([{ type: "verset", sourate: 1, verset: 2 }]);
    expect(chercher("19")).toEqual([{ type: "sourate", sourate: 19 }]);
    expect(chercher("1:99")).toEqual([{ type: "sourate", sourate: 1 }]);
    expect(chercher("200:1")).toEqual([]);
  });

  it("un nom de sourate, en latin (sans « al- » ni accents) ou en arabe", () => {
    expect(chercher("kahf")).toEqual([{ type: "sourate", sourate: 18 }]);
    expect(chercher("Al Kahf")).toEqual([{ type: "sourate", sourate: 18 }]);
    expect(chercher("مريم")).toEqual([{ type: "sourate", sourate: 19 }]);
  });

  it("des mots arabes, avec ou sans voyelles : les versets et les mots trouvés", () => {
    expect(chercher("الرحيم")).toMatchObject([
      { type: "verset", sourate: 1, verset: 1, mots: [4] },
      { type: "verset", sourate: 1, verset: 3, mots: [2] },
    ]);
    expect(chercher("رَبِّ العالمين")).toMatchObject([
      { type: "verset", sourate: 1, verset: 2, mots: [3, 4] },
    ]);
  });
});

describe("outils", () => {
  it("lit les références", () => {
    expect(lireReference("2 255")).toEqual({ sourate: 2, verset: 255 });
    expect(lireReference("2:")).toBeNull();
  });
});
