import { COMPTES, expect, seConnecter, test } from "./outils";

/**
 * Tests visuels : chaque écran est comparé, pixel par pixel, à sa capture de référence
 * (e2e/visuel.e2e.ts-snapshots). Un changement d'apparence imprévu (couleur, bouton décalé, texte
 * coupé) fait échouer la vérification. Après un changement voulu : lancer à la main le workflow
 * « Tests de bout en bout » avec « captures » pour refaire les références.
 * Ce qui change d'un jour à l'autre (heures, dates, version) est masqué.
 */
const OPTIONS = { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.02 } as const;

test.describe("Apparence", () => {
  test.use({ colorScheme: "light" });

  test("écran de connexion", async ({ page }) => {
    await page.goto("/connexion");
    await expect(page.getByLabel("Adresse e-mail")).toBeVisible();
    await expect(page).toHaveScreenshot("connexion.png", {
      ...OPTIONS,
      mask: [page.locator("[data-version], .auth-version")],
    });
  });

  test("lecture du Coran, sourate 1", async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await expect(page.locator('.coran-verset[data-cle="1:7"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("coran-sourate-1.png", {
      ...OPTIONS,
      mask: [page.locator(".barre-identite, time")],
    });
  });

  test("lecture du Coran en mode sombre", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await page.goto("/admin/coran?lecture=hafs&sourate=112");
    await expect(page.locator('.coran-verset[data-cle="112:4"]')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot("coran-sombre.png", {
      ...OPTIONS,
      mask: [page.locator(".barre-identite, time")],
    });
  });

  // Fiche d'un mois passé (stable d'un jour à l'autre) : apprentissage en vert, révision teintée d'or.
  for (const [type, sombre] of [
    ["apprentissage", false],
    ["revision", false],
    ["revision", true],
  ] as const) {
    test(`fiche ${type}${sombre ? " en mode sombre" : ""}`, async ({ page }) => {
      if (sombre) await page.emulateMedia({ colorScheme: "dark" });
      await seConnecter(page, COMPTES.eleveA, /\/eleve/);
      await page.goto(`/eleve?mois=2026-01&type=${type}`);
      await expect(
        page.locator(`.fiche-teinte[data-teinte="${type}"] .onglet[aria-current="page"]`),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`fiche-${type}${sombre ? "-sombre" : ""}.png`, {
        ...OPTIONS,
        mask: [page.locator(".barre-identite, time, [data-version]")],
      });
    });
  }

  test("mon compte (élève)", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveA, /\/eleve/);
    await page.goto("/compte");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveScreenshot("compte-eleve.png", {
      ...OPTIONS,
      mask: [page.locator("time, .compte-version, [data-version]")],
    });
  });
});
