import { describe, expect, it } from "vitest";
import { initialesDe, NB_TEINTES, teinteDe } from "./avatar";

describe("initialesDe", () => {
  it("prend le prénom et le nom", () => {
    expect(initialesDe("Youssef", "Amrani")).toBe("YA");
    expect(initialesDe("élodie", "ben ali")).toBe("ÉB");
  });

  it("se débrouille avec un seul nom", () => {
    expect(initialesDe("Abd-Allah", "")).toBe("AA");
    expect(initialesDe("Malek", null)).toBe("M");
    expect(initialesDe("", "Nouar")).toBe("N");
  });

  it("utilise l'e-mail en dernier recours, sinon rien", () => {
    expect(initialesDe("", "", "admin@exemple.fr")).toBe("A");
    expect(initialesDe(" ", undefined, null)).toBe("");
  });

  it("ignore les caractères qui ne sont pas des lettres", () => {
    expect(initialesDe("'Aïcha", "-Diallo")).toBe("AD");
  });
});

describe("teinteDe", () => {
  it("donne toujours la même teinte pour la même personne", () => {
    expect(teinteDe("abc")).toBe(teinteDe("abc"));
  });

  it("reste dans la palette", () => {
    for (const cle of ["a", "ddbcd235-8fc4", "Youssef Amrani", ""]) {
      expect(teinteDe(cle)).toBeGreaterThanOrEqual(0);
      expect(teinteDe(cle)).toBeLessThan(NB_TEINTES);
    }
  });
});
