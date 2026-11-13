import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CODES_TAJWID, type SegmentTajwid } from "@/domain/coran";
import { NB_VERSETS_WARSH } from "@/domain/lectures";
import { RECITATEURS_VERSETS } from "./recitateurs";
import { SOURATES } from "@/domain/test/sourates";

const dossier = join(__dirname, "coran");
const versets = (lecture: string, n: number): string[] =>
  JSON.parse(readFileSync(join(dossier, lecture, `${n}.json`), "utf8")) as string[];

describe("texte du Coran (KFGQPC)", () => {
  it.each(["hafs", "warsh"])("%s : 114 sourates", (lecture) => {
    expect(readdirSync(join(dossier, lecture)).filter((f) => f.endsWith(".json"))).toHaveLength(114);
  });

  it("Hafs : même nombre de versets que le référentiel", () => {
    for (const s of SOURATES) expect(versets("hafs", s.numero)).toHaveLength(s.nbVersets);
  });

  it("Warsh : même nombre de versets que la numérotation Warsh de l'appli", () => {
    NB_VERSETS_WARSH.forEach((nb, i) => expect(versets("warsh", i + 1)).toHaveLength(nb));
  });

  it("chaque verset se termine par son numéro", () => {
    const chiffres = (n: number) => String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[Number(c)]!);
    for (const lecture of ["hafs", "warsh"]) {
      const v = versets(lecture, 2);
      v.forEach((texte, i) => expect(texte.endsWith(chiffres(i + 1))).toBe(true));
    }
  });

  it("tajwid (Hafs) : un découpage par verset, avec des règles connues", () => {
    const codes = new Set<string>(CODES_TAJWID);
    for (const s of SOURATES) {
      const decoupage = JSON.parse(
        readFileSync(join(dossier, "tajwid", `${s.numero}.json`), "utf8"),
      ) as SegmentTajwid[][];
      expect(decoupage).toHaveLength(s.nbVersets);
      for (const verset of decoupage) {
        expect(verset.length).toBeGreaterThan(0);
        // Jamais de coupure avant un signe (voyelle, sukun…) : il s'afficherait détaché de sa lettre.
        for (const morceau of verset)
          expect(/^\p{Mn}/u.test(typeof morceau === "string" ? morceau : morceau[1])).toBe(false);
        // Signes dans l'encodage de la police du Complexe (sukun U+06E1, lettre muette U+0652).
        expect(verset.some((m) => (typeof m === "string" ? m : m[1]).includes("\u06df"))).toBe(false);
        for (const morceau of verset)
          if (typeof morceau !== "string") expect(codes.has(morceau[0])).toBe(true);
      }
    }
  });
});

describe("récitateurs verset par verset", () => {
  it("chaque dossier n'apparaît qu'une fois, dans une lecture connue", () => {
    const dossiers = RECITATEURS_VERSETS.map((r) => r.dossier);
    expect(new Set(dossiers).size).toBe(dossiers.length);
    expect(RECITATEURS_VERSETS.some((r) => r.lecture === "warsh")).toBe(true);
  });
});

describe("mushaf et correspondance Warsh", () => {
  const lire = (f: string) => JSON.parse(readFileSync(join(dossier, f), "utf8")) as unknown;

  it.each(["hafs", "warsh"])("%s : 604 pages, chaque verset sur une seule page", (lecture) => {
    const { pages, juz } = lire(`pages-${lecture}.json`) as { pages: number[][][]; juz: number[] };
    expect(pages).toHaveLength(604);
    expect(juz).toHaveLength(30);
    const vus = new Set<string>();
    for (const page of pages)
      for (const [s, debut, fin] of page)
        for (let v = debut!; v <= fin!; v++) {
          expect(vus.has(`${s}:${v}`)).toBe(false);
          vus.add(`${s}:${v}`);
        }
    expect(vus.size).toBe(lecture === "hafs" ? 6236 : 6214);
  });

  it("chaque verset Warsh est dans au moins un fichier audio (numérotation Hafs)", () => {
    const table = lire("warsh-hafs.json") as Record<string, number[][]>;
    NB_VERSETS_WARSH.forEach((nb, i) => {
      const couverts = new Set(table[String(i + 1)]!.flat());
      for (let v = 1; v <= nb; v++) expect(couverts.has(v)).toBe(true);
      expect(table[String(i + 1)]).toHaveLength(SOURATES[i]!.nbVersets);
    });
  });
});
