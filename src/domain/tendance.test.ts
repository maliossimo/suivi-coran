import { describe, expect, it } from "vitest";
import type { Seance } from "./fiche";
import { lundi, sensQuinzaine, tendanceEleve } from "./tendance";
import { creerReferentiel } from "./versets";

const ref = creerReferentiel([
  { numero: 67, nomAr: "الملك", nomLatin: "Al-Mulk", nbVersets: 30, premierVersetGlobal: 5242 },
]);
const seance = (date: string, dureeMin: number, type: Seance["type"] = "apprentissage", fin = 5): Seance => ({
  id: date,
  date,
  type,
  dureeMin,
  tajwid: null,
  noteLibre: null,
  corrigee: false,
  passages: [{ sourateDebut: 67, versetDebut: 1, sourateFin: 67, versetFin: fin }],
});

describe("tendanceEleve", () => {
  it("lundi : le lundi de la semaine", () => {
    expect(lundi("2026-11-17")).toBe("2026-11-16"); // mardi
    expect(lundi("2026-11-22")).toBe("2026-11-16"); // dimanche
    expect(lundi("2026-11-16")).toBe("2026-11-16");
  });

  it("8 semaines, la courante à droite ; minutes et versets appris par semaine", () => {
    const t = tendanceEleve(
      ref,
      [seance("2026-11-17", 20), seance("2026-11-16", 10, "revision")],
      "2026-11-17",
    );
    expect(t.semaines).toHaveLength(8);
    expect(t.semaines.at(-1)).toEqual({ debut: "2026-11-16", minutes: 30, versets: 5 });
    expect(t.semaines[0]!.debut).toBe("2026-09-28");
  });

  it("sens : hausse, baisse, stable, aucune", () => {
    const avant = [seance("2026-10-01", 30), seance("2026-10-08", 30)];
    expect(tendanceEleve(ref, [], "2026-11-17").sens).toBe("aucune");
    expect(tendanceEleve(ref, avant, "2026-11-17").sens).toBe("baisse");
    expect(tendanceEleve(ref, [...avant, seance("2026-11-10", 60)], "2026-11-17").sens).toBe("stable");
    expect(tendanceEleve(ref, [...avant, seance("2026-11-10", 120)], "2026-11-17").sens).toBe("hausse");
    expect(tendanceEleve(ref, [seance("2026-11-10", 10)], "2026-11-17").sens).toBe("hausse");
  });
});

describe("sensQuinzaine", () => {
  const semaine = (m: number) => Array<number>(7).fill(m);
  it("compare la dernière semaine à la précédente", () => {
    expect(sensQuinzaine([...semaine(0), ...semaine(0)])).toBe("aucune");
    expect(sensQuinzaine([...semaine(10), ...semaine(20)])).toBe("hausse");
    expect(sensQuinzaine([...semaine(20), ...semaine(10)])).toBe("baisse");
    expect(sensQuinzaine([...semaine(20), ...semaine(21)])).toBe("stable");
    expect(sensQuinzaine([...semaine(0), ...semaine(5)])).toBe("hausse");
  });
});
