import { describe, expect, it } from "vitest";
import {
  avisSon,
  contientParole,
  estimerBruit,
  normaliserVolume,
  pointDeCoupe,
  seuilVoix,
  type Trame,
} from "./decoupage";

const voix = (n: number, rms = 0.1): Trame[] => Array.from({ length: n }, () => ({ rms, pic: 0.5 }));
const silence = (n: number): Trame[] => Array.from({ length: n }, () => ({ rms: 0.003, pic: 0.01 }));
const BRUIT = 0.004;

describe("pointDeCoupe", () => {
  it("ne coupe pas pendant la récitation", () => {
    expect(pointDeCoupe(voix(20), BRUIT)).toBeNull();
  });

  it("coupe à une pause franche après au moins 2 s", () => {
    const t = [...voix(10), ...silence(3)];
    expect(pointDeCoupe(t, BRUIT)).toBe(11);
  });

  it("ne coupe pas une respiration trop courte", () => {
    expect(pointDeCoupe([...voix(10), ...silence(2)], BRUIT)).toBeNull();
  });

  it("ne coupe pas avant 2 s de morceau", () => {
    expect(pointDeCoupe([...voix(3), ...silence(3)], BRUIT)).toBeNull();
  });

  it("silence seul : rien à couper", () => {
    expect(pointDeCoupe(silence(40), BRUIT)).toBeNull();
  });

  it("au-delà de 25 s sans pause, coupe à l'endroit le plus calme des dernières secondes", () => {
    const t = voix(100);
    t[95] = { rms: 0.02, pic: 0.1 };
    expect(pointDeCoupe(t, BRUIT)).toBe(95);
  });
});

describe("son", () => {
  it("bruit de fond estimé sur les trames calmes", () => {
    expect(estimerBruit([...silence(20), ...voix(20)])).toBeCloseTo(0.004);
    expect(estimerBruit([])).toBe(0.004);
  });

  it("parole présente ou non", () => {
    expect(contientParole(voix(2), BRUIT)).toBe(true);
    expect(contientParole(silence(20), BRUIT)).toBe(false);
  });

  it("avis sur le son", () => {
    expect(avisSon(voix(12), BRUIT)).toBe("bon");
    expect(avisSon(voix(12, 0.012), BRUIT)).toBe("bas");
    expect(avisSon(voix(12, 0.02), BRUIT)).toBe("bon");
    expect(avisSon(silence(4), BRUIT)).toBe("attente");
    expect(avisSon(silence(12), BRUIT)).toBe("bas");
    expect(
      avisSon(
        Array.from({ length: 12 }, () => ({ rms: 0.4, pic: 1 })),
        BRUIT,
      ),
    ).toBe("fort");
    expect(avisSon(voix(12), 0.08)).toBe("bruit");
  });
});

describe("voix douce", () => {
  it("une voix faible (mais au-dessus du bruit) compte comme de la parole", () => {
    expect(contientParole(voix(4, 0.012), BRUIT)).toBe(true);
    expect(seuilVoix(BRUIT)).toBeLessThan(0.012);
  });

  it("une fin de mot douce n'est pas prise pour une pause", () => {
    const doux = Array.from({ length: 3 }, () => ({ rms: 0.009, pic: 0.05 }));
    expect(pointDeCoupe([...voix(10), ...doux], BRUIT)).toBeNull();
  });
});

describe("normaliserVolume", () => {
  const sinus = (amplitude: number, n = 16_000) =>
    Int16Array.from({ length: n }, (_, i) => Math.round(Math.sin(i / 5) * amplitude * 32767));
  const rms = (pcm: Int16Array) => Math.sqrt(pcm.reduce((s, v) => s + (v / 32768) ** 2, 0) / pcm.length);

  it("amplifie une voix faible jusqu'au volume visé", () => {
    const sortie = normaliserVolume(sinus(0.02));
    expect(rms(sortie)).toBeGreaterThan(0.09);
    expect(rms(sortie)).toBeLessThan(0.12);
  });

  it("ne sature jamais et plafonne le gain", () => {
    const sortie = normaliserVolume(sinus(0.001));
    expect(Math.max(...Array.from(sortie, Math.abs))).toBeLessThanOrEqual(32767);
    expect(rms(sortie)).toBeLessThan(0.01); // gain plafonné à 8
  });

  it("laisse une voix déjà forte telle quelle", () => {
    const fort = sinus(0.3);
    expect(normaliserVolume(fort)).toBe(fort);
  });
});
