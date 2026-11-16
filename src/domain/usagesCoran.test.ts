import { describe, expect, it } from "vitest";
import { resumerUsagesCoran, type LigneUsageCoran } from "./usagesCoran";

const ligne = (p: Partial<LigneUsageCoran>): LigneUsageCoran => ({
  personneId: "a",
  nom: "Inès",
  role: "eleve",
  jour: "2026-11-16",
  quoi: "lecture",
  sourate: 18,
  nombre: 1,
  dernier: "2026-11-16T10:00:00Z",
  ...p,
});

describe("resumerUsagesCoran", () => {
  it("additionne par personne sur 7 jours et garde les sourates les plus ouvertes", () => {
    const r = resumerUsagesCoran(
      [
        ligne({ nombre: 3 }),
        ligne({ sourate: 67, nombre: 5 }),
        ligne({ quoi: "recitation", sourate: 1, nombre: 2 }),
        ligne({ quoi: "ecoute", jour: "2026-11-01", dernier: "2026-11-01T09:00:00Z" }), // trop ancien
        ligne({ personneId: "b", nom: "Sami", quoi: "ecoute", dernier: "2026-11-16T12:00:00Z" }),
      ],
      "2026-11-16",
    );
    expect(r.personnes.map((p) => p.nom)).toEqual(["Sami", "Inès"]);
    const ines = r.personnes[1]!;
    expect([ines.lectures, ines.ecoutes, ines.recitations]).toEqual([8, 0, 2]);
    expect(ines.sourates).toEqual([67, 18, 1]);
    expect(r.lecteurs7j).toBe(2);
    expect(r.reciteurs7j).toBe(1);
  });

  it("rien à résumer", () => {
    expect(resumerUsagesCoran([], "2026-11-16")).toEqual({ personnes: [], lecteurs7j: 0, reciteurs7j: 0 });
  });
});
