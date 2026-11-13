import { describe, expect, it } from "vitest";
import {
  absencesDAffilee,
  avecVue,
  capacites,
  debutSemaine,
  joursDeCoursEntre,
  joursEntre,
  lirePeriode,
  periodesRapides,
  aCoursLe,
  jourIso,
  joursDeCoursDuMois,
  libelleJours,
  libelleResume,
  prochainCours,
  resumeAppel,
  tauxPresence,
} from "./presences";

describe("jours de cours", () => {
  it("donne le jour de la semaine", () => {
    expect(jourIso("2026-11-16")).toBe(1); // lundi
    expect(jourIso("2026-11-15")).toBe(7); // dimanche
  });

  it("écrit les jours dans l'ordre", () => {
    expect(libelleJours([4, 1, 2])).toBe("Lun · Mar · Jeu");
  });

  it("trouve le prochain cours", () => {
    expect(prochainCours([6, 7], "2026-11-16")).toBe("2026-11-21");
    expect(prochainCours([1], "2026-11-16")).toBe("2026-11-16");
    expect(prochainCours([], "2026-11-16")).toBeNull();
    expect(aCoursLe([1, 2, 4], "2026-11-19")).toBe(true);
  });

  it("liste les cours du mois jusqu'à aujourd'hui", () => {
    expect(joursDeCoursDuMois([6, 7], 2026, 11, "2026-11-10")).toEqual([
      "2026-11-01",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(joursDeCoursDuMois([1], 2026, 11)).toHaveLength(5);
  });
});

describe("présences", () => {
  it("calcule le taux de présence", () => {
    expect(tauxPresence(["present", "present", "absent"])).toBe(67);
    expect(tauxPresence([])).toBeNull();
  });

  it("compte les absences d'affilée", () => {
    expect(absencesDAffilee(["absent", "present", "absent", "absent"])).toBe(2);
    expect(absencesDAffilee(["absent", "present"])).toBe(0);
  });

  it("résume un appel", () => {
    expect(libelleResume(resumeAppel(["present", "present", "absent"]))).toBe("2 présents · 1 absent");
    expect(libelleResume(resumeAppel(["present"]))).toBe("1 présent");
  });

  it("liste les jours d'une période", () => {
    expect(joursEntre("2026-11-29", "2026-12-02")).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
  });
});

describe("qui fait quoi", () => {
  it("le responsable organise mais ne fait pas l'appel", () => {
    expect(capacites("responsable")).toEqual({ appel: false, organiser: true, eleves: true, rapport: true });
  });
  it("le Cheikh fait l'appel et gère ses élèves, sans créer de classe", () => {
    expect(capacites("cheikh")).toEqual({ appel: true, organiser: false, eleves: true, rapport: false });
  });
});

describe("rapport", () => {
  it("trouve le lundi de la semaine", () => {
    expect(debutSemaine("2026-11-13")).toBe("2026-11-09");
    expect(debutSemaine("2026-11-09")).toBe("2026-11-09");
    expect(debutSemaine("2026-11-15")).toBe("2026-11-09");
  });
  it("propose des périodes rapides", () => {
    const p = Object.fromEntries(periodesRapides("2026-01-14").map((x) => [x.cle, x.periode]));
    expect(p.semaine).toEqual({ du: "2026-01-12", au: "2026-01-18" });
    expect(p["semaine-1"]).toEqual({ du: "2026-01-05", au: "2026-01-11" });
    expect(p.mois).toEqual({ du: "2026-01-01", au: "2026-01-31" });
    expect(p["mois-1"]).toEqual({ du: "2025-12-01", au: "2025-12-31" });
  });
  it("refuse une période invalide", () => {
    const mois = { du: "2026-11-01", au: "2026-11-30" };
    expect(lirePeriode("2026-11-10", "2026-11-03", "2026-11-13")).toEqual(mois);
    expect(lirePeriode("2026-02-30", "2026-03-03", "2026-11-13")).toEqual(mois);
    expect(lirePeriode("2024-01-01", "2026-01-01", "2026-11-13")).toEqual(mois);
    expect(lirePeriode("2026-11-03", "2026-11-10", "2026-11-13")).toEqual({
      du: "2026-11-03",
      au: "2026-11-10",
    });
  });
  it("liste les jours de cours d'une période", () => {
    // Lundi, mardi, jeudi
    expect(joursDeCoursEntre([1, 2, 4], "2026-11-09", "2026-11-15")).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-12",
    ]);
  });
  it("garde l'aperçu dans les liens", () => {
    expect(avecVue("/presences", null)).toBe("/presences");
    expect(avecVue("/presences/x?mois=2026-11", "responsable")).toBe(
      "/presences/x?mois=2026-11&vue=responsable",
    );
  });
});
