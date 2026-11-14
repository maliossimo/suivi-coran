import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Le thème clair ou sombre peut être choisi à la main (« Mon compte ») : voir scripts/theme-sombre.mjs. */
describe("thème choisi à la main", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("chaque bloc sombre suit le choix fait dans « Mon compte »", () => {
    const blocs = css.split("@media (prefers-color-scheme: dark) {").slice(1);
    expect(blocs.length).toBeGreaterThan(0);
    for (const b of blocs) {
      // Le premier sélecteur du bloc porte la condition « pas en thème clair ».
      const premier = b.trimStart().split("{")[0] ?? "";
      expect(premier, `bloc non converti : lancer node scripts/theme-sombre.mjs\n${premier}`).toMatch(
        /:where\((:root)?:not\(\[data-theme="clair"\]\)\)|@media/,
      );
    }
  });

  it("le thème sombre choisi à la main a ses règles", () => {
    expect(css).toContain(':root:where([data-theme="sombre"])');
  });
});
