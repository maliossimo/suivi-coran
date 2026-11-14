import { describe, expect, it } from "vitest";
import { dateCourte, dateHeure, heure } from "./format";

describe("format des dates (heure de Paris)", () => {
  const iso = "2026-11-12T13:30:00Z"; // 14:30 à Paris
  it("date et heure", () => {
    expect(dateHeure(iso)).toBe("12 nov., 14:30");
  });
  it("date courte, avec ou sans l'année", () => {
    expect(dateCourte(iso)).toBe("12 nov.");
    expect(dateCourte(iso, true)).toBe("12 nov. 2026");
  });
  it("change de jour à minuit à Paris", () => {
    expect(dateCourte("2026-11-12T23:30:00Z")).toBe("13 nov.");
  });
  it("heure seule", () => {
    expect(heure(iso)).toBe("14:30");
  });
});
