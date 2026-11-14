import { describe, expect, it } from "vitest";
import { depuisQuand, grouperParJour, phraseAudit, regrouperOuvertures } from "./journal";

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
    expect(depuisQuand("2026-11-13T17:00:00Z", maintenant)).toBe("aujourd’hui à 18:00");
    expect(depuisQuand("2026-11-12T20:14:00Z", maintenant)).toBe("hier à 21:14");
    expect(depuisQuand("2026-11-09T08:05:00Z", maintenant)).toBe("lundi à 09:05");
    expect(depuisQuand("2026-10-02T10:00:00Z", maintenant)).toBe("2 oct. à 12:00");
  });
});

describe("depuisQuand, au fil des jours de Paris", () => {
  it("passe à « hier » à minuit, heure de Paris", () => {
    const maintenant = new Date("2026-11-13T23:30:00Z"); // 0 h 30 le 14 à Paris
    expect(depuisQuand("2026-11-13T22:00:00Z", maintenant)).toBe("hier à 23:00");
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

describe("regrouperOuvertures", () => {
  it("regroupe les ouvertures successives d'une personne le même jour", () => {
    const g = regrouperOuvertures([
      { id: "1", quand: "2026-11-14T18:46:00Z", personneId: "a" },
      { id: "2", quand: "2026-11-14T17:05:00Z", personneId: "b" },
      { id: "3", quand: "2026-11-14T16:32:00Z", personneId: "a" },
      { id: "4", quand: "2026-11-14T15:35:00Z", personneId: "a" },
      { id: "5", quand: "2026-11-13T20:00:00Z", personneId: "a" },
    ]);
    expect(g.map((x) => [x.id, x.nombre, x.premiere])).toEqual([
      ["1", 1, "2026-11-14T18:46:00Z"],
      ["2", 1, "2026-11-14T17:05:00Z"],
      ["3", 2, "2026-11-14T15:35:00Z"],
      ["5", 1, "2026-11-13T20:00:00Z"],
    ]);
  });
});
