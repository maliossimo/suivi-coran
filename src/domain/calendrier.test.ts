import { describe, expect, it } from "vitest";
import {
  ajouterJours,
  debutDuMois,
  jourDansSemaine,
  nbJoursDuMois,
  positionSurFiche,
  semaineDuJour,
  semainesDuMois,
} from "./calendrier";

describe("semaineDuJour / jourDansSemaine", () => {
  it("découpe le mois comme la fiche papier", () => {
    expect(semaineDuJour(1)).toBe(1);
    expect(semaineDuJour(7)).toBe(1);
    expect(semaineDuJour(8)).toBe(2);
    expect(semaineDuJour(28)).toBe(4);
    expect(semaineDuJour(29)).toBe(5);
    expect(semaineDuJour(31)).toBe(5);
  });

  it("numérote les jours de 1 à 7 dans chaque semaine", () => {
    expect(jourDansSemaine(1)).toBe(1);
    expect(jourDansSemaine(7)).toBe(7);
    expect(jourDansSemaine(10)).toBe(3);
    expect(jourDansSemaine(29)).toBe(1);
    expect(jourDansSemaine(31)).toBe(3);
  });

  it("refuse un jour invalide", () => {
    expect(() => semaineDuJour(0)).toThrow();
    expect(() => semaineDuJour(32)).toThrow();
    expect(() => semaineDuJour(1.5)).toThrow();
  });
});

describe("positionSurFiche", () => {
  it("place le 10 novembre en semaine 2, jour 3", () => {
    expect(positionSurFiche("2026-11-10")).toEqual({ semaine: 2, jour: 3 });
  });

  it("refuse une date impossible", () => {
    expect(() => positionSurFiche("2026-02-30")).toThrow();
    expect(() => positionSurFiche("10/11/2026")).toThrow();
  });
});

describe("semainesDuMois", () => {
  it("novembre 2026 : 4 semaines de 7 jours + semaine 5 de 2 jours", () => {
    const s = semainesDuMois(2026, 11);
    expect(s.map((x) => x.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(s[1]?.jours).toEqual([8, 9, 10, 11, 12, 13, 14]);
    expect(s[4]?.jours).toEqual([29, 30]);
  });

  it("février non bissextile : pas de semaine 5", () => {
    expect(nbJoursDuMois(2026, 2)).toBe(28);
    expect(semainesDuMois(2026, 2)).toHaveLength(4);
  });

  it("février bissextile : semaine 5 d'un seul jour", () => {
    const s = semainesDuMois(2028, 2);
    expect(s).toHaveLength(5);
    expect(s[4]?.jours).toEqual([29]);
  });

  it("couvre chaque jour du mois exactement une fois", () => {
    for (let mois = 1; mois <= 12; mois++) {
      const jours = semainesDuMois(2026, mois).flatMap((s) => s.jours);
      expect(jours).toEqual(Array.from({ length: nbJoursDuMois(2026, mois) }, (_, i) => i + 1));
    }
  });
});

describe("debutDuMois", () => {
  it("renvoie le 1er du mois", () => {
    expect(debutDuMois("2026-11-10")).toBe("2026-11-01");
  });
});

describe("ajouterJours", () => {
  it("passe les mois et les années", () => {
    expect(ajouterJours("2026-11-12", -30)).toBe("2026-10-13");
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
  });
});
