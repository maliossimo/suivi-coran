import { describe, expect, it } from "vitest";
import {
  CODES_TAJWID,
  FAMILLES_TAJWID,
  chiffresArabes,
  decouperMots,
  decouperMotsTajwid,
  etapeSuivante,
  familleTajwid,
  motA,
  pistesLecture,
  type Position,
  fichierVerset,
  texteDesSegments,
  versetSuivant,
  resumeCourtMemoriser,
  versetsHafsDuVerset,
  resumeMemoriser,
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

describe("pistes de récitation", () => {
  it("Hafs : basmala puis un fichier par verset", () => {
    const p = pistesLecture([{ sourate: 112, versets: [1, 2], basmala: true }]);
    expect(p).toEqual([
      { sourate: 1, ayah: 1, cles: ["112:0"] },
      { sourate: 112, ayah: 1, cles: ["112:1"] },
      { sourate: 112, ayah: 2, cles: ["112:2"] },
    ]);
  });

  it("Warsh : fichiers numérotés en Hafs, versets Warsh regroupés", () => {
    const fatiha = [[], [1], [2], [3], [4], [5], [6, 7]];
    const p = pistesLecture([{ sourate: 1, versets: [1, 2, 3, 4, 5, 6, 7], basmala: false }], () => fatiha);
    expect(p[0]).toEqual({ sourate: 1, ayah: 1, cles: [] });
    expect(p.at(-1)).toEqual({ sourate: 1, ayah: 7, cles: ["1:6", "1:7"] });
    expect(p).toHaveLength(7);
  });

  it("ne garde que les fichiers des versets affichés", () => {
    const p = pistesLecture([{ sourate: 1, versets: [6], basmala: false }], () => [
      [],
      [1],
      [2],
      [3],
      [4],
      [5],
      [6, 7],
    ]);
    expect(p).toEqual([{ sourate: 1, ayah: 7, cles: ["1:6"] }]);
  });
});

describe("répétitions", () => {
  const rep = { verset: 2, passage: 2 };
  it("répète chaque verset puis le passage", () => {
    let pos: Position | null = { piste: 0, foisVerset: 0, foisPassage: 0 };
    const vus: number[] = [];
    while (pos) {
      vus.push(pos.piste);
      pos = etapeSuivante(pos, 2, rep);
    }
    expect(vus).toEqual([0, 0, 1, 1, 0, 0, 1, 1]);
  });

  it("passage 0 : sans fin", () => {
    expect(etapeSuivante({ piste: 1, foisVerset: 0, foisPassage: 40 }, 2, { verset: 1, passage: 0 })).toEqual(
      {
        piste: 0,
        foisVerset: 0,
        foisPassage: 41,
      },
    );
  });
});

describe("mot par mot", () => {
  it("compte les mots, pas le numéro du verset", () => {
    const m = decouperMots("بِسۡمِ ٱللَّهِ ١");
    expect(m.filter((x) => x.mot).map((x) => x.mot)).toEqual([1, 2]);
    expect(m.at(-1)).toEqual({ texte: "١", mot: null });
  });

  it("garde les couleurs du tajwid dans chaque mot", () => {
    const m = decouperMotsTajwid(["بِسْمِ ", ["h", "ٱ"], "للَّهِ"]);
    expect(m.filter((x) => x.mot)).toEqual([
      { segments: ["بِسْمِ"], mot: 1 },
      { segments: [["h", "ٱ"], "للَّهِ"], mot: 2 },
    ]);
  });

  it("trouve le mot récité", () => {
    const r = [
      { mot: 1, debut: 0, fin: 400 },
      { mot: 2, debut: 400, fin: 900 },
    ];
    expect(motA(r, 450)).toBe(2);
    expect(motA(r, 1200)).toBeNull();
  });
});

describe("résumé de la mémorisation", () => {
  it("décrit le passage et les répétitions", () => {
    expect(resumeMemoriser({ du: 3, au: 7 }, { verset: 3, passage: 0 })).toBe(
      "Versets 3 à 7 : chaque verset 3 fois, puis le tout en boucle.",
    );
    expect(resumeMemoriser({ du: 5, au: 5 }, { verset: 1, passage: 0 })).toBe("Verset 5 : en boucle.");
    expect(resumeMemoriser({ du: 5, au: 5 }, { verset: 1, passage: 3 })).toBe("Verset 5 : 3 fois.");
    expect(resumeMemoriser({ du: 1, au: 4 }, { verset: 1, passage: 1 })).toBe("Versets 1 à 4, une fois.");
    expect(resumeMemoriser({ du: 1, au: 4 }, { verset: 2, passage: 2 })).toBe(
      "Versets 1 à 4 : chaque verset 2 fois, puis le tout 2 fois.",
    );
  });
  it("a une version courte pour le lecteur", () => {
    expect(resumeCourtMemoriser({ du: 3, au: 7 }, { verset: 3, passage: 0 })).toBe(
      "Versets 3 → 7 · 3× chacun · en boucle",
    );
    expect(resumeCourtMemoriser({ du: 5, au: 5 }, { verset: 1, passage: 1 })).toBe("Verset 5");
  });
});

describe("Warsh vers Hafs", () => {
  // Al-Fatiha : Hafs 1 = basmala (pas de verset Warsh), Hafs 7 = Warsh 6 et 7.
  const fatiha = [[], [1], [2], [3], [4], [5], [6, 7]];
  it("retrouve le verset Hafs d'un verset Warsh", () => {
    expect(versetsHafsDuVerset(fatiha, 1)).toEqual([2]);
    expect(versetsHafsDuVerset(fatiha, 7)).toEqual([7]);
  });
  it("rassemble plusieurs versets Hafs", () => {
    expect(versetsHafsDuVerset([[1], [1], [2]], 1)).toEqual([1, 2]);
  });
});
