import { describe, expect, it } from "vitest";
import {
  confirmationValide,
  correspondARecherche,
  joursEntre,
  libelleDerniereSaisie,
  resumerClasse,
  trierParPrenom,
  phraseEleve,
  deNom,
} from "./classe";

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

  it("trie les élèves par prénom", () => {
    expect(resume.map((r) => r.eleve.prenom)).toEqual(["Adam", "Inès", "Yanis"]);
  });

  it("additionne les minutes par type et compte les jours distincts", () => {
    const yanis = resume[2]!;
    expect(yanis.minutesApprentissage).toBe(30);
    expect(yanis.minutesRevision).toBe(35);
    expect(yanis.joursTravailles).toBe(2);
    expect(yanis.objectifsAtteints).toBe(1);
    expect(yanis.objectifsTotal).toBe(2);
  });

  it("signale les élèves actifs sans saisie depuis 3 jours ou jamais", () => {
    expect(resume[2]?.alerte).toBe(false);
    expect(resume[1]?.joursSansSaisie).toBe(8);
    expect(resume[1]?.alerte).toBe(true);
    expect(resume[0]?.alerte).toBe(false); // archivé : pas d'alerte
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

describe("trierParPrenom", () => {
  it("trie par prénom puis nom, accents compris", () => {
    const eleves = [
      { prenom: "Yanis", nom: "B" },
      { prenom: "émile", nom: "Z" },
      { prenom: "Adam", nom: "K" },
      { prenom: "Adam", nom: "B" },
      { prenom: "Elias", nom: "C" },
    ];
    expect(trierParPrenom(eleves).map((e) => `${e.prenom} ${e.nom}`)).toEqual([
      "Adam B",
      "Adam K",
      "Elias C",
      "émile Z",
      "Yanis B",
    ]);
  });
});

describe("correspondARecherche", () => {
  const eleve = { prenom: "Élise", nom: "Benali" };
  it("ignore accents et majuscules, cherche dans prénom et nom", () => {
    expect(correspondARecherche(eleve, "elise")).toBe(true);
    expect(correspondARecherche(eleve, "BEN")).toBe(true);
    expect(correspondARecherche(eleve, "eli ben")).toBe(true);
    expect(correspondARecherche(eleve, "  ")).toBe(true);
    expect(correspondARecherche(eleve, "adam")).toBe(false);
  });
});

describe("confirmationValide", () => {
  it("attend le prénom exact, sans tenir compte des accents ni des majuscules", () => {
    expect(confirmationValide("Élise", "elise")).toBe(true);
    expect(confirmationValide("Élise", " ÉLISE ")).toBe(true);
    expect(confirmationValide("Élise", "Elisa")).toBe(false);
    expect(confirmationValide("", "")).toBe(false);
  });
});

describe("phraseEleve", () => {
  it("dit simplement où en est l'élève", () => {
    expect(phraseEleve(0)).toBe("A saisi aujourd’hui");
    expect(phraseEleve(1)).toBe("A saisi hier");
    expect(phraseEleve(5)).toBe("Rien depuis 5 jours");
    expect(phraseEleve(null)).toBe("N’a encore rien saisi");
  });
});

describe("deNom", () => {
  it("élide devant une voyelle, même accentuée", () => {
    expect(deNom("Ilyes")).toBe("d’Ilyes");
    expect(deNom("Élève Test")).toBe("d’Élève Test");
    expect(deNom("omar")).toBe("d’omar");
  });

  it("garde « de » devant une consonne (et le h)", () => {
    expect(deNom("Karim")).toBe("de Karim");
    expect(deNom("Hamza")).toBe("de Hamza");
  });
});
