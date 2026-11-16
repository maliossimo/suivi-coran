import { describe, expect, it } from "vitest";
import { decouperMots } from "./coran";
import { fragmentsDesLignes, garderFragment, lireLigne } from "./mushaf";

describe("fragmentsDesLignes", () => {
  it("coupe un verset sur deux lignes et garde la rosace avec la fin", () => {
    const lignes = [
      [1, 5, 1],
      [1, 6, 2],
      [1, 7, 4],
    ].map(lireLigne);
    const f = fragmentsDesLignes(lignes, () => 7);
    expect(f[0]).toEqual([
      { sourate: 1, verset: 5, de: 1, a: Infinity, fin: true, deTajwid: 1, aTajwid: Infinity },
      { sourate: 1, verset: 6, de: 1, a: 1, fin: false, deTajwid: 1, aTajwid: 1 },
    ]);
    expect(f[1]).toEqual([
      { sourate: 1, verset: 6, de: 2, a: Infinity, fin: true, deTajwid: 2, aTajwid: Infinity },
      { sourate: 1, verset: 7, de: 1, a: 3, fin: false, deTajwid: 1, aTajwid: 3 },
    ]);
    expect(f[2]).toEqual([
      { sourate: 1, verset: 7, de: 4, a: Infinity, fin: true, deTajwid: 4, aTajwid: Infinity },
    ]);
  });

  it("une ligne qui finit sur un verset entier ne déborde pas sur le suivant ; la sourate s'arrête à son titre", () => {
    const lignes = [
      [112, 1, 1],
      [112, 4, 1, 1],
      [113, 1, 1],
    ].map(lireLigne);
    const f = fragmentsDesLignes(lignes, (s) => (s === 112 ? 4 : 5));
    expect(f[0]!.map((x) => x.verset)).toEqual([1, 2, 3]);
    expect(f[1]!.map((x) => x.verset)).toEqual([4]);
    expect(lignes[1]!.centree).toBe(true);
    expect(f[2]!.map((x) => x.verset)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("garderFragment", () => {
  const verset = "۞ إِنَّ ٱللَّهَ لَا يَسۡتَحۡيِۦٓ ٢٦";
  const morceaux = decouperMots(verset);
  const texte = (de: number, a: number, fin: boolean) =>
    garderFragment(morceaux, de, a, fin, (m) => /^\s+$/.test(m.texte))
      .map((m) => m.texte)
      .join("");

  it("début du verset : le signe ۞ et les premiers mots, sans espace au bout", () => {
    expect(texte(1, 2, false)).toBe("۞ إِنَّ ٱللَّهَ");
  });
  it("fin du verset : les derniers mots et la rosace", () => {
    expect(texte(3, Infinity, true)).toBe("لَا يَسۡتَحۡيِۦٓ ٢٦");
  });
  it("la rosace seule en tête de ligne", () => {
    expect(texte(5, Infinity, true)).toBe("٢٦");
  });
});
