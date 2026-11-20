import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Luminance relative et rapport de contraste WCAG. */
function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const c = v.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function contraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair! + 0.05) / (sombre! + 0.05);
}

/** Les couleurs du thème clair (premier bloc :root de globals.css). */
function themeClair(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const debut = css.indexOf(":root {");
  const bloc = css.slice(debut, css.indexOf("\n}", debut));
  const couleurs: Record<string, string> = {};
  for (const m of bloc.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)) couleurs[m[1]!] = m[2]!;
  return couleurs;
}

describe("contrastes du thème clair (WCAG AA)", () => {
  const c = themeClair();
  const textes: [string, string][] = [
    ["texte", "fond"],
    ["texte", "carte"],
    ["texte-doux", "fond"],
    ["texte-doux", "carte"],
    ["texte-doux", "surface-2"],
    ["texte-doux", "surface-3"],
    ["vert-texte", "fond"],
    ["or-texte", "or-clair"],
    ["rouge", "carte"],
    ["rouge", "fond"],
    ["revision-texte", "revision-clair"],
  ];
  it.each(textes)("le texte %s est lisible sur %s (4,5 pour 1)", (texte, fond) => {
    // --vert-texte renvoie à --vert.
    const t = c[texte] ?? c[texte === "vert-texte" ? "vert" : texte];
    expect(t, `couleur ${texte} introuvable`).toBeDefined();
    expect(contraste(t!, c[fond]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("le texte blanc est lisible sur les boutons pleins", () => {
    for (const bouton of ["vert", "revision", "rouge"]) {
      expect(contraste("#ffffff", c[bouton]!), bouton).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("la bordure des champs est déclarée et le focus reste visible", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("--bord-champ: color-mix(in srgb, var(--texte) 52%, var(--carte));");
    expect(contraste("#8a5f12", c["fond"]!)).toBeGreaterThanOrEqual(3);
  });
});
