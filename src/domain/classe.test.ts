import { describe, expect, it } from "vitest";
import { joursEntre, libelleDerniereSaisie, resumerClasse } from "./classe";

const eleves = [
  { id: "b", prenom: "Inès", nom: "Kaci", actif: true },
  { id: "a", prenom: "Yanis", nom: "Benali", actif: true },
  { id: "c", prenom: "Adam", nom: "Zerrouki", actif: false },
];

describe("resumerClasse", () => {
  const resume = resumerClasse(
    eleves,
    [
      { eleveId: "a", type: "apprentissage", date: "2026-11-09", dureeMin: 30 },
      { eleveId: "a", type: "revision", date: "2026-11-09", dureeMin: 20 },
      { eleveId: "a", type: "revision", date: "2026-11-10", dureeMin: 15 },
      { eleveId: "b", type: "apprentissage", date: "2026-11-02", dureeMin: 40 },
    ],
    [
      { eleveId: "a", statut: "atteint" },
      { eleveId: "a", statut: "en_cours" },
    ],
    new Map([
      ["a", "2026-11-10"],
      ["b", "2026-11-02"],
    ]),
    "2026-11-10",
  );

  it("trie les élèves par nom", () => {
    expect(resume.map((r) => r.eleve.nom)).toEqual(["Benali", "Kaci", "Zerrouki"]);
  });

  it("additionne les minutes par type et compte les jours distincts", () => {
    const yanis = resume[0]!;
    expect(yanis.minutesApprentissage).toBe(30);
    expect(yanis.minutesRevision).toBe(35);
    expect(yanis.joursTravailles).toBe(2);
    expect(yanis.objectifsAtteints).toBe(1);
    expect(yanis.objectifsTotal).toBe(2);
  });

  it("signale les élèves actifs sans saisie depuis 3 jours ou jamais", () => {
    expect(resume[0]?.alerte).toBe(false);
    expect(resume[1]?.joursSansSaisie).toBe(8);
    expect(resume[1]?.alerte).toBe(true);
    expect(resume[2]?.alerte).toBe(false); // archivé : pas d'alerte
  });
});

describe("utilitaires", () => {
  it("compte les jours entre deux dates", () => {
    expect(joursEntre("2026-10-30", "2026-11-02")).toBe(3);
  });

  it("formule la dernière saisie", () => {
    expect(libelleDerniereSaisie(null)).toBe("jamais");
    expect(libelleDerniereSaisie(0)).toBe("aujourd’hui");
    expect(libelleDerniereSaisie(1)).toBe("hier");
    expect(libelleDerniereSaisie(5)).toBe("il y a 5 jours");
  });
});
