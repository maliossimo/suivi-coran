import { describe, expect, it } from "vitest";
import {
  compterErreursAVoir,
  depuisQuand,
  expliquerErreur,
  grouperParJour,
  nomDePage,
  phraseAudit,
  regrouperErreurs,
  regrouperOuvertures,
} from "./journal";

describe("phraseAudit", () => {
  it("écrit une phrase simple", () => {
    expect(phraseAudit("UPDATE", "seances")).toBe("a modifié une séance");
    expect(phraseAudit("INSERT", "passages")).toBe("a créé un passage");
    expect(phraseAudit("DELETE", "appels")).toBe("a supprimé un appel");
    expect(phraseAudit("SUPPRESSION_UTILISATEUR", "profils")).toBe("a supprimé un compte");
    expect(phraseAudit("CHANGEMENT_ESPACE", "comptes_lies")).toBe("a changé d’espace");
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

describe("regrouperErreurs", () => {
  it("réunit les erreurs au même message, de la plus récente à la plus ancienne", () => {
    const g = regrouperErreurs([
      {
        quand: "2026-11-14T16:36:00Z",
        page: "/admin/coran",
        message: "e[o] is not a function",
        version: "edcce02",
      },
      { quand: "2026-11-14T16:35:00Z", page: "/eleve", message: "Autre", version: null },
      {
        quand: "2026-11-14T16:35:00Z",
        page: "/admin/coran",
        message: "e[o] is not a function",
        version: "edcce02",
      },
      {
        quand: "2026-11-14T16:34:00Z",
        page: "/admin",
        message: "e[o] is not a function",
        version: "abc1234",
      },
    ]);
    expect(g).toEqual([
      {
        message: "e[o] is not a function",
        nombre: 3,
        quand: "2026-11-14T16:36:00Z",
        pages: ["/admin/coran", "/admin"],
        versions: ["edcce02", "abc1234"],
      },
      { message: "Autre", nombre: 1, quand: "2026-11-14T16:35:00Z", pages: ["/eleve"], versions: [] },
    ]);
  });
});

describe("expliquerErreur", () => {
  it("reconnaît un réseau coupé, sans gravité", () => {
    for (const m of [
      "Load failed",
      "TypeError: Failed to fetch",
      "NetworkError when attempting to fetch resource.",
    ]) {
      const e = expliquerErreur(m);
      expect(e.type).toBe("reseau");
      expect(e.sansGravite).toBe(true);
    }
  });

  it("reconnaît une appli mise à jour pendant l'utilisation", () => {
    expect(expliquerErreur("ChunkLoadError: Loading chunk 123 failed").type).toBe("mise-a-jour");
    expect(expliquerErreur("Failed to fetch dynamically imported module: /x.js").type).toBe("mise-a-jour");
  });

  it("signale un écart d'affichage comme à regarder", () => {
    const e = expliquerErreur("Hydration failed because the server rendered HTML didn't match");
    expect(e.type).toBe("affichage");
    expect(e.sansGravite).toBe(false);
  });

  it("garde le reste comme erreur de l'appli, à regarder", () => {
    const e = expliquerErreur("TypeError: Cannot read properties of undefined (reading 'x')");
    expect(e.type).toBe("appli");
    expect(e.sansGravite).toBe(false);
  });
});

describe("nomDePage", () => {
  it("donne un nom lisible aux pages connues", () => {
    expect(nomDePage("/connexion")).toBe("écran de connexion");
    expect(nomDePage("/eleve/progression")).toBe("espace élève");
    expect(nomDePage("/autre/chose")).toBe("/autre/chose");
  });
});

describe("compterErreursAVoir", () => {
  const e = (message: string, page = "/eleve") => ({
    quand: "2026-11-20T10:00:00Z",
    page,
    message,
    version: null,
  });

  it("compte une erreur répétée pour une seule", () => {
    expect(compterErreursAVoir([e("TypeError: x"), e("TypeError: x", "/maitre"), e("TypeError: y")])).toBe(2);
  });

  it("ignore les erreurs sans gravité", () => {
    expect(compterErreursAVoir([e("Load failed"), e("ChunkLoadError: Loading chunk 1 failed")])).toBe(0);
  });

  it("vaut zéro sans erreur", () => {
    expect(compterErreursAVoir([])).toBe(0);
  });
});
