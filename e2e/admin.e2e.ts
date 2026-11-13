import { capture, COMPTES, expect, seConnecter, test } from "./outils";

test.describe("Administration", () => {
  test("l'admin voit son tableau de bord et le journal", async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
    await expect(page.getByRole("heading", { name: "Établissements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comptes" })).toBeVisible();
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
