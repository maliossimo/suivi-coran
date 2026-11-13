import { expect, test } from "@playwright/test";
import { COMPTES, capture, seConnecter } from "./outils";

test.describe("Coran (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
  });

  test("toucher un verset ouvre ses actions et son explication, sans faire défiler la page", async ({
    page,
  }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=18");
    await capture(page, "40-coran");
    const verset = page.locator('.coran-verset[data-cle="18:10"]');
    await verset.scrollIntoViewIfNeeded();
    const avant = await page.evaluate(() => window.scrollY);
    await verset.click();

    const feuille = page.getByRole("dialog", { name: "Verset 10" });
    await expect(feuille).toBeVisible();
    await expect(feuille.getByRole("button", { name: "Écouter d’ici" })).toBeVisible();
    // Explication chargée (ou message clair si la source est injoignable).
    await expect(
      feuille.locator(".explication-texte, .explication-verset .carte-graphique-sous").first(),
    ).toBeVisible({ timeout: 20_000 });
    await capture(page, "41-verset-explication");
    // Visible dans le journal du CI : explication réellement reçue de la source ?
    console.log(`Explication : ${(await feuille.locator(".explication-verset").innerText()).slice(0, 400)}`);

    // La page derrière est figée ; la molette sur la feuille ne la fait pas défiler.
    expect(await page.evaluate(() => document.body.style.position)).toBe("fixed");
    await page.mouse.wheel(0, 800);
    await page.keyboard.press("Escape");
    await expect(feuille).toBeHidden();
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - avant)).toBeLessThan(2);
  });

  test("« Aller à » trouve une sourate par son nom", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.locator(".coran-aller").click();
    const feuille = page.getByRole("dialog", { name: "Aller à" });
    await feuille.getByRole("searchbox", { name: "Chercher une sourate" }).fill("kahf");
    await capture(page, "42-aller-a");
    await feuille
      .getByRole("button", { name: /Al-Kahf/ })
      .first()
      .click();
    // Première ouverture d’une grande sourate après le démarrage du serveur : on laisse le temps.
    await expect(page).toHaveURL(/sourate=18/, { timeout: 15_000 });
  });

  test("récitateur favori : l'étoile le met en tête de liste", async ({ page }) => {
    await page.goto("/admin/coran?lecture=hafs&sourate=1");
    await page.getByRole("button", { name: "Réglages" }).click();
    const reglages = page.getByRole("dialog", { name: "Réglages" });
    await reglages.getByRole("button", { name: /^Récitateur :/ }).click();
    const liste = page.getByRole("dialog", { name: "Récitateur" });
    const etoiles = liste.getByRole("button", { name: /^Ajouter .* aux favoris$/ });
    const nom = ((await etoiles.nth(2).getAttribute("aria-label")) ?? "").replace(
      /^Ajouter | aux favoris$/g,
      "",
    );
    await etoiles.nth(2).click();
    await expect(
      liste.getByRole("listbox", { name: "Favoris" }).getByText(nom, { exact: true }),
    ).toBeVisible();
    await capture(page, "43-favoris");
  });
});
