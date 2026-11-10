import { describe, expect, it } from "vitest";
import { accueilDuRole, peutOuvrirEspace } from "./roles";

describe("rôles", () => {
  it("envoie chaque rôle vers son espace", () => {
    expect(accueilDuRole("eleve")).toBe("/eleve");
    expect(accueilDuRole("maitre")).toBe("/maitre");
    expect(accueilDuRole("admin")).toBe("/admin");
  });

  it("cloisonne les espaces", () => {
    expect(peutOuvrirEspace("eleve", "maitre")).toBe(false);
    expect(peutOuvrirEspace("maitre", "admin")).toBe(false);
    expect(peutOuvrirEspace("eleve", "admin")).toBe(false);
    expect(peutOuvrirEspace("admin", "maitre")).toBe(true);
    expect(peutOuvrirEspace("admin", "eleve")).toBe(false);
  });
});
