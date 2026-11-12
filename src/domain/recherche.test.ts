import { describe, expect, it } from "vitest";
import { normaliserArabe, normaliserLatin, rechercherSourates } from "./recherche";
import { SOURATES } from "./test/sourates";

const chercher = (texte: string) => rechercherSourates(SOURATES, texte).map((s) => s.numero);

describe("normalisation", () => {
  it("enlève accents, tirets et apostrophes", () => {
    expect(normaliserLatin("  Al-Mu'minun ")).toBe("al muminun");
    expect(normaliserLatin("Ṭā-Hā")).toBe("ta ha");
  });

  it("enlève voyelles et article en arabe", () => {
    expect(normaliserArabe("البَقَرَة")).toBe("بقره");
  });
});

describe("rechercherSourates", () => {
  it("renvoie toutes les sourates sans texte", () => {
    expect(chercher("")).toHaveLength(114);
    expect(chercher("   ")).toHaveLength(114);
  });

  it("trouve par numéro, le numéro exact d'abord", () => {
    expect(chercher("2")[0]).toBe(2);
    expect(chercher("2").slice(0, 3)).toEqual([2, 20, 21]);
    expect(chercher("114")).toEqual([114]);
    expect(chercher("115")).toEqual([]);
  });

  it("trouve par début de nom, avec ou sans article", () => {
    expect(chercher("baq")[0]).toBe(2);
    expect(chercher("al baq")[0]).toBe(2);
    expect(chercher("Al-Baqara")).toEqual([2]);
    expect(chercher("naba")[0]).toBe(78);
    expect(chercher("mulk")[0]).toBe(67);
  });

  it("tolère majuscules, accents et apostrophes", () => {
    expect(chercher("MULK")[0]).toBe(67);
    expect(chercher("ikhlas")[0]).toBe(112);
  });

  it("trouve par nom arabe", () => {
    expect(chercher("البقرة")[0]).toBe(2);
    expect(chercher("ملك")[0]).toBe(67);
  });

  it("ne renvoie rien pour un texte sans rapport", () => {
    expect(chercher("zzzz")).toEqual([]);
  });
});
