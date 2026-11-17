import { capture, COMPTES, expect, seConnecter, test } from "./outils";

test("tester les enchaînements : la fin d'un verset connu, la réponse, le score", async ({ page }) => {
  await seConnecter(page, COMPTES.eleveA, /\/eleve/);
  await page.goto("/eleve/coran");
  await page.getByRole("link", { name: "M’entraîner" }).click();
  await expect(page).toHaveURL(/\/eleve\/coran\/enchainements/);

  // Inès connaît Al-Mulk 1-10 (sa fiche) : la question porte sur Al-Mulk.
  const test_ = page.getByRole("region", { name: "Tester les enchaînements" });
  await expect(test_.getByText(/Al-Mulk · fin du verset \d+/)).toBeVisible();
  await test_.getByRole("button", { name: "Voir la réponse" }).click();
  await expect(test_.locator(".enchainements-reponse")).not.toBeEmpty();
  await capture(page, "50-enchainements");
  await test_.getByRole("button", { name: "Je l’avais" }).click();
  await expect(test_.getByText("1 / 1")).toBeVisible();
});
