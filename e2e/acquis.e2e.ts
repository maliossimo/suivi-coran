import { COMPTES, expect, seConnecter, test } from "./outils";

/**
 * « Ce que tu connais déjà » : un élève déjà inscrit le voit une fois à l'ouverture, indique un juz,
 * puis arrive sur sa fiche ; sa progression part de là (comptée en pages du mushaf).
 */
test.describe("Ce que tu connais déjà", () => {
  test("l'élève indique un juz, puis le retrouve dans sa progression", async ({ page }) => {
    await seConnecter(page, COMPTES.eleveSoir, /\/eleve\/acquis/);
    await expect(page.getByRole("heading", { name: "Ce que tu connais déjà" })).toBeVisible();

    await page.getByRole("button", { name: "Juz 30", exact: true }).click();
    await expect(page.getByText("1 juz · environ 3,3 % du Coran")).toBeVisible();
    // Sans choix d'écoute, rien n'est envoyé.
    await page.getByRole("button", { name: "Valider et continuer" }).click();
    await expect(page.getByText("Dis-nous si tu veux le faire écouter à ton Cheikh.")).toBeVisible();
    await page.getByRole("button", { name: "Pas besoin" }).click();
    await page.getByRole("button", { name: "Valider et continuer" }).click();
    await expect(page).toHaveURL(/\/eleve(\?|$)/, { timeout: 20_000 });
    await expect(page.locator(".onglets")).toBeVisible();

    // Une seule fois : la fiche s'ouvre ensuite directement.
    await page.goto("/eleve");
    await expect(page).toHaveURL(/\/eleve$/);
    await expect(page.locator(".onglets")).toBeVisible();

    await page.goto("/eleve/progression");
    await expect(page.getByRole("heading", { name: "Ce que je connais déjà" })).toBeVisible();
    await expect(page.getByText(/pages? sur 604/)).toBeVisible();
    await expect(page.getByText("1 juz complet")).toBeVisible({ timeout: 10_000 });
  });
});
