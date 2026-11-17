import { describe, expect, it } from "vitest";
import { dateHegirienne, libelleHegirien, libelleHegirienArabe } from "./hegire";

describe("dateHegirienne (Umm al-Qura)", () => {
  it("donne le jour, le mois et l'année hégiriens", () => {
    expect(dateHegirienne("2026-11-17")).toEqual({ jour: 7, mois: 6, annee: 1448 });
    expect(dateHegirienne("2026-02-18")).toEqual({ jour: 1, mois: 9, annee: 1447 }); // 1er Ramadan
    expect(dateHegirienne("2026-06-16")).toEqual({ jour: 1, mois: 1, annee: 1448 }); // Nouvel an
  });

  it("libellés en phonétique et en arabe", () => {
    const d = { jour: 7, mois: 6, annee: 1448 };
    expect(libelleHegirien(d)).toBe("7 Joumada ath-thania 1448");
    expect(libelleHegirienArabe(d)).toBe("٧ جمادى الآخرة ١٤٤٨ هـ");
  });
});
