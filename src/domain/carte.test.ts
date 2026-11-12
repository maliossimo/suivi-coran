import { describe, expect, it } from "vitest";
import { carteDuCoran } from "./carte";
import type { Seance } from "./fiche";
import { SOURATES } from "./test/sourates";
import { creerReferentiel } from "./versets";

const ref = creerReferentiel(SOURATES);

const seance = (date: string, type: Seance["type"], passages: Seance["passages"]): Seance => ({
  id: `${date}-${type}`,
  date,
  type,
  dureeMin: 20,
  tajwid: null,
  noteLibre: null,
  corrigee: false,
  passages,
});
const p = (s: number, a: number, b: number) => ({
  sourateDebut: s,
  versetDebut: a,
  sourateFin: s,
  versetFin: b,
});

const seances = [
  seance("2026-08-01", "apprentissage", [p(1, 1, 7)]), // Al-Fatiha connue, plus travaillée depuis août
  seance("2026-10-20", "apprentissage", [p(67, 1, 20)]),
  seance("2026-11-05", "apprentissage", [p(67, 21, 30)]), // Al-Mulk complète grâce à 2 séances
  seance("2026-11-08", "apprentissage", [p(68, 1, 10)]), // Al-Qalam commencée
  seance("2026-11-09", "revision", [p(114, 1, 6)]), // An-Nas révisée (connue d'avant)
  seance("2026-12-01", "apprentissage", [p(68, 11, 52)]), // dans le futur : ignorée
];

describe("carteDuCoran", () => {
  const carte = carteDuCoran(ref, seances, "2026-11-11");
  const etat = (n: number) => carte.cases.find((c) => c.sourate.numero === n)?.etat;

  it("donne l'état de chaque sourate, dans l'ordre du Coran", () => {
    expect(carte.cases).toHaveLength(114);
    expect(carte.cases[0]!.sourate.numero).toBe(1);
    expect(etat(1)).toBe("a_reviser");
    expect(etat(67)).toBe("a_reviser"); // apprise mais jamais révisée
    expect(etat(68)).toBe("en_cours");
    expect(etat(114)).toBe("maitrisee");
  });

  it("calcule la part couverte et ignore les séances futures", () => {
    expect(carte.cases.find((c) => c.sourate.numero === 68)?.pourcentage).toBe(19);
  });

  it("compte les sourates par état", () => {
    expect(carte.compte).toEqual({ maitrisee: 1, a_reviser: 2, en_cours: 1, vide: 110 });
  });

  it("propose les hizb à réviser, du plus urgent au moins urgent", () => {
    expect(carte.hizb.map((h) => [h.numero, h.etat])).toEqual([
      [1, "jamais_revisee"], // Al-Fatiha
      [57, "jamais_revisee"], // Al-Mulk ; Al-Qalam en cours dans le même hizb
    ]);
    expect(carte.hizb[1]!.portions.map((x) => [x.sourate.numero, x.etat])).toEqual([
      [67, "jamais_revisee"],
      [68, "en_cours"],
    ]);
  });

  it("une sourate entièrement révisée il y a plus de 30 jours redevient à réviser", () => {
    const vieille = carteDuCoran(
      ref,
      [...seances, seance("2026-09-01", "revision", [p(67, 1, 30)])],
      "2026-11-11",
    );
    expect(vieille.cases.find((c) => c.sourate.numero === 67)?.etat).toBe("a_reviser");
    const recente = carteDuCoran(
      ref,
      [...seances, seance("2026-11-10", "revision", [p(67, 1, 30)])],
      "2026-11-11",
    );
    expect(recente.cases.find((c) => c.sourate.numero === 67)?.etat).toBe("maitrisee");
  });

  it("une sourate jamais travaillée est vide", () => {
    expect(carteDuCoran(ref, [], "2026-11-11").compte.vide).toBe(114);
  });
});

describe("carteDuCoran : vu par le Cheikh", () => {
  const carte = carteDuCoran(
    ref,
    [
      seance("2026-11-01", "apprentissage", [{ ...p(112, 1, 4), corrige: true }]), // vue en entier
      seance("2026-11-02", "apprentissage", [{ ...p(113, 1, 3), corrige: true }, p(113, 4, 5)]), // en partie
      seance("2026-11-03", "apprentissage", [p(114, 1, 6)]), // pas vue
      seance("2026-11-04", "revision", [{ ...p(114, 1, 6), corrige: true }]), // vue en révision
    ],
    "2026-11-11",
  );
  const case_ = (n: number) => carte.cases.find((c) => c.sourate.numero === n)!;

  it("signale les sourates dont une partie n'est pas encore vue, sans changer leur état", () => {
    expect(case_(112).aFaireVoir).toBe(false);
    expect(case_(113).aFaireVoir).toBe(true);
    expect(case_(113).etat).toBe("a_reviser");
    expect(case_(114).aFaireVoir).toBe(false); // vue lors de la révision
    expect(case_(1).aFaireVoir).toBe(false); // rien de saisi
    expect(carte.aFaireVoir).toBe(1);
  });
});
