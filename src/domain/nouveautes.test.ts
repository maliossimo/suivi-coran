import { describe, expect, it } from "vitest";
import { lireChangelog } from "./nouveautes";

const TEXTE = `# Historique

Intro.

- point d'intro ignoré

## [1.2.0] — 2026-11-14

### Nouveautés

- Une **chose** \`nouvelle\`.

### Corrigé

- Un bug.

## [1.1.0] — 2026-11-01

- Sans rubrique.
`;

describe("lireChangelog", () => {
  it("lit les versions, leurs rubriques et leurs points", () => {
    expect(lireChangelog(TEXTE)).toEqual([
      {
        numero: "1.2.0",
        date: "2026-11-14",
        rubriques: [
          { titre: "Nouveautés", points: ["Une chose nouvelle."] },
          { titre: "Corrigé", points: ["Un bug."] },
        ],
      },
      {
        numero: "1.1.0",
        date: "2026-11-01",
        rubriques: [{ titre: "Changements", points: ["Sans rubrique."] }],
      },
    ]);
  });

  it("s'arrête au nombre demandé", () => {
    expect(lireChangelog(TEXTE, 1)).toHaveLength(1);
  });
});
