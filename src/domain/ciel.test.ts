import { describe, expect, it } from "vitest";
import { jourParticulier, momentDuCiel, phaseLune, tempsDePriere, titreArabe } from "./ciel";
import { formaterMinutes, horairesPriere } from "./priere";

const paris17nov = horairesPriere("2026-11-17");
const m = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe("horairesPriere (Paris)", () => {
  it("lever et coucher du soleil conformes aux éphémérides (à 3 min près)", () => {
    const ete = horairesPriere("2026-06-21");
    const hiver = horairesPriere("2026-12-21");
    for (const [calcule, attendu] of [
      [ete.lever, "05:47"],
      [ete.maghrib, "21:58"],
      [hiver.lever, "08:41"],
      [hiver.maghrib, "16:56"],
    ] as const) {
      expect(Math.abs(calcule - m(attendu))).toBeLessThanOrEqual(3);
    }
  });
  it("ordre des prières, même l'été (Fajr et Icha à 12°)", () => {
    for (const d of ["2026-06-21", "2026-12-21", "2026-11-17"]) {
      const h = horairesPriere(d);
      expect(
        h.fajr < h.lever && h.lever < h.dhuhr && h.dhuhr < h.asr && h.asr < h.maghrib && h.maghrib < h.isha,
      ).toBe(true);
    }
    expect(formaterMinutes(paris17nov.lever)).toMatch(/^0[78]:\d\d$/);
  });
});

describe("momentDuCiel et tempsDePriere", () => {
  it("suit la journée", () => {
    expect(momentDuCiel(m("03:00"), paris17nov)).toBe("nuit");
    expect(momentDuCiel(m("07:30"), paris17nov)).toBe("fajr");
    expect(momentDuCiel(m("12:00"), paris17nov)).toBe("jour");
    expect(momentDuCiel(m("17:00"), paris17nov)).toBe("maghrib");
    expect(momentDuCiel(m("22:00"), paris17nov)).toBe("nuit");
    expect(tempsDePriere(m("10:00"), paris17nov)).toBe("وقت الضحى");
    expect(tempsDePriere(m("13:00"), paris17nov)).toBe("وقت الظهر");
    expect(tempsDePriere(m("23:00"), paris17nov)).toBe("وقت العشاء");
  });
});

describe("phaseLune", () => {
  it("croissant fin au début du mois, pleine lune le 14, puis décroissante", () => {
    expect(phaseLune(1).eclairee).toBeLessThan(0.1);
    expect(phaseLune(1).croissante).toBe(true);
    expect(phaseLune(14).eclairee).toBeGreaterThan(0.95);
    expect(phaseLune(22).croissante).toBe(false);
  });
});

describe("jourParticulier", () => {
  it("fêtes, Ramadan, vendredi, jours blancs", () => {
    expect(jourParticulier("2026-03-20", { jour: 1, mois: 10, annee: 1447 })).toBe("aid-fitr");
    expect(jourParticulier("2026-05-27", { jour: 10, mois: 12, annee: 1447 })).toBe("aid-adha");
    expect(jourParticulier("2026-02-20", { jour: 3, mois: 9, annee: 1447 })).toBe("ramadan");
    expect(jourParticulier("2026-11-20", { jour: 10, mois: 6, annee: 1448 })).toBe("vendredi");
    expect(jourParticulier("2026-11-23", { jour: 13, mois: 6, annee: 1448 })).toBe("jours-blancs");
    expect(jourParticulier("2026-11-17", { jour: 7, mois: 6, annee: 1448 })).toBeNull();
  });
});

describe("titreArabe", () => {
  it("connaît les pages, pas les noms d'élèves", () => {
    expect(titreArabe("Ma classe")).toBe("حلقتي");
    expect(titreArabe("Inès Essai")).toBeNull();
  });
});
