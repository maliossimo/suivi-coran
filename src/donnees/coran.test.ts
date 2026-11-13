import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NB_VERSETS_WARSH } from "@/domain/lectures";
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
});
