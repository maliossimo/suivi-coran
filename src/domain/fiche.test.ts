import { describe, expect, it } from "vitest";
import {
  cleMois,
  construireFiche,
  decalerMois,
  dernierJour,
  formaterDuree,
  libelleJourCourt,
  libelleMois,
  libelleMoisCourt,
  lireMois,
  moisAutour,
  positionDuMois,
  type Seance,
} from "./fiche";

const seance = (date: string, dureeMin: number): Seance => ({
  id: date,
  date,
  type: "revision",
  dureeMin,
  tajwid: null,
  noteLibre: null,
  corrigee: false,
  passages: [],
});

describe("construireFiche", () => {
  const fiche = construireFiche(
    { annee: 2026, mois: 11 },
    [seance("2026-11-08", 30), seance("2026-11-10", 45), seance("2026-11-29", 20)],
    [{ semaine: 2, description: "Finir Al-Mulk", statut: "en_cours" }],
    "2026-11-10",
  );

  it("découpe novembre en 5 semaines, la 5e de 2 jours", () => {
    expect(fiche.map((s) => s.jours.length)).toEqual([7, 7, 7, 7, 2]);
  });

  it("place chaque séance sur le bon « Jour N »", () => {
    const s2 = fiche[1]!;
    expect(s2.jours[0]?.seance?.dureeMin).toBe(30); // 8 nov. = Jour 1
    expect(s2.jours[2]?.numero).toBe(3);
    expect(s2.jours[2]?.seance?.dureeMin).toBe(45); // 10 nov. = Jour 3
  });

  it("calcule le total et les jours travaillés de la semaine", () => {
    expect(fiche[1]?.totalMinutes).toBe(75);
    expect(fiche[1]?.joursTravailles).toBe(2);
    expect(fiche[0]?.totalMinutes).toBe(0);
  });

  it("repère aujourd'hui et les jours à venir", () => {
    const s2 = fiche[1]!;
    expect(s2.jours[2]?.aujourdhui).toBe(true);
    expect(s2.jours[1]?.futur).toBe(false);
    expect(s2.jours[3]?.futur).toBe(true);
  });

  it("rattache l'objectif à sa semaine", () => {
    expect(fiche[1]?.objectif?.description).toBe("Finir Al-Mulk");
    expect(fiche[0]?.objectif).toBeNull();
  });
});

describe("mois", () => {
  it("lit AAAA-MM et retombe sur le mois courant sinon", () => {
    expect(lireMois("2026-02", "2026-11-10")).toEqual({ annee: 2026, mois: 2 });
    expect(lireMois("2026-13", "2026-11-10")).toEqual({ annee: 2026, mois: 11 });
    expect(lireMois(undefined, "2026-11-10")).toEqual({ annee: 2026, mois: 11 });
  });

  it("passe d'une année à l'autre", () => {
    expect(decalerMois({ annee: 2026, mois: 12 }, 1)).toEqual({ annee: 2027, mois: 1 });
    expect(decalerMois({ annee: 2026, mois: 1 }, -1)).toEqual({ annee: 2025, mois: 12 });
    expect(cleMois({ annee: 2027, mois: 3 })).toBe("2027-03");
    expect(dernierJour({ annee: 2028, mois: 2 })).toBe("2028-02-29");
  });

  it("affiche les libellés en français", () => {
    expect(libelleMois({ annee: 2026, mois: 11 })).toBe("novembre 2026");
    expect(libelleJourCourt("2026-11-10")).toBe("10 nov.");
  });
});

describe("formaterDuree", () => {
  it("formate les durées", () => {
    expect(formaterDuree(0)).toBe("—");
    expect(formaterDuree(25)).toBe("25 min");
    expect(formaterDuree(60)).toBe("1 h");
    expect(formaterDuree(75)).toBe("1 h 15");
    expect(formaterDuree(125)).toBe("2 h 05");
  });
});

describe("positionDuMois", () => {
  it("situe un mois par rapport à aujourd'hui", () => {
    expect(positionDuMois({ annee: 2026, mois: 11 }, "2026-11-10")).toBe("courant");
    expect(positionDuMois({ annee: 2026, mois: 10 }, "2026-11-10")).toBe("passe");
    expect(positionDuMois({ annee: 2026, mois: 12 }, "2026-11-10")).toBe("futur");
    expect(positionDuMois({ annee: 2027, mois: 1 }, "2026-11-10")).toBe("futur");
    expect(positionDuMois({ annee: 2025, mois: 12 }, "2026-11-10")).toBe("passe");
  });
});

describe("moisAutour", () => {
  it("liste les mois autour du mois courant, en passant l'année", () => {
    expect(moisAutour({ annee: 2026, mois: 11 }, 1, 3).map(cleMois)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
  });
});

describe("libelleMoisCourt", () => {
  it("n'affiche l'année que si elle change", () => {
    expect(libelleMoisCourt({ annee: 2026, mois: 12 }, 2026)).toBe("déc.");
    expect(libelleMoisCourt({ annee: 2027, mois: 1 }, 2026)).toBe("janv. 2027");
  });
});
