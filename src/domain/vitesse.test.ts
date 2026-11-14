import { describe, expect, it } from "vitest";
import { centile75, note, pageGenerique, vitesseParPage } from "./vitesse";

describe("vitesse réelle", () => {
  it("rend les adresses génériques", () => {
    expect(pageGenerique("/maitre/eleves/0b1c2d3e-0000-4000-8000-000000000001/fiche?mois=2026-11")).toBe(
      "/maitre/eleves/[id]/fiche",
    );
    expect(pageGenerique("/presences/12/appel")).toBe("/presences/[n]/appel");
  });

  it("calcule le 75e centile", () => {
    expect(centile75([1, 2, 3, 4])).toBe(3);
    expect(centile75([])).toBeNull();
  });

  it("note selon les seuils de web.dev", () => {
    expect(note("LCP", 2000)).toBe("bon");
    expect(note("LCP", 3000)).toBe("moyen");
    expect(note("INP", 900)).toBe("lent");
  });

  it("classe les pages, les plus lentes d'abord", () => {
    const l = vitesseParPage([
      { page: "/a", metrique: "LCP", valeur: 1000 },
      { page: "/b", metrique: "LCP", valeur: 5000 },
      { page: "/b", metrique: "INP", valeur: 300 },
    ]);
    expect(l.map((x) => x.page)).toEqual(["/b", "/a"]);
    expect(l[0]).toEqual({ page: "/b", visites: 1, lcp: 5000, inp: 300 });
  });
});
