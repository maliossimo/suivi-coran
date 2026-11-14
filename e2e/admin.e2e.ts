import { capture, COMPTES, expect, seConnecter, test } from "./outils";

test.describe("Administration", () => {
  test("l'admin voit son tableau de bord et le journal", async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await expect(page.getByRole("heading", { name: "Établissements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comptes" })).toBeVisible();
    // Chaque mosquée montre ses classes.
    await expect(page.getByRole("link", { name: /Coran du soir \(test\)/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "+ Nouvelle classe" }).first()).toBeVisible();
    await capture(page, "40-admin");

    // Les actions d'un compte sont rangées dans son menu « ⋯ ».
    await page.locator('summary[aria-label^="Actions pour"]').first().click();
    await expect(page.getByText(/(Désactiver|Réactiver) le compte/).first()).toBeVisible();

    await page.goto("/admin/journal");
    await expect(page.getByRole("heading", { name: "Qui utilise l’appli" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journal des actions" })).toBeVisible();
    await capture(page, "41-admin-journal");
  });
});

test.describe("Administration : classes", () => {
  test("l'admin crée une classe depuis la carte de la mosquée", async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await page.getByRole("link", { name: "+ Nouvelle classe" }).first().click();
    await expect(page).toHaveURL(/\/presences\/nouvelle\?etablissement=/);
    await page.getByLabel("Nom de la classe").fill("Tajwid (test)");
    await page.getByRole("button", { name: "Créer la classe" }).click();
    await expect(page).toHaveURL(/\/presences\/[0-9a-f-]{36}\/modifier/, { timeout: 20_000 });

    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /Tajwid \(test\)/ })).toBeVisible();
    await capture(page, "42-admin-classes");
  });
});
