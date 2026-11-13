import { describe, expect, it } from "vitest";
import { depuisQuand, grouperParJour, phraseAudit } from "./journal";

describe("phraseAudit", () => {
  it("écrit une phrase simple", () => {
    expect(phraseAudit("UPDATE", "seances")).toBe("a modifié une séance");
    expect(phraseAudit("INSERT", "passages")).toBe("a créé un passage");
    expect(phraseAudit("DELETE", "appels")).toBe("a supprimé un appel");
    expect(phraseAudit("SUPPRESSION_UTILISATEUR", "profils")).toBe("a supprimé un compte");
  });

  it("garde le code d'un élément inconnu", () => {
    expect(phraseAudit("UPDATE", "autre")).toBe("a modifié autre");
  });
});

describe("depuisQuand", () => {
  const maintenant = new Date("2026-11-13T20:00:00Z");
  it("donne un délai lisible", () => {
    expect(depuisQuand(null, maintenant)).toBe("jamais");
    expect(depuisQuand("2026-11-13T19:59:30Z", maintenant)).toBe("à l’instant");
    expect(depuisQuand("2026-11-13T19:45:00Z", maintenant)).toBe("il y a 15 min");
    expect(depuisQuand("2026-11-13T17:00:00Z", maintenant)).toBe("il y a 3 h");
    expect(depuisQuand("2026-11-12T10:00:00Z", maintenant)).toBe("hier");
    expect(depuisQuand("2026-11-09T10:00:00Z", maintenant)).toBe("il y a 4 j");
    expect(depuisQuand("2026-10-02T10:00:00Z", maintenant)).toBe("2 oct.");
  });
});

describe("grouperParJour", () => {
  it("regroupe par jour de Paris, dans l'ordre reçu", () => {
    const maintenant = new Date("2026-11-13T20:00:00Z");
    const groupes = grouperParJour(
      [
        { id: 1, quand: "2026-11-13T23:30:00Z" }, // déjà le 14 à Paris
        { id: 2, quand: "2026-11-13T09:00:00Z" },
        { id: 3, quand: "2026-11-12T09:00:00Z" },
        { id: 4, quand: "2026-11-10T09:00:00Z" },
      ],
      maintenant,
    );
    expect(groupes.map((g) => g.cle)).toEqual(["2026-11-14", "2026-11-13", "2026-11-12", "2026-11-10"]);
    expect(groupes[1]?.titre).toBe("Aujourd’hui");
    expect(groupes[2]?.titre).toBe("Hier");
    expect(groupes[3]?.titre).toBe("mardi 10 novembre");
  });
});
