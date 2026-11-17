import { describe, expect, it } from "vitest";
import {
  extraireConfData,
  heureEnMinutes,
  horairesDepuisConf,
  importADesuet,
  iqamaEnMinutes,
  urlPageMawaqit,
  type ConfMawaqit,
} from "./mawaqit";

const JOURS_PAR_MOIS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Calendrier fictif complet : mêmes heures chaque jour. */
function confFictive(retouche?: (c: ConfMawaqit) => void): ConfMawaqit {
  const jours = (valeur: string[]) =>
    JOURS_PAR_MOIS.map((n) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [String(i + 1), valeur])),
    );
  const conf: ConfMawaqit = {
    calendar: jours(["06:30", "08:00", "12:30", "14:45", "17:10", "19:20"]),
    iqamaCalendar: jours(["+10", "+10", "+10", "+5", "20:00"]),
    jumua: "13:00",
    jumua2: null,
    jumua3: "12:15",
    timezone: "Europe/Paris",
  };
  retouche?.(conf);
  return conf;
}

describe("page Mawaqit", () => {
  it("construit l'URL de la page d'une mosquée et refuse une adresse douteuse", () => {
    expect(urlPageMawaqit("mosquee-exemple")).toBe("https://mawaqit.net/fr/m/mosquee-exemple");
    expect(() => urlPageMawaqit("../admin")).toThrow();
    expect(() => urlPageMawaqit("a?b=1")).toThrow();
  });

  it("extrait confData du HTML, même avec des accolades dans les chaînes", () => {
    const html = `<script>
      var latitude = 48.6;
      var confData = {"name":"Mosquée {test}","calendar":[{"1":["06:30"]}],"txt":"a \\" } b"};
      var lang = 'fr';
    </script>`;
    expect(extraireConfData(html)).toEqual({
      name: "Mosquée {test}",
      calendar: [{ "1": ["06:30"] }],
      txt: 'a " } b',
    });
  });

  it("renvoie null sans confData ou si le JSON est cassé", () => {
    expect(extraireConfData("<html>rien</html>")).toBeNull();
    expect(extraireConfData('var confData = {"a": };')).toBeNull();
    expect(extraireConfData('var confData = {"a": 1')).toBeNull();
  });
});

describe("heures", () => {
  it("convertit HH:MM en minutes", () => {
    expect(heureEnMinutes("06:29")).toBe(389);
    expect(heureEnMinutes("7:05")).toBe(425);
    expect(heureEnMinutes("24:00")).toBeNull();
    expect(heureEnMinutes("")).toBeNull();
    expect(heureEnMinutes(null)).toBeNull();
  });

  it("calcule l'iqama : décalage ou heure fixe, jamais avant l'adhan", () => {
    expect(iqamaEnMinutes("+10", 389)).toBe(399);
    expect(iqamaEnMinutes("5", 1031)).toBe(1036);
    expect(iqamaEnMinutes("13:45", 755)).toBe(825);
    expect(iqamaEnMinutes("12:00", 755)).toBeNull();
    expect(iqamaEnMinutes("+30", 1430)).toBeNull();
    expect(iqamaEnMinutes("", 389)).toBeNull();
    expect(iqamaEnMinutes(undefined, 389)).toBeNull();
  });
});

describe("calendrier de la mosquée", () => {
  it("donne les 366 jours, l'iqama et Joumou'a triées", () => {
    const h = horairesDepuisConf(confFictive());
    expect(h.jours).toHaveLength(366);
    expect(h.jours[0]).toEqual({
      mois: 1,
      jour: 1,
      fajr: 390,
      chourouq: 480,
      dhuhr: 750,
      asr: 885,
      maghrib: 1030,
      isha: 1160,
      iqamaFajr: 400,
      iqamaDhuhr: 760,
      iqamaAsr: 895,
      iqamaMaghrib: 1035,
      iqamaIsha: 1200,
    });
    expect(h.jumua).toEqual([735, 780]);
  });

  it("accepte un février de 28 jours et un calendrier sans iqama", () => {
    const h = horairesDepuisConf(
      confFictive((c) => {
        delete c.calendar[1]!["29"];
        c.iqamaCalendar = null;
      }),
    );
    expect(h.jours).toHaveLength(365);
    expect(h.jours[0]!.iqamaFajr).toBeNull();
  });

  it("refuse un calendrier incomplet, désordonné ou d'un autre fuseau", () => {
    expect(() => horairesDepuisConf(confFictive((c) => c.calendar.pop()))).toThrow(/12 mois/);
    expect(() => horairesDepuisConf(confFictive((c) => delete c.calendar[4]!["12"]))).toThrow(/Mois 5/);
    expect(() =>
      horairesDepuisConf(
        confFictive((c) => (c.calendar[0]!["3"] = ["06:30", "05:00", "12:30", "14:45", "17:10", "19:20"])),
      ),
    ).toThrow(/désordre/);
    expect(() =>
      horairesDepuisConf(
        confFictive((c) => (c.calendar[0]!["3"] = ["06:30", "08:00", "12:30", "14:45", "17:10"])),
      ),
    ).toThrow(/illisible/);
    expect(() => horairesDepuisConf(confFictive((c) => (c.timezone = "Africa/Algiers")))).toThrow(/Fuseau/);
  });
});

describe("rythme des imports", () => {
  it("relit la page au plus une fois tous les 25 jours", () => {
    const maintenant = new Date("2026-11-30T03:00:00Z");
    expect(importADesuet(null, maintenant)).toBe(true);
    expect(importADesuet(new Date("2026-11-17T20:00:00Z"), maintenant)).toBe(false);
    expect(importADesuet(new Date("2026-11-04T03:00:00Z"), maintenant)).toBe(true);
  });

  it("après un essai (même raté), attend le lendemain", () => {
    const maintenant = new Date("2026-11-30T03:00:00Z");
    expect(importADesuet(null, maintenant, new Date("2026-11-30T01:00:00Z"))).toBe(false);
    expect(importADesuet(null, maintenant, new Date("2026-11-29T03:00:00Z"))).toBe(true);
  });
});
