import { describe, expect, it } from "vitest";
import {
  appliquerCorrections,
  assemblerPassage,
  estIncertain,
  guiderResultat,
  bilanPassage,
  bilanTajwid,
  lireAnalyse,
  premierMotARevoir,
  type MotAnalyse,
} from "./tajwid";

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
    expect(a?.mots[0]?.remarques[0]?.sure).toBe(true);
    expect(a?.mots[0]?.madd[0]?.temps).toBe(2);
  });

  it("lit l'hésitation du moteur", () => {
    const a = lireAnalyse({
      entendu: "",
      mots: [{ mot: "x", etat: "a_revoir", remarques: [{ gravite: "khafi", texte: "t", sure: false }] }],
    });
    expect(a?.mots[0]?.remarques[0]?.sure).toBe(false);
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

describe("assemblerPassage", () => {
  const passage: [number, number, string][] = [
    [2, 0, "a"],
    [2, 1, "b"],
    [3, 0, "c"],
    [3, 1, "d"],
    [4, 0, "e"],
  ];
  const vu = (indice: number, etat: MotAnalyse["etat"] = "juste"): MotAnalyse => ({
    mot: `m${indice}`,
    etat,
    remarques: [],
    madd: [],
    indice,
  });

  it("place chaque résultat sur son mot, le plus récent l'emporte", () => {
    const mots = assemblerPassage(passage, [
      [vu(0), vu(1, "erreur")],
      [vu(1), vu(2)],
    ]);
    expect(mots.slice(0, 3).map((m) => [m.etat, m.morceau])).toEqual([
      ["juste", 0],
      ["juste", 1],
      ["juste", 1],
    ]);
  });

  it("oublié avant le dernier mot récité, non récité après", () => {
    const mots = assemblerPassage(passage, [[vu(0), vu(2)]]);
    expect(mots.map((m) => m.etat)).toEqual(["juste", "oublie", "juste", "non_recite", "non_recite"]);
    expect(bilanPassage(mots)).toMatchObject({ total: 3, score: 67 });
  });
});

describe("appliquerCorrections", () => {
  const mot = (remarques: MotAnalyse["remarques"], etat: MotAnalyse["etat"] = "erreur"): MotAnalyse => ({
    mot: "لَنَآ",
    verset: 109,
    etat,
    remarques,
    madd: [],
  });

  it("retire la remarque apprise et recalcule l'état", () => {
    const [m] = appliquerCorrections(
      [
        mot([
          { gravite: "jali", regle: "MonfaselMaddRule:x", texte: "a", sure: true },
          { gravite: "khafi", regle: "ghunnah", texte: "b", sure: true },
        ]),
      ],
      [{ verset: 109, mot: "لَنَآ", regle: "MonfaselMaddRule" }],
    );
    expect(m?.remarques.map((r) => r.texte)).toEqual(["b"]);
    expect(m?.etat).toBe("a_revoir");
  });

  it("un mot sans plus aucune remarque devient juste", () => {
    const [m] = appliquerCorrections(
      [mot([{ gravite: "khafi", regle: "ghunnah", texte: "b", sure: true }], "a_revoir")],
      [{ verset: 109, mot: "لَنَآ", regle: "ghunnah" }],
    );
    expect(m?.etat).toBe("juste");
  });

  it("ne touche ni un autre verset ni un mot oublié", () => {
    const r = [{ gravite: "khafi" as const, regle: "ghunnah", texte: "b", sure: true }];
    const c = [{ verset: 110, mot: "لَنَآ", regle: "ghunnah" }];
    expect(appliquerCorrections([mot(r, "a_revoir")], c)[0]?.etat).toBe("a_revoir");
    expect(
      appliquerCorrections([mot([], "oublie")], [{ verset: 109, mot: "لَنَآ", regle: "word" }])[0]?.etat,
    ).toBe("oublie");
  });
});

describe("guiderResultat", () => {
  const r = (sure: boolean) => ({ gravite: "khafi" as const, regle: "ghunnah", texte: "t", sure });
  const m = (indice: number, verset: number, etat: MotAnalyse["etat"], sure = true): MotAnalyse => ({
    mot: `m${indice}`,
    verset,
    indice,
    etat,
    remarques: etat === "juste" || etat === "oublie" ? [] : [r(sure)],
    madd: [],
  });

  it("sépare les fautes sûres des hésitations et choisit le verset à reprendre", () => {
    const mots = assemblerPassage(
      [
        [1, 0, "m0"],
        [1, 1, "m1"],
        [2, 0, "m2"],
        [2, 1, "m3"],
        [2, 2, "m4"],
      ],
      [
        [
          m(0, 1, "a_revoir", false),
          m(1, 1, "juste"),
          m(2, 2, "erreur"),
          m(3, 2, "oublie"),
          m(4, 2, "juste"),
        ],
      ],
    );
    expect(guiderResultat(mots)).toEqual({ aReprendre: [2, 3], aVerifier: [0], verset: 2 });
  });

  it("rien à reprendre", () => {
    const mots = assemblerPassage([[1, 0, "m0"]], [[m(0, 1, "juste")]]);
    expect(guiderResultat(mots)).toEqual({ aReprendre: [], aVerifier: [], verset: null });
  });

  it("un mot oublié n'est jamais une hésitation", () => {
    expect(estIncertain(m(0, 1, "oublie"))).toBe(false);
    expect(estIncertain(m(0, 1, "a_revoir", false))).toBe(true);
  });
});
