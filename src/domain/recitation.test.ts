import { describe, expect, it } from "vitest";
import { motsDuVerset, normaliserArabe, ressemblance, verifierRecitation } from "./recitation";

const FATIHA_2 = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ ٢";
const statuts = (texte: string, entendu: string) =>
  verifierRecitation(texte, entendu).mots.map((m) => m.statut);

describe("normaliserArabe", () => {
  it("retire voyelles et signes, unifie les lettres proches", () => {
    expect(normaliserArabe("ٱلْحَمْدُ")).toBe("الحمد");
    expect(normaliserArabe("ٱلرَّحْمَٰنِ")).toBe("الرحمن");
    expect(normaliserArabe("هُدًى")).toBe("هدي");
  });
});

describe("ressemblance", () => {
  it("accepte l'orthographe courante d'un mot du mushaf", () => {
    expect(ressemblance("ٱلصَّلَوٰةَ", "الصلاة")).toBe(1);
    expect(ressemblance("ٱلْكِتَٰبُ", "الكتاب")).toBeGreaterThanOrEqual(0.7);
  });
  it("distingue deux mots différents", () => {
    expect(ressemblance("ٱلْعَٰلَمِينَ", "الناس")).toBeLessThan(0.7);
  });
});

describe("verifierRecitation", () => {
  it("ne compte que les mots (pas le numéro du verset)", () => {
    expect(motsDuVerset(FATIHA_2)).toHaveLength(4);
  });

  it("tout juste", () => {
    const v = verifierRecitation(FATIHA_2, "الحمد لله رب العالمين");
    expect(v.score).toBe(100);
    expect(v.ajoutes).toBe(0);
  });

  it("repère un mot oublié", () => {
    expect(statuts(FATIHA_2, "الحمد رب العالمين")).toEqual(["juste", "oublie", "juste", "juste"]);
  });

  it("repère un mot remplacé et dit ce qui a été entendu", () => {
    const v = verifierRecitation(FATIHA_2, "الحمد لله رب الناس");
    expect(v.mots[3]).toEqual({ texte: "ٱلْعَٰلَمِينَ", statut: "different", entendu: "الناس" });
    expect(v.score).toBe(75);
  });

  it("compte les mots répétés en trop sans pénaliser le verset", () => {
    const v = verifierRecitation(FATIHA_2, "الحمد لله لله رب العالمين");
    expect(v.score).toBe(100);
    expect(v.ajoutes).toBe(1);
  });

  it("rien entendu : tout est oublié", () => {
    expect(verifierRecitation(FATIHA_2, "").score).toBe(0);
  });
});
