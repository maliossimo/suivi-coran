import { describe, expect, it } from "vitest";
import { bilanTajwid, lireAnalyse, premierMotARevoir, type MotAnalyse } from "./tajwid";

const mot = (etat: MotAnalyse["etat"], texte = "كلمة"): MotAnalyse => ({
  mot: texte,
  etat,
  remarques: [],
  madd: [],
});

describe("lireAnalyse", () => {
  it("lit une réponse du moteur", () => {
    const a = lireAnalyse({
      entendu: "…",
      mots: [
        {
          mot: "لَنَآ",
          etat: "a_revoir",
          remarques: [{ gravite: "khafi", texte: "madd munfasil trop court : 2 temps au lieu de 4 temps" }],
          madd: [{ nom: "madd munfasil", temps: 2 }],
        },
      ],
    });
    expect(a?.mots[0]?.remarques[0]?.gravite).toBe("khafi");
    expect(a?.mots[0]?.madd[0]?.temps).toBe(2);
  });

  it("refuse une réponse inattendue", () => {
    expect(lireAnalyse(null)).toBeNull();
    expect(lireAnalyse({ erreur: "x" })).toBeNull();
    expect(lireAnalyse({ entendu: "", mots: [{ mot: "x", etat: "parfait" }] })).toBeNull();
  });

  it("ignore les remarques mal formées", () => {
    const a = lireAnalyse({
      entendu: "",
      mots: [{ mot: "x", etat: "juste", remarques: [{ texte: 3 }], madd: "?" }],
    });
    expect(a?.mots[0]?.remarques).toEqual([]);
    expect(a?.mots[0]?.madd).toEqual([]);
  });
});

describe("bilanTajwid", () => {
  it("compte les mots par état et calcule le score", () => {
    const b = bilanTajwid([mot("juste"), mot("juste"), mot("juste"), mot("a_revoir")]);
    expect(b.score).toBe(75);
    expect(b.compte).toEqual({ juste: 3, a_revoir: 1, erreur: 0, oublie: 0 });
  });

  it("aucun mot : score nul", () => {
    expect(bilanTajwid([]).score).toBe(0);
  });
});

describe("premierMotARevoir", () => {
  it("montre d'abord une faute nette, puis un oubli, puis une remarque", () => {
    expect(premierMotARevoir([mot("a_revoir"), mot("oublie"), mot("erreur")])).toBe(2);
    expect(premierMotARevoir([mot("a_revoir"), mot("oublie")])).toBe(1);
    expect(premierMotARevoir([mot("juste"), mot("a_revoir")])).toBe(1);
    expect(premierMotARevoir([mot("juste")])).toBeNull();
  });
});
