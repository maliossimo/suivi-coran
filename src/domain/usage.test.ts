import { describe, expect, it } from "vitest";
import { calculerStatsUsage, lundiDe, type SeanceUsage, type UtilisateurStat } from "./usage";

const utilisateurs: UtilisateurStat[] = [
  { id: "m1", role: "maitre", actif: true, etablissementId: "A" },
  { id: "m2", role: "maitre", actif: false, etablissementId: "B" },
  { id: "e1", role: "eleve", actif: true, etablissementId: "A" },
  { id: "e2", role: "eleve", actif: true, etablissementId: "A" },
  { id: "e3", role: "eleve", actif: true, etablissementId: "B" },
  { id: "e4", role: "eleve", actif: false, etablissementId: "B" },
  { id: "ad", role: "admin", actif: true, etablissementId: null },
];
const etablissements = [
  { id: "A", nom: "École A" },
  { id: "B", nom: "École B" },
];
const s = (eleveId: string, date: string, dureeMin = 20): SeanceUsage => ({ eleveId, date, dureeMin });
const seances = [
  s("e1", "2026-11-11", 30), // mercredi (aujourd'hui)
  s("e1", "2026-11-10", 15),
  s("e2", "2026-11-05", 10), // il y a 6 jours : dans les 7 jours
  s("e3", "2026-11-04"), // il y a 7 jours : hors des 7 jours
  s("e4", "2026-11-09"), // élève archivé : compté dans les séances, pas dans les actifs
  s("e3", "2026-10-01"), // hors des 30 jours
  s("e1", "2026-11-20"), // futur : ignorée
];

describe("lundiDe", () => {
  it("donne le lundi de la semaine", () => {
    expect(lundiDe("2026-11-11")).toBe("2026-11-09");
    expect(lundiDe("2026-11-09")).toBe("2026-11-09");
    expect(lundiDe("2026-11-15")).toBe("2026-11-09");
  });
});

describe("calculerStatsUsage", () => {
  const stats = calculerStatsUsage(utilisateurs, etablissements, seances, "2026-11-11");

  it("compte les comptes par rôle", () => {
    expect(stats.eleves).toEqual({ actifs: 3, archives: 1 });
    expect(stats.maitres).toEqual({ actifs: 1, archives: 1 });
  });

  it("mesure l'activité des 7 et 30 derniers jours", () => {
    expect(stats.seances7j).toBe(4);
    expect(stats.minutes7j).toBe(30 + 15 + 10 + 20);
    expect(stats.elevesActifs7j).toBe(2);
    expect(stats.tauxActivite7j).toBe(67);
    expect(stats.seances30j).toBe(5);
  });

  it("résume les 12 dernières semaines, la plus récente en dernier", () => {
    expect(stats.semaines).toHaveLength(12);
    expect(stats.semaines.at(-1)).toEqual({ debut: "2026-11-09", seances: 3, eleves: 2 });
    expect(stats.semaines.at(-2)).toEqual({ debut: "2026-11-02", seances: 2, eleves: 2 });
  });

  it("détaille par établissement", () => {
    expect(stats.parEtablissement).toEqual([
      { id: "A", nom: "École A", maitres: 1, eleves: 2, elevesActifs7j: 2, seances30j: 3 },
      { id: "B", nom: "École B", maitres: 0, eleves: 1, elevesActifs7j: 0, seances30j: 2 },
    ]);
  });
});
