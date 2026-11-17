import { describe, expect, it } from "vitest";
import { nomSimplifie, rechercherCoran } from "./rechercheCoran";

const sourates = [
  { numero: 1, nomLatin: "Al-Fatiha", nomAr: "الفاتحة", nbVersets: 7 },
  { numero: 19, nomLatin: "Maryam", nomAr: "مريم", nbVersets: 98 },
];
const textes: Record<number, string[]> = {
  1: ["بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ", "ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ"],
  19: ["كٓهيعٓصٓ"],
};
const chercher = (q: string) => rechercherCoran(q, sourates, (s) => textes[s] ?? []);

describe("rechercherCoran", () => {
  it("une référence ouvre le verset", () => {
    expect(chercher("1:2").resultats).toEqual([
      { type: "verset", sourate: 1, verset: 2, nomLatin: "Al-Fatiha", texte: textes[1]![1] },
    ]);
    expect(chercher("1 9").total).toBe(0);
  });
  it("un nom de sourate, en phonétique ou en arabe", () => {
    expect(chercher("maryam").resultats[0]).toMatchObject({ type: "sourate", sourate: 19 });
    expect(chercher("fatiha").resultats[0]).toMatchObject({ type: "sourate", sourate: 1 });
    expect(chercher("مريم").resultats[0]).toMatchObject({ type: "sourate", sourate: 19 });
  });
  it("des mots arabes, avec ou sans voyelles", () => {
    expect(chercher("الحمد لله").resultats).toMatchObject([{ type: "verset", sourate: 1, verset: 2 }]);
    expect(chercher("ٱلرَّحِيمِ").resultats).toMatchObject([{ type: "verset", sourate: 1, verset: 1 }]);
  });
  it("simplifie les noms latins", () => {
    expect(nomSimplifie("Al-Baqara")).toBe("baqara");
    expect(nomSimplifie("Āl ʿImrān")).toBe("imran");
  });
});
