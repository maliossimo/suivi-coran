import { describe, expect, it } from "vitest";
import { bornesHizb, hizbARevoir, hizbDuVerset, positionGlobale } from "./hizb";
import {
  DEBUTS_HIZB_LECTURE,
  lireLecture,
  NB_VERSETS_WARSH,
  souratesDeLecture,
  TOTAL_VERSETS_LECTURE,
} from "./lectures";
import { SOURATES } from "./test/sourates";
import { creerReferentiel, indexGlobal, pourcentageDuCoran } from "./versets";

const refWarsh = creerReferentiel(souratesDeLecture(SOURATES, "warsh"));
const ouWarsh = (g: number) => {
  const p = positionGlobale(refWarsh, g);
  return `${p.sourate.numero}:${p.verset}`;
};

describe("lectures Hafs et Warsh", () => {
  it("compte 6236 versets en Hafs et 6214 en Warsh", () => {
    expect(SOURATES.reduce((t, s) => t + s.nbVersets, 0)).toBe(TOTAL_VERSETS_LECTURE.hafs);
    expect(NB_VERSETS_WARSH).toHaveLength(114);
    expect(NB_VERSETS_WARSH.reduce((t, n) => t + n, 0)).toBe(TOTAL_VERSETS_LECTURE.warsh);
  });

  it("donne la numérotation Warsh des sourates", () => {
    const warsh = souratesDeLecture(SOURATES, "warsh");
    const s = (n: number) => warsh.find((x) => x.numero === n)!;
    expect(s(1).nbVersets).toBe(7);
    expect(s(2).nbVersets).toBe(285);
    expect(s(5).nbVersets).toBe(122);
    expect(s(2).premierVersetGlobal).toBe(8);
    expect(s(114).premierVersetGlobal + s(114).nbVersets - 1).toBe(6214);
    expect(s(2).nomLatin).toBe(SOURATES[1]!.nomLatin); // noms inchangés
  });

  it("découpe les 60 hizb de chaque lecture sans trou", () => {
    for (const lecture of ["hafs", "warsh"] as const) {
      const debuts = DEBUTS_HIZB_LECTURE[lecture];
      expect(debuts).toHaveLength(60);
      expect(debuts[0]).toBe(1);
      for (let n = 1; n < 60; n += 1) expect(debuts[n]! > debuts[n - 1]!).toBe(true);
      expect(bornesHizb(60, lecture)[1]).toBe(TOTAL_VERSETS_LECTURE[lecture]);
    }
  });

  it("place les hizb Warsh selon les marques du mushaf Warsh", () => {
    expect(ouWarsh(bornesHizb(2, "warsh")[0])).toBe("2:75"); // « وإذا لقوا الذين آمنوا »
    expect(ouWarsh(bornesHizb(3, "warsh")[0])).toBe("2:141"); // juz 2
    expect(ouWarsh(bornesHizb(21, "warsh")[0])).toBe("9:94"); // juz 11, « إنما السبيل »
    expect(ouWarsh(bornesHizb(57, "warsh")[0])).toBe("67:1"); // juz 29, Al-Mulk
    expect(ouWarsh(bornesHizb(60, "warsh")[1])).toBe("114:6");
    expect(hizbDuVerset(indexGlobal(refWarsh, 2, 74), "warsh")).toBe(1);
    expect(hizbDuVerset(indexGlobal(refWarsh, 2, 75), "warsh")).toBe(2);
  });

  it("calcule le pourcentage du Coran dans la bonne lecture", () => {
    expect(pourcentageDuCoran(6214, "warsh")).toBe(100);
    expect(pourcentageDuCoran(6214)).toBe(99.6);
  });

  it("propose les hizb à réviser en numérotation Warsh", () => {
    const seance = {
      id: "s",
      date: "2026-11-01",
      type: "apprentissage" as const,
      dureeMin: 10,
      tajwid: null,
      noteLibre: null,
      corrigee: false,
      passages: [{ sourateDebut: 2, versetDebut: 1, sourateFin: 2, versetFin: 285 }],
    };
    const hizb = hizbARevoir(refWarsh, [seance], "2026-11-12", 30, "warsh");
    expect(hizb.map((h) => h.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(hizb.at(-1)!.portions[0]!.versetFin).toBe(285); // fin d’Al-Baqara en Warsh
  });

  it("lit une valeur inconnue comme Hafs", () => {
    expect(lireLecture("warsh")).toBe("warsh");
    expect(lireLecture(null)).toBe("hafs");
    expect(lireLecture("autre")).toBe("hafs");
  });
});
