import { capture, COMPTES, expect, IDS, seConnecter, test } from "./outils";

test.describe("Présences (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await seConnecter(page, COMPTES.admin, /\/admin/);
  });

  test("appel du jour : un absent, enregistré et visible dans le tableau et le rapport", async ({ page }) => {
    await page.goto("/presences");
    await expect(page.getByText("Coran (test)")).toBeVisible();
    await capture(page, "30-presences");

    await page.goto(`/presences/${IDS.classe}/appel`);
    await page
      .getByRole("radiogroup", { name: "Présence de Yanis" })
      .getByRole("radio", { name: "Absent" })
      .click();
    await expect(page.getByText("1 présent · 1 absent")).toBeVisible();
    await capture(page, "31-appel");
    await page.getByRole("button", { name: /Enregistrer l’appel|Mettre à jour l’appel/ }).click();
    await expect(page).toHaveURL(new RegExp(`/presences/${IDS.classe}(\\?|$)`));

    const ligneYanis = page.getByRole("row", { name: /Yanis/ });
    await expect(ligneYanis.getByRole("cell", { name: "A", exact: true })).toBeVisible({ timeout: 15_000 });
    await capture(page, "32-tableau-du-mois");

    await page.goto("/presences/rapport");
    await expect(page.getByRole("heading", { name: "Présences · Toutes les classes" })).toBeVisible();
    await expect(page.getByRole("row", { name: /Yanis/ })).toBeVisible();
    await capture(page, "33-rapport");
  });

  test("aperçu du responsable : pas d'appel, mais le rapport", async ({ page }) => {
    await page.goto(`/presences/${IDS.classe}?vue=responsable`);
    await expect(page.getByText("Aperçu du responsable")).toBeVisible();
    await expect(page.getByRole("link", { name: "Faire l’appel" })).toHaveCount(0);
    await capture(page, "34-apercu-responsable");
  });

  test("la carte « Appel du jour » apparaît sur Ma classe", async ({ page }) => {
    await page.goto("/maitre");
    await expect(page.getByRole("region", { name: "Appel du jour" })).toBeVisible();
    await capture(page, "35-appel-du-jour");
  });
});
