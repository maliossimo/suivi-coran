import { describe, expect, it } from "vitest";
import type { Seance } from "./fiche";
import { bornesHizb, DEBUTS_HIZB, hizbARevoir, hizbDuVerset, positionGlobale, TOTAL_VERSETS } from "./hizb";
import { SOURATES } from "./test/sourates";
import { creerReferentiel, indexGlobal } from "./versets";

const ref = creerReferentiel(SOURATES);
const ou = (g: number) => {
  const p = positionGlobale(ref, g);
  return `${p.sourate.numero}:${p.verset}`;
};

const seance = (date: string, type: Seance["type"], passages: Seance["passages"]): Seance => ({
  id: `${date}-${type}-${JSON.stringify(passages)}`,
  date,
  type,
  dureeMin: 20,
  tajwid: null,
  noteLibre: null,
  corrigee: false,
  passages,
});
const p = (s: number, a: number, b: number, sf = s) => ({
  sourateDebut: s,
  versetDebut: a,
  sourateFin: sf,
  versetFin: b,
});

describe("découpage en hizb", () => {
  it("compte 60 hizb qui couvrent tout le Coran, sans trou", () => {
    expect(DEBUTS_HIZB).toHaveLength(60);
    expect(bornesHizb(1)[0]).toBe(1);
    expect(bornesHizb(60)[1]).toBe(TOTAL_VERSETS);
    for (let n = 1; n < 60; n += 1) expect(bornesHizb(n)[1] + 1).toBe(bornesHizb(n + 1)[0]);
  });

  it("place les hizb aux limites connues (lecture Hafs)", () => {
    expect(ou(bornesHizb(2)[0])).toBe("2:75");
    expect(ou(bornesHizb(3)[0])).toBe("2:142"); // début du juz 2
    expect(ou(bornesHizb(5)[0])).toBe("2:253"); // début du juz 3
    expect(ou(bornesHizb(26)[0])).toBe("13:19");
    expect(ou(bornesHizb(41)[0])).toBe("29:46"); // juz 21
    expect(ou(bornesHizb(57)[0])).toBe("67:1"); // juz 29, Al-Mulk
    expect(ou(bornesHizb(59)[0])).toBe("78:1"); // juz 30, An-Naba
    expect(ou(bornesHizb(60)[0])).toBe("87:1"); // Al-A'la
    expect(ou(bornesHizb(60)[1])).toBe("114:6");
  });

  it("retrouve le hizb d'un verset", () => {
    expect(hizbDuVerset(indexGlobal(ref, 1, 1))).toBe(1);
    expect(hizbDuVerset(indexGlobal(ref, 2, 74))).toBe(1);
    expect(hizbDuVerset(indexGlobal(ref, 2, 75))).toBe(2);
    expect(hizbDuVerset(indexGlobal(ref, 114, 6))).toBe(60);
  });

  it("refuse un hizb inexistant", () => {
    expect(() => bornesHizb(0)).toThrow();
    expect(() => bornesHizb(61)).toThrow();
  });
});

describe("hizbARevoir", () => {
  const aujourdhui = "2026-11-11";

  it("ne propose rien sans séance", () => {
    expect(hizbARevoir(ref, [], aujourdhui)).toEqual([]);
  });

  it("propose une sourate apprise jamais révisée, découpée par hizb", () => {
    const liste = hizbARevoir(ref, [seance("2026-11-01", "apprentissage", [p(2, 1, 286)])], aujourdhui);
    // Al-Baqara couvre les hizb 1 (à partir du verset 1) à 5.
    expect(liste.map((h) => h.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(liste.every((h) => h.etat === "jamais_revisee")).toBe(true);
    const h3 = liste.find((h) => h.numero === 3)!;
    expect(h3.portions).toHaveLength(1);
    expect(h3.portions[0]).toMatchObject({ versetDebut: 142, versetFin: 202, connus: 61, jamaisRevises: 61 });
    // Le hizb 1 ne contient qu'Al-Baqara : Al-Fatiha n'est pas connue.
    expect(liste[0]!.portions.map((x) => x.sourate.numero)).toEqual([2]);
  });

  it("n'affiche plus ce qui a été révisé récemment", () => {
    const liste = hizbARevoir(
      ref,
      [
        seance("2026-11-01", "apprentissage", [p(2, 1, 286)]),
        seance("2026-11-11", "revision", [p(2, 1, 286)]),
      ],
      aujourdhui,
    );
    expect(liste).toEqual([]);
  });

  it("ne garde que la partie non révisée d'une sourate", () => {
    const liste = hizbARevoir(
      ref,
      [
        seance("2026-11-01", "apprentissage", [p(2, 1, 286)]),
        seance("2026-11-10", "revision", [p(2, 1, 141)]),
      ],
      aujourdhui,
    );
    expect(liste.map((h) => h.numero)).toEqual([3, 4, 5]);
  });

  it("fait revenir une partie révisée il y a plus de 30 jours, la plus ancienne d'abord", () => {
    const liste = hizbARevoir(
      ref,
      [
        seance("2026-08-01", "apprentissage", [p(67, 1, 30), p(68, 1, 52)]),
        seance("2026-09-01", "revision", [p(68, 1, 52)]),
        seance("2026-09-20", "revision", [p(67, 1, 30)]),
        seance("2026-11-05", "revision", [p(67, 1, 10)]),
      ],
      aujourdhui,
    );
    expect(liste.map((h) => [h.numero, h.etat, h.plusAncienneRevision])).toEqual([
      [57, "a_revoir", "2026-09-01"],
    ]);
    const portions = liste[0]!.portions;
    expect(portions.map((x) => [x.sourate.numero, x.plusAncienneRevision, x.derniereRevision])).toEqual([
      [67, "2026-09-20", "2026-11-05"],
      [68, "2026-09-01", "2026-09-01"],
    ]);
  });

  it("garde les sourates en cours d'apprentissage, après les autres", () => {
    const liste = hizbARevoir(
      ref,
      [
        seance("2026-11-01", "apprentissage", [p(9, 10, 12)]),
        seance("2026-11-02", "apprentissage", [p(14, 1, 52)]),
      ],
      aujourdhui,
    );
    expect(liste.map((h) => [h.numero, h.etat])).toEqual([
      [26, "jamais_revisee"], // Ibrahim commence dans le hizb 26
      [19, "en_cours"], // At-Tawba 10 → 12 (hizb 19 : 8:41 → 9:33)
    ]);
    expect(liste[1]!.portions[0]).toMatchObject({ versetDebut: 10, versetFin: 12, connus: 3 });
  });

  it("prend l'état le plus urgent d'un hizb à cheval sur plusieurs sourates", () => {
    const liste = hizbARevoir(
      ref,
      [
        seance("2026-11-01", "apprentissage", [p(87, 1, 19), p(88, 1, 10)]),
        seance("2026-11-03", "revision", [p(87, 1, 19)]),
      ],
      aujourdhui,
    );
    expect(liste).toHaveLength(1);
    expect(liste[0]!.etat).toBe("en_cours");
    expect(liste[0]!.portions.map((x) => [x.sourate.numero, x.etat])).toEqual([[88, "en_cours"]]);
  });

  it("ignore les séances futures et les passages incohérents", () => {
    const liste = hizbARevoir(
      ref,
      [
        seance("2026-12-01", "apprentissage", [p(1, 1, 7)]),
        seance("2026-11-01", "apprentissage", [p(1, 7, 1)]),
      ],
      aujourdhui,
    );
    expect(liste).toEqual([]);
  });
});
