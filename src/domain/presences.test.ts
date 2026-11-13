import { describe, expect, it } from "vitest";
import {
  absencesDAffilee,
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
  it("calcule le taux sans compter les excuses", () => {
    expect(tauxPresence(["present", "retard", "absent", "excuse"])).toBe(67);
    expect(tauxPresence(["excuse"])).toBeNull();
  });

  it("compte les absences d'affilée", () => {
    expect(absencesDAffilee(["absent", "present", "absent", "excuse", "absent"])).toBe(2);
    expect(absencesDAffilee(["absent", "present"])).toBe(0);
  });

  it("résume un appel", () => {
    expect(libelleResume(resumeAppel(["present", "present", "absent", "retard"]))).toBe(
      "2 présents · 1 absent · 1 en retard",
    );
  });
});
