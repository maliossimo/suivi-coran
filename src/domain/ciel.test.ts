import { describe, expect, it } from "vitest";
import {
  debutDernierTiers,
  jourParticulier,
  momentDuCiel,
  phaseDeNuit,
  phaseLune,
  positionAstre,
  positionAstreFigee,
  tempsDePriere,
  titreArabe,
} from "./ciel";
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

describe("phaseDeNuit", () => {
  it("nuit profonde après l'Icha, dernier tiers de la nuit avant le Fajr, rien le jour", () => {
    expect(phaseDeNuit(m("19:00"), paris17nov)).toBe("profonde");
    expect(phaseDeNuit(m("23:30"), paris17nov)).toBe("profonde");
    expect(phaseDeNuit(m("00:30"), paris17nov)).toBe("profonde");
    expect(phaseDeNuit(m("03:00"), paris17nov)).toBe("tahajjud");
    expect(phaseDeNuit(m("06:00"), paris17nov)).toBe("tahajjud");
    expect(phaseDeNuit(m("12:00"), paris17nov)).toBeNull();
    expect(phaseDeNuit(m("17:30"), paris17nov)).toBeNull();
  });
  it("le dernier tiers commence aux deux tiers de la nuit (du Maghrib au Fajr)", () => {
    const h = paris17nov;
    const nuit = h.fajr + 1440 - h.maghrib;
    expect(debutDernierTiers(h) - h.maghrib).toBeCloseTo((2 * nuit) / 3, 5);
    expect(debutDernierTiers(h)).toBeGreaterThan(h.isha);
    expect(debutDernierTiers(h)).toBeLessThan(h.fajr + 1440);
  });
  it("l'été aussi, la nuit courte est coupée en deux", () => {
    const ete = horairesPriere("2026-06-21");
    expect(phaseDeNuit(m("23:50"), ete)).toBe("profonde");
    expect(phaseDeNuit(m("03:00"), ete)).toBe("tahajjud");
  });
});

describe("positionAstre", () => {
  it("le soleil monte du lever à midi puis descend jusqu'au Maghrib", () => {
    const h = paris17nov;
    const lever = positionAstre(h.lever, h);
    const midi = positionAstre(h.dhuhr, h);
    const soir = positionAstre(h.maghrib - 1, h);
    expect(lever.astre).toBe("soleil");
    expect(lever.hauteur).toBeLessThan(0.05);
    expect(lever.bas).toBeGreaterThan(0.85);
    expect(midi.hauteur).toBeGreaterThan(0.97);
    expect(midi.bas).toBe(0);
    expect(midi.avance).toBeGreaterThan(0.4);
    expect(midi.avance).toBeLessThan(0.6);
    expect(soir.hauteur).toBeLessThan(0.1);
    expect(soir.bas).toBeGreaterThan(0.7);
    expect(soir.avance).toBeGreaterThan(0.9);
  });
  it("la lune prend le relais après le coucher et traverse le ciel avant l'aube", () => {
    const h = paris17nov;
    const tot = positionAstre(h.isha, h);
    const minuit = positionAstre(m("00:00"), h);
    const aube = positionAstre(h.fajr, h);
    expect(tot.astre).toBe("lune");
    expect(minuit.astre).toBe("lune");
    expect(minuit.hauteur).toBeGreaterThan(0.9);
    expect(aube.astre).toBe("lune");
    expect(aube.avance).toBeGreaterThan(tot.avance);
    expect(aube.hauteur).toBeLessThan(minuit.hauteur);
  });
  it("jamais deux astres à la fois, et un seul passage de relais par horizon", () => {
    const h = paris17nov;
    let dernier = positionAstre(0, h).astre;
    let relais = 0;
    for (let minute = 1; minute < 1440; minute++) {
      const a = positionAstre(minute, h).astre;
      if (a !== dernier) relais++;
      dernier = a;
    }
    expect(relais).toBe(2);
  });
  it("au moment du relais, l'astre qui part et celui qui arrive sont sur l'horizon", () => {
    const h = paris17nov;
    expect(Math.abs(positionAstre(h.maghrib + 20, h).hauteur)).toBeLessThan(0.12);
    expect(Math.abs(positionAstre(h.lever - 21, h).hauteur)).toBeLessThan(0.12);
  });
  it("ciel figé : position fixe, pas d'astre la nuit", () => {
    expect(positionAstreFigee("jour")?.astre).toBe("soleil");
    expect(positionAstreFigee("fajr")?.bas).toBeGreaterThan(0.8);
    expect(positionAstreFigee("nuit")).toBeNull();
    expect(positionAstreFigee("tahajjud")).toBeNull();
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
