import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { couverts, decoderCtc, distance, PHONEMES, RIWAYAT, situer } from "./suivi";

describe("suivi sur le téléphone", () => {
  it("connaît les mêmes symboles que le modèle", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "api/_tajwid/config.json"), "utf8")) as {
      phonemes: string[];
      riwayat: string[];
    };
    expect([...PHONEMES]).toEqual(config.phonemes);
    expect([...RIWAYAT]).toEqual(config.riwayat);
  });

  it("décode le meilleur chemin CTC (blancs retirés, répétitions fusionnées)", () => {
    const V = PHONEMES.length + 1;
    const suite = [0, 2, 2, 0, 2, 32, 32, 0]; // blanc, ب, ب, blanc, ب, َ, َ, blanc
    const lp = new Float32Array(suite.length * V).fill(-10);
    suite.forEach((i, t) => (lp[t * V + i] = 0));
    expect(decoderCtc(lp, suite.length, V)).toBe("ببَ");
  });

  it("mesure la distance d'édition", () => {
    expect(distance("كتاب", "كتاب")).toBe(0);
    expect(distance("كتاب", "كتب")).toBe(1);
    expect(distance("", "abc")).toBe(3);
    expect(distance("kitten", "sitting")).toBe(3);
  });

  it("situe l'élève dans le passage", () => {
    const mots = ["aa", "bbb", "cccc", "dd"];
    let pos = 0;
    const spans = mots.map((m) => {
      const s = [pos, pos + m.length] as const;
      pos += m.length;
      return s;
    });
    const ref = { phonemes: mots.join(""), spans };
    expect(situer("aabbbccc", ref, 0)).toEqual([0, 3]);
    expect(situer("ccccdd", ref, 2)).toEqual([2, 4]);
    // Trop peu entendu : on ne bouge pas.
    expect(couverts("ab", ref, 1)).toEqual([1, 1]);
  });
});
