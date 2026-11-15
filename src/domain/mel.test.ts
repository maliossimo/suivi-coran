import { describe, expect, it } from "vitest";
import { filtresMel, logMel } from "./mel";

// Valeurs de référence : api/_tajwid/mel.py (le calcul du serveur) sur le même son de synthèse.
const son = Float32Array.from({ length: 8000 }, (_, i) => {
  const t = i / 16000;
  return (
    0.3 * Math.sin(2 * Math.PI * 220 * t) +
    0.1 * Math.sin(2 * Math.PI * 1500 * t * (1 + t)) +
    0.05 * Math.cos(2 * Math.PI * 3700 * t)
  );
});

const REFERENCE: [number, number, number][] = [
  [0, 0, 1.040826],
  [0, 1, 0.494626],
  [5, 10, 1.301853],
  [20, 25, -0.592043],
  [40, 3, 0.356753],
  [60, 49, 0.836611],
  [79, 0, -0.081655],
  [79, 30, -0.69814],
  [33, 33, -0.69814],
  [12, 48, -0.124239],
];
const FILTRE_1_1 = 0.00199082191;

describe("log-Mel sur le téléphone", () => {
  it("80 bandes, une trame toutes les 10 ms", () => {
    const { trames, valeurs } = logMel(son);
    expect(trames).toBe(50);
    expect(valeurs).toHaveLength(80 * 50);
  });

  it("donne les mêmes valeurs que le serveur", () => {
    const { valeurs, trames } = logMel(son);
    const at = (bande: number, t: number) => valeurs[bande * trames + t]!;
    for (const [b, t, attendu] of REFERENCE) expect(Math.abs(at(b, t) - attendu)).toBeLessThan(1e-4);
  });

  it("filtres Mel de Whisper (Slaney)", () => {
    const f = filtresMel();
    expect(f).toHaveLength(80 * 201);
    expect(Math.abs(f[1 * 201 + 1]! - FILTRE_1_1)).toBeLessThan(1e-6);
  });
});
